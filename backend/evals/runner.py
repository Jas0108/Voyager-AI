"""
Evaluation Runner — CLI entry point for the Voyager AI evaluation framework.

Usage:
    python evals/runner.py                  Run all 30 evaluation scenarios
    python evals/runner.py --dataset routing   Run only routing tests
    python evals/runner.py --dataset multi_agent   Run only multi-agent tests
    python evals/runner.py --dataset edge_cases    Run only edge case tests
"""
import sys
import os
import argparse
import logging
import time

# ── Ensure backend/ is on the Python path ──────────────────────
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ── Load environment variables ─────────────────────────────────
from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from evals.utils import load_all_datasets, load_dataset
from evals.evaluator import Evaluator
from evals.metrics import compute_metrics
from evals.report import (
    generate_json_report,
    generate_metrics_json,
    generate_markdown_summary,
    generate_charts,
    print_terminal_summary,
)

# Directories
EVALS_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR = os.path.join(EVALS_DIR, "datasets")
OUTPUTS_DIR = os.path.join(EVALS_DIR, "outputs")


def setup_logging():
    """Configure logging for the evaluation run."""
    logging.basicConfig(
        level=logging.WARNING,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    # Suppress noisy loggers during eval
    for name in ["httpx", "httpcore", "urllib3", "langchain", "langsmith"]:
        logging.getLogger(name).setLevel(logging.ERROR)


def parse_args():
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Voyager AI Evaluation Runner")
    parser.add_argument(
        "--dataset",
        type=str,
        choices=["routing", "multi_agent", "edge_cases"],
        default=None,
        help="Run a specific dataset only. Default: run all datasets.",
    )
    return parser.parse_args()


def main():
    """Main evaluation pipeline."""
    setup_logging()
    args = parse_args()

    print()
    print("=" * 60)
    print("       Voyager AI — Evaluation Framework")
    print("=" * 60)

    # ── Load Datasets ──────────────────────────────────────────
    print("\n  Loading datasets...")

    if args.dataset:
        filepath = os.path.join(DATASETS_DIR, f"{args.dataset}.json")
        test_cases = load_dataset(filepath)
        print(f"  Loaded {len(test_cases)} test cases from {args.dataset}.json")
    else:
        test_cases = load_all_datasets(DATASETS_DIR)
        print(f"  Loaded {len(test_cases)} total test cases from all datasets")

    if not test_cases:
        print("\n  ERROR: No test cases found. Check the datasets/ directory.")
        sys.exit(1)

    # ── Run Evaluations ────────────────────────────────────────
    evaluator = Evaluator()
    overall_start = time.time()
    results = evaluator.evaluate_all(test_cases)
    overall_elapsed = round(time.time() - overall_start, 2)

    print(f"  Total evaluation time: {overall_elapsed}s")

    # ── Compute Metrics ────────────────────────────────────────
    print("\n  Computing metrics...")
    metrics = compute_metrics(results)

    # ── Display Terminal Summary ───────────────────────────────
    print_terminal_summary(metrics)

    # ── Generate Reports ───────────────────────────────────────
    print("  Generating reports...")
    generate_json_report(metrics, results, OUTPUTS_DIR)
    generate_metrics_json(metrics, OUTPUTS_DIR)
    generate_markdown_summary(metrics, results, OUTPUTS_DIR)

    # ── Generate Charts ────────────────────────────────────────
    print("  Generating charts...")
    generate_charts(metrics, results, OUTPUTS_DIR)

    # ── Done ───────────────────────────────────────────────────
    print(f"\n  All outputs saved to: evals/outputs/")
    print(f"    - evaluation_report.json")
    print(f"    - evaluation_summary.md")
    print(f"    - latest_metrics.json")
    print(f"    - agent_usage.png")
    print(f"    - agent_latency.png")
    print()


if __name__ == "__main__":
    main()
