"""
Core evaluation engine.
Runs test cases through the full Voyager graph pipeline and collects results.
"""
import time
import json
import logging
from typing import List, Optional

from evals.models import EvalTestCase, EvalResult, JudgeScores
from evals.utils import build_test_state, track_tools, build_eval_graph

logger = logging.getLogger(__name__)


# ------------------------------------------------
# LLM-as-a-Judge Prompt
# ------------------------------------------------

JUDGE_SYSTEM_PROMPT = """You are an evaluation judge for a multi-agent travel assistant called Voyager AI.

Your job is to score the assistant's response based on the user's query.

Score each criterion from 1 to 5:
- 1 = Very Poor
- 2 = Poor
- 3 = Acceptable
- 4 = Good
- 5 = Excellent

Criteria:
1. Relevance: Does the response directly address what the user asked?
2. Completeness: Does it cover all aspects of the user's query without missing key parts?
3. Helpfulness: Would a real traveler find this response useful and actionable?

Return ONLY valid JSON in this exact format:
{"relevance": <int>, "completeness": <int>, "helpfulness": <int>, "reasoning": "<brief explanation>"}"""


# ------------------------------------------------
# Evaluator
# ------------------------------------------------

class Evaluator:
    """Runs evaluation test cases against the Voyager AI graph."""

    def __init__(self):
        self._llm_service = None

    def _get_llm_service(self):
        """Lazy-load the LLM service to avoid import-time side effects."""
        if self._llm_service is None:
            from app.services.llm_service import llm_service
            self._llm_service = llm_service
        return self._llm_service

    def evaluate_single(self, test_case: EvalTestCase) -> EvalResult:
        """
        Evaluate a single test case by running it through the full graph.

        Steps:
            1. Build synthetic TripState from the test case
            2. Instrument tools for invocation tracking
            3. Build an instrumented graph for per-agent timing
            4. Invoke the graph
            5. Compare actual vs expected agents
            6. Run LLM-as-a-judge on the response
            7. Return structured EvalResult
        """
        result = EvalResult(
            test_id=test_case.id,
            query=test_case.query,
            description=test_case.description,
            category=test_case.category,
            expected_agents=test_case.expected_agents,
            expected_tools=test_case.expected_tools,
        )

        # Build the input state
        state = build_test_state(test_case)
        timing = {}

        try:
            # Run with tool tracking and timing instrumentation
            with track_tools() as tracker:
                eval_graph = build_eval_graph(timing)

                start_time = time.time()
                final_state = eval_graph.invoke(state)
                result.total_latency = round(time.time() - start_time, 3)

                # Capture actual agents from the execution plan
                result.actual_agents = final_state.get("execution_plan", [])
                result.execution_order = list(result.actual_agents)

                # Capture tools
                result.actual_tools = tracker.get_invoked()
                result.tools_used = list(result.actual_tools)

            # Capture per-agent latency
            result.supervisor_latency = round(timing.get("supervisor", 0), 3)
            result.planning_latency = round(timing.get("planning", 0), 3)
            result.discovery_latency = round(timing.get("discovery", 0), 3)
            result.budget_latency = round(timing.get("budget", 0), 3)

            # Capture response
            response = final_state.get("final_response", "")
            result.response_text = response or ""
            result.response_valid = bool(
                response
                and len(response.strip()) > 0
                and not response.startswith("Error:")
                and "LLM not available" not in response
            )

            # Check routing correctness
            expected_set = set(test_case.expected_agents)
            actual_set = set(result.actual_agents)
            result.routing_correct = (expected_set == actual_set)

            # Determine overall success
            # A test passes if routing is correct AND response is valid
            # For edge cases with empty expected_agents, just check response validity
            if test_case.expected_agents:
                result.success = result.routing_correct and result.response_valid
            else:
                # For direct-response / edge cases, success = no crash + some response
                result.success = result.response_valid or (response is not None and len(str(response).strip()) > 0)

            if not result.routing_correct:
                missing = expected_set - actual_set
                unexpected = actual_set - expected_set
                reasons = []
                if missing:
                    reasons.append(f"Missing agents: {', '.join(missing)}")
                if unexpected:
                    reasons.append(f"Unexpected agents: {', '.join(unexpected)}")
                result.failure_reason = "; ".join(reasons)
            elif not result.response_valid:
                result.failure_reason = "Response invalid or empty"

            # LLM-as-a-Judge (skip for empty queries)
            if test_case.query.strip() and result.response_text.strip():
                judge_scores = self._judge_response(test_case.query, result.response_text)
                if judge_scores:
                    result.judge_scores = judge_scores

        except Exception as e:
            logger.error(f"[Evaluator] Test {test_case.id} crashed: {e}")
            result.success = False
            result.failure_reason = f"Exception: {str(e)}"

        return result

    def _judge_response(self, query: str, response: str) -> Optional[JudgeScores]:
        """
        Use the LLM to judge the quality of a response.
        Returns JudgeScores or None if judging fails.
        """
        try:
            from langchain_core.messages import SystemMessage, HumanMessage

            llm_service = self._get_llm_service()

            judge_message = (
                f"User Query: \"{query}\"\n\n"
                f"Assistant Response: \"{response[:2000]}\"\n\n"
                f"Score this response."
            )

            messages = [
                SystemMessage(content=JUDGE_SYSTEM_PROMPT),
                HumanMessage(content=judge_message),
            ]

            result = llm_service.invoke_json(messages)
            if result and "relevance" in result:
                return JudgeScores(
                    relevance=min(5, max(1, int(result.get("relevance", 3)))),
                    completeness=min(5, max(1, int(result.get("completeness", 3)))),
                    helpfulness=min(5, max(1, int(result.get("helpfulness", 3)))),
                    reasoning=str(result.get("reasoning", "")),
                )
        except Exception as e:
            logger.warning(f"[Judge] Failed to judge response: {e}")

        return None

    def evaluate_all(self, test_cases: List[EvalTestCase]) -> List[EvalResult]:
        """Run all test cases with progress display."""
        results = []
        total = len(test_cases)

        print(f"\n{'=' * 60}")
        print(f"  Running {total} Evaluation Scenarios")
        print(f"{'=' * 60}\n")

        for i, tc in enumerate(test_cases, 1):
            # Progress indicator
            print(f"  [{i:2d}/{total}] ... Test {tc.id}: {tc.description[:50]}...", end="", flush=True)

            result = self.evaluate_single(tc)
            results.append(result)

            # Update status
            status = "PASS" if result.success else "FAIL"
            # Clear line and reprint with status
            print(f"\r  [{i:2d}/{total}] {status} Test {tc.id}: {tc.description[:50]}... ({result.total_latency}s)")

            if not result.success and result.failure_reason:
                print(f"         -> {result.failure_reason}")

        passed = sum(1 for r in results if r.success)
        print(f"\n  Completed: {passed}/{total} passed\n")

        return results
