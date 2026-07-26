"""
Metrics computation for the evaluation framework.
Computes precision, recall, accuracy, latency stats, and response quality
from a list of EvalResult objects.
"""
from typing import List, Dict
from evals.models import EvalResult, EvalMetrics, LatencyStats, ResponseQuality


def _compute_latency_stats(values: List[float]) -> LatencyStats:
    """Compute avg / min / max from a list of float values."""
    if not values:
        return LatencyStats()
    return LatencyStats(
        avg=round(sum(values) / len(values), 3),
        min=round(min(values), 3),
        max=round(max(values), 3),
    )


def compute_metrics(results: List[EvalResult]) -> EvalMetrics:
    """
    Compute all evaluation metrics from a list of results.

    Metrics computed:
        1. Routing Precision & Recall
        2. Agent Execution Accuracy
        3. Tool Precision & Recall
        4. Latency (overall + per-agent)
        5. Response Validation Rate
        6. Response Quality (LLM judge)
        7. Overall Success Rate
    """
    if not results:
        return EvalMetrics()

    total = len(results)
    passed = sum(1 for r in results if r.success)
    failed = total - passed

    # ── 1. Routing Precision & Recall ──────────────────────────
    total_precision_sum = 0.0
    total_recall_sum = 0.0
    routing_tests = 0
    routing_correct_count = 0

    for r in results:
        expected = set(r.expected_agents)
        actual = set(r.actual_agents)

        # Skip direct-response tests (both empty) from precision/recall
        if not expected and not actual:
            routing_correct_count += 1
            continue

        routing_tests += 1

        if r.routing_correct:
            routing_correct_count += 1

        correct = expected & actual

        # Precision: of the agents that ran, how many were expected?
        if actual:
            total_precision_sum += len(correct) / len(actual)
        elif not expected:
            total_precision_sum += 1.0  # Both empty = correct

        # Recall: of the expected agents, how many actually ran?
        if expected:
            total_recall_sum += len(correct) / len(expected)
        elif not actual:
            total_recall_sum += 1.0  # Both empty = correct

    routing_precision = round(total_precision_sum / routing_tests * 100, 1) if routing_tests > 0 else 100.0
    routing_recall = round(total_recall_sum / routing_tests * 100, 1) if routing_tests > 0 else 100.0
    routing_accuracy = round(routing_correct_count / total * 100, 1)

    # ── 2. Execution Accuracy ──────────────────────────────────
    # How many tests had ALL expected agents execute?
    execution_correct = sum(
        1 for r in results
        if set(r.expected_agents).issubset(set(r.actual_agents))
    )
    execution_accuracy = round(execution_correct / total * 100, 1)

    # ── 3. Tool Precision & Recall ─────────────────────────────
    tool_precision_sum = 0.0
    tool_recall_sum = 0.0
    tool_tests = 0

    for r in results:
        expected_tools = set(r.expected_tools)
        actual_tools = set(r.actual_tools)

        # Only count tests that have expected tools specified
        if not expected_tools:
            continue

        tool_tests += 1
        correct_tools = expected_tools & actual_tools

        if actual_tools:
            tool_precision_sum += len(correct_tools) / len(actual_tools)
        if expected_tools:
            tool_recall_sum += len(correct_tools) / len(expected_tools)

    tool_precision = round(tool_precision_sum / tool_tests * 100, 1) if tool_tests > 0 else 0.0
    tool_recall = round(tool_recall_sum / tool_tests * 100, 1) if tool_tests > 0 else 0.0
    tool_accuracy = round((tool_precision + tool_recall) / 2, 1) if tool_tests > 0 else 0.0

    # ── 4. Latency Stats ───────────────────────────────────────
    overall_latencies = [r.total_latency for r in results if r.total_latency > 0]
    supervisor_latencies = [r.supervisor_latency for r in results if r.supervisor_latency > 0]
    planning_latencies = [r.planning_latency for r in results if r.planning_latency > 0]
    discovery_latencies = [r.discovery_latency for r in results if r.discovery_latency > 0]
    budget_latencies = [r.budget_latency for r in results if r.budget_latency > 0]

    # ── 5. Agent Usage Counts ──────────────────────────────────
    agent_usage: Dict[str, int] = {"planning": 0, "discovery": 0, "budget": 0}
    for r in results:
        for agent in r.actual_agents:
            if agent in agent_usage:
                agent_usage[agent] += 1

    # ── 6. Response Validation Rate ────────────────────────────
    valid_responses = sum(1 for r in results if r.response_valid)
    response_valid_rate = round(valid_responses / total * 100, 1)

    # ── 7. Response Quality (LLM Judge) ────────────────────────
    judged_results = [r for r in results if r.judge_scores is not None]
    response_quality = ResponseQuality()
    if judged_results:
        response_quality = ResponseQuality(
            avg_relevance=round(sum(r.judge_scores.relevance for r in judged_results) / len(judged_results), 2),
            avg_completeness=round(sum(r.judge_scores.completeness for r in judged_results) / len(judged_results), 2),
            avg_helpfulness=round(sum(r.judge_scores.helpfulness for r in judged_results) / len(judged_results), 2),
            total_judged=len(judged_results),
        )

    # ── 8. Failed Test Details ─────────────────────────────────
    failed_tests = [
        {"test_id": str(r.test_id), "query": r.query[:80], "reason": r.failure_reason}
        for r in results if not r.success
    ]

    # ── Build final metrics object ─────────────────────────────
    return EvalMetrics(
        total_tests=total,
        passed=passed,
        failed=failed,
        routing_precision=routing_precision,
        routing_recall=routing_recall,
        routing_accuracy=routing_accuracy,
        execution_accuracy=execution_accuracy,
        tool_precision=tool_precision,
        tool_recall=tool_recall,
        tool_accuracy=tool_accuracy,
        overall_latency=_compute_latency_stats(overall_latencies),
        supervisor_latency=_compute_latency_stats(supervisor_latencies),
        planning_latency=_compute_latency_stats(planning_latencies),
        discovery_latency=_compute_latency_stats(discovery_latencies),
        budget_latency=_compute_latency_stats(budget_latencies),
        agent_usage=agent_usage,
        response_valid_rate=response_valid_rate,
        response_quality=response_quality,
        success_rate=round(passed / total * 100, 1),
        failed_tests=failed_tests,
    )
