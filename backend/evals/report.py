"""
Report generation for the evaluation framework.
Generates JSON reports, markdown summaries, and chart visualizations.
"""
import json
import os
import logging
from typing import List

from evals.models import EvalMetrics, EvalResult, EvalReport
from evals.utils import ensure_output_dir

logger = logging.getLogger(__name__)


def generate_json_report(metrics: EvalMetrics, results: List[EvalResult], output_dir: str):
    """Generate the full evaluation report as JSON."""
    ensure_output_dir(output_dir)

    report = EvalReport(metrics=metrics, results=results)
    filepath = os.path.join(output_dir, "evaluation_report.json")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(report.model_dump_json(indent=2))

    logger.info(f"Report saved: {filepath}")


def generate_metrics_json(metrics: EvalMetrics, output_dir: str):
    """Generate a standalone metrics snapshot."""
    ensure_output_dir(output_dir)
    filepath = os.path.join(output_dir, "latest_metrics.json")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(metrics.model_dump_json(indent=2))

    logger.info(f"Metrics saved: {filepath}")


def generate_markdown_summary(metrics: EvalMetrics, results: List[EvalResult], output_dir: str):
    """Generate a human-readable evaluation summary in Markdown."""
    ensure_output_dir(output_dir)
    filepath = os.path.join(output_dir, "evaluation_summary.md")

    m = metrics
    rq = m.response_quality

    lines = [
        "# Voyager AI — Evaluation Summary",
        "",
        "## Overall Results",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Total Tests | {m.total_tests} |",
        f"| Passed | {m.passed} |",
        f"| Failed | {m.failed} |",
        f"| **Overall Success Rate** | **{m.success_rate}%** |",
        "",
        "## Routing Metrics",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Routing Accuracy | {m.routing_accuracy}% |",
        f"| Routing Precision | {m.routing_precision}% |",
        f"| Routing Recall | {m.routing_recall}% |",
        f"| Execution Accuracy | {m.execution_accuracy}% |",
        "",
        "## Tool Metrics",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Tool Precision | {m.tool_precision}% |",
        f"| Tool Recall | {m.tool_recall}% |",
        "",
        "## Latency",
        "",
        f"| Component | Avg | Min | Max |",
        f"|-----------|-----|-----|-----|",
        f"| Overall | {m.overall_latency.avg}s | {m.overall_latency.min}s | {m.overall_latency.max}s |",
        f"| Supervisor | {m.supervisor_latency.avg}s | {m.supervisor_latency.min}s | {m.supervisor_latency.max}s |",
        f"| Planning | {m.planning_latency.avg}s | {m.planning_latency.min}s | {m.planning_latency.max}s |",
        f"| Discovery | {m.discovery_latency.avg}s | {m.discovery_latency.min}s | {m.discovery_latency.max}s |",
        f"| Budget | {m.budget_latency.avg}s | {m.budget_latency.min}s | {m.budget_latency.max}s |",
        "",
        "## Agent Usage",
        "",
        f"| Agent | Times Invoked |",
        f"|-------|---------------|",
    ]

    for agent, count in sorted(m.agent_usage.items(), key=lambda x: -x[1]):
        lines.append(f"| {agent.capitalize()} | {count} |")

    # Response Quality (LLM Judge)
    lines.extend([
        "",
        "## Response Quality (LLM-as-a-Judge)",
        "",
    ])

    if rq.total_judged > 0:
        lines.extend([
            f"| Criterion | Average Score (out of 5) |",
            f"|-----------|------------------------|",
            f"| Relevance | {rq.avg_relevance} |",
            f"| Completeness | {rq.avg_completeness} |",
            f"| Helpfulness | {rq.avg_helpfulness} |",
            f"| Tests Judged | {rq.total_judged} |",
        ])
    else:
        lines.append("No responses were judged (LLM may be unavailable).")

    # Failed Cases
    if m.failed_tests:
        lines.extend([
            "",
            "## Failed Cases",
            "",
            f"| Test ID | Query | Failure Reason |",
            f"|---------|-------|----------------|",
        ])
        for ft in m.failed_tests:
            lines.append(f"| {ft['test_id']} | {ft['query'][:60]} | {ft['reason']} |")

    # Slowest / Fastest
    sorted_by_latency = sorted(results, key=lambda r: r.total_latency, reverse=True)
    if sorted_by_latency:
        lines.extend([
            "",
            "## Slowest Requests",
            "",
            f"| Test ID | Query | Latency |",
            f"|---------|-------|---------|",
        ])
        for r in sorted_by_latency[:5]:
            lines.append(f"| {r.test_id} | {r.query[:50]} | {r.total_latency}s |")

        lines.extend([
            "",
            "## Fastest Requests",
            "",
            f"| Test ID | Query | Latency |",
            f"|---------|-------|---------|",
        ])
        for r in sorted_by_latency[-5:]:
            lines.append(f"| {r.test_id} | {r.query[:50]} | {r.total_latency}s |")

    # Routing Error Analysis
    routing_errors = [r for r in results if not r.routing_correct]
    if routing_errors:
        lines.extend([
            "",
            "## Most Common Routing Errors",
            "",
        ])
        error_counts = {}
        for r in routing_errors:
            reason = r.failure_reason or "Unknown"
            error_counts[reason] = error_counts.get(reason, 0) + 1

        for reason, count in sorted(error_counts.items(), key=lambda x: -x[1]):
            lines.append(f"- **{count}x**: {reason}")

    # Suggestions
    lines.extend([
        "",
        "## Suggestions for Improvement",
        "",
    ])

    if m.routing_accuracy < 90:
        lines.append("- Routing accuracy is below 90%. Review the supervisor's keyword fallback logic and LLM prompt.")
    if m.execution_accuracy < 90:
        lines.append("- Execution accuracy is below 90%. Some expected agents are not being triggered.")
    if m.overall_latency.avg > 5:
        lines.append("- Average response time exceeds 5 seconds. Consider optimizing API calls or caching.")
    if rq.total_judged > 0 and rq.avg_relevance < 3.5:
        lines.append("- Response relevance is below 3.5/5. Review agent prompts for better query understanding.")
    if rq.total_judged > 0 and rq.avg_completeness < 3.5:
        lines.append("- Response completeness is below 3.5/5. Agents may be missing parts of the user's request.")
    if m.routing_accuracy >= 90 and m.execution_accuracy >= 90 and m.success_rate >= 90:
        lines.append("- All core metrics are healthy. Consider adding more edge cases to stress-test the system.")

    lines.append("")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    logger.info(f"Summary saved: {filepath}")


def generate_charts(metrics: EvalMetrics, results: List[EvalResult], output_dir: str):
    """Generate visualization charts as PNG files."""
    ensure_output_dir(output_dir)

    try:
        import matplotlib
        matplotlib.use("Agg")  # Non-interactive backend
        import matplotlib.pyplot as plt
    except ImportError:
        logger.warning("matplotlib not installed. Skipping chart generation. Install with: pip install matplotlib")
        return

    # ── Chart 1: Agent Usage Count ─────────────────────────────
    fig, ax = plt.subplots(figsize=(8, 5))
    agents = list(metrics.agent_usage.keys())
    counts = list(metrics.agent_usage.values())
    colors = ["#4A90D9", "#50C878", "#FF6B6B"]

    bars = ax.bar(
        [a.capitalize() for a in agents],
        counts,
        color=colors[:len(agents)],
        edgecolor="white",
        linewidth=1.5,
    )

    # Add value labels on bars
    for bar, count in zip(bars, counts):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.3,
            str(count),
            ha="center",
            va="bottom",
            fontweight="bold",
            fontsize=13,
        )

    ax.set_title("Agent Usage Count", fontsize=16, fontweight="bold", pad=15)
    ax.set_ylabel("Times Invoked", fontsize=12)
    ax.set_xlabel("Agent", fontsize=12)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "agent_usage.png"), dpi=150)
    plt.close()

    logger.info("Chart saved: agent_usage.png")

    # ── Chart 2: Average Agent Latency ─────────────────────────
    fig, ax = plt.subplots(figsize=(8, 5))
    components = ["Supervisor", "Planning", "Discovery", "Budget"]
    latencies = [
        metrics.supervisor_latency.avg,
        metrics.planning_latency.avg,
        metrics.discovery_latency.avg,
        metrics.budget_latency.avg,
    ]
    colors = ["#9B59B6", "#4A90D9", "#50C878", "#FF6B6B"]

    bars = ax.barh(components, latencies, color=colors, edgecolor="white", linewidth=1.5)

    # Add value labels
    for bar, latency in zip(bars, latencies):
        ax.text(
            bar.get_width() + 0.02,
            bar.get_y() + bar.get_height() / 2,
            f"{latency:.3f}s",
            ha="left",
            va="center",
            fontweight="bold",
            fontsize=11,
        )

    ax.set_title("Average Agent Latency", fontsize=16, fontweight="bold", pad=15)
    ax.set_xlabel("Time (seconds)", fontsize=12)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "agent_latency.png"), dpi=150)
    plt.close()

    logger.info("Chart saved: agent_latency.png")


def print_terminal_summary(metrics: EvalMetrics):
    """Print the evaluation summary to the terminal."""
    m = metrics
    rq = m.response_quality

    print()
    print("=" * 60)
    print("       Voyager AI — Evaluation Report")
    print("=" * 60)
    print()
    print(f"  Total Tests             {m.total_tests}")
    print(f"  Successful Tests        {m.passed}")
    print(f"  Failed Tests            {m.failed}")
    print()
    print(f"  Routing Accuracy        {m.routing_accuracy}%")
    print(f"  Routing Precision       {m.routing_precision}%")
    print(f"  Routing Recall          {m.routing_recall}%")
    print(f"  Execution Accuracy      {m.execution_accuracy}%")
    print()
    print(f"  Avg Response Time       {m.overall_latency.avg}s")
    print(f"  Avg Supervisor Time     {m.supervisor_latency.avg}s")
    print(f"  Avg Planning Time       {m.planning_latency.avg}s")
    print(f"  Avg Discovery Time      {m.discovery_latency.avg}s")
    print(f"  Avg Budget Time         {m.budget_latency.avg}s")
    print()

    if rq.total_judged > 0:
        print(f"  Response Relevance      {rq.avg_relevance}/5")
        print(f"  Response Completeness   {rq.avg_completeness}/5")
        print(f"  Response Helpfulness    {rq.avg_helpfulness}/5")
        print()

    print(f"  Overall Success Rate    {m.success_rate}%")
    print()
    print("=" * 60)

    if m.failed_tests:
        print()
        print("  Failed Tests:")
        for ft in m.failed_tests:
            print(f"    Test {ft['test_id']}: {ft['reason']}")
        print()
