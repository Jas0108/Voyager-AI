"""
Budget Agent.
Tracks budget metrics and applies budget updates requested by the user.
"""
import json
import logging
from datetime import date
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from app.graph.state import TripState
from app.prompts.budget_prompt import BUDGET_SYSTEM_PROMPT
from app.services.llm_service import llm_service
from app.tools.currency_tool import convert_currency
from app.tools.budget_tool import calculate_budget
from app.utils.query_parser import parse_budget_update, parse_expense

logger = logging.getLogger(__name__)

BUDGET_TOOLS = [convert_currency, calculate_budget]


def budget_agent_node(state: TripState) -> dict:
    """Budget agent node for LangGraph."""
    logger.info("[BudgetAgent] Starting execution")
    trip = state.get("trip", {})
    expenses = state.get("expenses", [])
    total_spent = sum(e.get("amount", 0) for e in expenses)
    total_budget = trip.get("budget", 0)
    remaining = total_budget - total_spent

    # Detect and apply budget update requests from the user
    new_budget = parse_budget_update(state["user_query"])
    budget_update = None
    updated_trip = dict(trip)
    new_expense = None

    if new_budget and new_budget > 0:
        logger.info(f"[BudgetAgent] Budget update requested: {total_budget} → {new_budget}")
        budget_update = new_budget
        total_budget = new_budget
        remaining = total_budget - total_spent
        updated_trip["budget"] = new_budget

    # Detect expense creation (e.g., "spent 100 on food")
    expense_data = parse_expense(state["user_query"])
    if expense_data:
        logger.info(f"[BudgetAgent] Expense detected: {expense_data}")
        new_expense = expense_data
        total_spent += expense_data["amount"]
        remaining = total_budget - total_spent
        # Add to expenses list for state
        expenses.append({
            "id": f"temp_{len(expenses)}",  # Temporary ID
            "category": expense_data["category"],
            "amount": expense_data["amount"],
            "currency": trip.get("currency", "USD")
        })

    budget_info = (
        f"Total Budget: {total_budget} {trip.get('currency', 'USD')}\n"
        f"Total Spent: {total_spent} {trip.get('currency', 'USD')}\n"
        f"Remaining: {remaining} {trip.get('currency', 'USD')}\n"
        f"Trip Start: {trip.get('start_date')}\n"
        f"Trip End: {trip.get('end_date')}\n"
        f"Today: {date.today().isoformat()}\n"
        f"Number of Expenses: {len(expenses)}"
    )

    llm = llm_service.get_llm()
    recommendations = []

    if budget_update:
        recommendations.append(
            f"Trip budget updated to {budget_update:.2f} {trip.get('currency', 'USD')}."
        )

    if new_expense:
        recommendations.append(
            f"Recorded expense of {new_expense['amount']:.2f} {trip.get('currency', 'USD')} for {new_expense['category']}."
        )

    if llm:
        try:
            llm_with_tools = llm.bind_tools(BUDGET_TOOLS)
            messages = [
                SystemMessage(content=BUDGET_SYSTEM_PROMPT),
                HumanMessage(content=(
                    f"Budget Information:\n{budget_info}\n\n"
                    f"User Query: {state['user_query']}\n\n"
                    "Calculate the budget metrics and provide recommendations."
                )),
            ]

            # Tool-calling loop
            for _ in range(4):  # max iterations
                response = llm_with_tools.invoke(messages)
                messages.append(response)

                if not response.tool_calls:
                    break

                for tc in response.tool_calls:
                    tool_map = {t.name: t for t in BUDGET_TOOLS}
                    tool = tool_map.get(tc["name"])
                    if tool:
                        try:
                            result = tool.invoke(tc["args"])
                            messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))
                        except Exception as te:
                            messages.append(ToolMessage(content=f"Error: {te}", tool_call_id=tc["id"]))
                    else:
                        messages.append(ToolMessage(content=f"Unknown tool: {tc['name']}", tool_call_id=tc["id"]))

            output = response.content if hasattr(response, 'content') else str(response)
            parsed = _parse_budget_output(output)
            summary = parsed.get("expenses_summary", {})
            if summary.get("remaining_budget") is not None:
                remaining = summary["remaining_budget"]
            recommendations.extend(parsed.get("recommendations", []))
        except Exception as e:
            logger.error(f"[BudgetAgent] Error: {e}")
            recommendations.extend(_direct_recommendations(total_budget, total_spent, remaining, trip))
    else:
        recommendations.extend(_direct_recommendations(total_budget, total_spent, remaining, trip))

    result = {
        "trip": updated_trip,
        "expenses": expenses,  # Include updated expenses list
        "remaining_budget": round(remaining, 2),
        "recommendations": state.get("recommendations", []) + recommendations,
        "current_agent_index": state.get("current_agent_index", 0) + 1,
    }
    if budget_update:
        result["budget_update"] = budget_update
    if new_expense:
        result["new_expense"] = new_expense
    return result


def _direct_recommendations(total_budget, total_spent, remaining, trip) -> list:
    recs = [f"Remaining budget: {remaining:.2f} {trip.get('currency', 'USD')}."]
    if total_budget > 0:
        recs.append(f"Spent {(total_spent / total_budget * 100):.1f}% of total budget.")
    return recs


def _parse_budget_output(output: str) -> dict:
    try:
        start = output.find("{")
        end = output.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(output[start:end])
    except Exception:
        pass
    return {"expenses_summary": {}, "recommendations": [output] if output else []}
