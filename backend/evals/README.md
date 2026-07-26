# Voyager AI — Evaluation Framework

An automated evaluation framework for the Voyager AI Multi-Agent Travel Assistant. It verifies that the Supervisor routes correctly, agents execute as expected, tools are invoked properly, and responses are high quality — all without modifying any production code.

---

## Purpose

This framework answers key questions about the system's behavior:

- **Is the Supervisor routing correctly?** → Routing Accuracy (Precision & Recall)
- **Are the correct agents executed?** → Agent Execution Accuracy
- **Are the correct tools invoked?** → Tool Invocation Accuracy
- **Is the response valid and useful?** → Response Validation + LLM-as-a-Judge
- **How long does every request take?** → Latency Metrics (per-agent breakdown)
- **Are changes breaking previously working behaviors?** → Regression detection via curated test suite

---

## 🏆 Baseline vs. Post-Optimization Benchmark Results

Initial evaluation revealed that the baseline framework scored **83.3%** (25/30 passed) due to 5 routing edge-case failures. After implementing regex whole-word boundary matching (`\b...\b`) in intent parsing and refining fallback routing, the framework achieved a **100% pass rate**:

| Metric | Initial Baseline (Unfixed) | Post-Optimization (Fixed) | Status |
|--------|----------------------------|---------------------------|--------|
| **Total Test Scenarios** | 30 | 30 | — |
| **Successful Tests** | 25 / 30 (83.3%) | **30 / 30 (100.0%)** | 🎯 **+16.7% Improvement** |
| **Routing Accuracy** | 83.3% | **100.0%** | Fixed 5 failing edge cases |
| **Routing Precision** | 91.7% | **100.0%** | Eliminated over-routing |
| **Routing Recall** | 100.0% | **100.0%** | Perfect recall maintained |
| **Execution Accuracy** | 100.0% | **100.0%** | Perfect execution maintained |
| **Avg Response Latency** | 19.96s | **7.62s** | ⚡ **60%+ Latency Reduction** |

---

## 🛠️ Root-Cause Bugs Uncovered & Fixed

The initial 83.3% benchmark run exposed 3 critical routing bugs in the production helper functions:

1. **Substring Over-Matching in Intent Parser** *(Failed Tests 8, 18, 19)*:
   - *Issue*: Short keywords like `"eat"` and `"hot"` matched inside unrelated words (`"weather"` contained `"eat"`, `"create"` contained `"eat"`, `"hotel"` contained `"hot"`), causing single-agent queries to route to the `discovery` agent.
   - *Fix*: Upgraded intent parsing in `query_parser.py` to use **regex whole-word boundaries (`\b...\b`)**.

2. **Generic Keyword Over-Clustering** *(Failed Test 6)*:
   - *Issue*: `"show me"` in sightseeing keywords caused spending breakdown requests (e.g., *"Show me my spending"*) to trigger planning.
   - *Fix*: Refined `SIGHTSEEING_KEYWORDS` to focus strictly on attraction and destination terms.

3. **Expense Logging & Itinerary Edit Overlap** *(Failed Tests 9, 10)*:
   - *Issue*: Queries like *"I spent $150 on dinner"* contain food terms, which previously triggered place searches.
   - *Fix*: Updated `_fallback_routing` in `supervisor.py` to prevent pure expense additions or itinerary edits from triggering place discovery unless explicit search intent (e.g. `"find"`, `"recommend"`) is present. Expanded `EXPENSE_PATTERNS` to parse currency names like `"dollars"`, `"euros"`, `"usd"`.

---

## Folder Structure

```
evals/
├── datasets/
│   ├── routing.json          # 12 routing test cases
│   ├── multi_agent.json      # 10 multi-agent collaboration tests
│   └── edge_cases.json       # 8 edge case tests
│
├── runner.py                 # CLI entry point
├── evaluator.py              # Core evaluation engine
├── metrics.py                # Metric computation (precision, recall, latency)
├── models.py                 # Pydantic data models
├── report.py                 # Report & chart generation
├── utils.py                  # State builders, tool tracking, instrumented graph
├── README.md                 # This documentation file
│
└── outputs/                  # Generated reports (gitignored)
    ├── evaluation_report.json
    ├── evaluation_summary.md
    ├── latest_metrics.json
    ├── agent_usage.png
    └── agent_latency.png
```

---

## How to Run Evaluations

### Prerequisites

Make sure you have the required API keys configured in `backend/.env`:
```
GROQ_API_KEY=your_key_here
```

Install matplotlib if not already installed:
```bash
pip install matplotlib
```

### Run All Tests

```bash
cd backend
python evals/runner.py
```

### Run a Specific Dataset

```bash
python evals/runner.py --dataset routing
python evals/runner.py --dataset multi_agent
python evals/runner.py --dataset edge_cases
```

---

## Dataset Structure

Each test case follows this format:

```json
{
  "id": 1,
  "query": "Plan my Paris trip under $1000.",
  "expected_agents": ["planning", "budget"],
  "expected_tools": [],
  "description": "Trip planning with budget validation.",
  "category": "planning_budget"
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique test case identifier |
| `query` | The user message sent to the assistant |
| `expected_agents` | List of agents that should be invoked (order matters for multi-agent tests) |
| `expected_tools` | Optional list of expected tool invocations |
| `description` | Human-readable description of what this test verifies |
| `category` | Test category for grouping and filtering |
| `expected_behavior` | (Edge cases only) Expected behavior type |

### Dataset Breakdown

| Dataset | Tests | Purpose |
|---------|-------|---------|
| `routing.json` | 12 | Verify Supervisor routes queries to the correct agent(s) |
| `multi_agent.json` | 10 | Verify multi-agent collaboration and execution ordering |
| `edge_cases.json` | 8 | Verify graceful handling of invalid/unusual inputs |
| **Total** | **30** | |

---

## Metric Definitions

### 1. Routing Accuracy

**What it measures:** Did the Supervisor generate the correct execution plan?

- **Precision** = (correctly routed agents) / (total agents actually invoked)
- **Recall** = (correctly routed agents) / (total agents expected)
- **Accuracy** = (tests with exact match) / (total tests)

### 2. Agent Execution Accuracy

**What it measures:** Were all expected agents executed? Were unnecessary agents added?

A test passes if `expected_agents ⊆ actual_agents` (all expected agents ran).

### 3. Tool Invocation Accuracy

**What it measures:** Were the correct tools called by the agents?

Same precision/recall formula applied to tool names. Only scored when `expected_tools` is specified in the test case.

### 4. Latency

**What it measures:** How long each component takes to execute.

Reported as average / minimum / maximum for:
- Overall response time
- Supervisor decision time
- Planning agent time
- Discovery agent time
- Budget agent time

### 5. Response Validation

**What it measures:** Did the system produce a usable output?

Checks:
- Response is not `None` or empty
- Response does not start with `"Error:"`
- No unhandled exceptions occurred

### 6. Response Quality (LLM-as-a-Judge)

**What it measures:** How good is the response content?

An LLM judges each response on three criteria (1-5 scale):
- **Relevance**: Does the response address the user's query?
- **Completeness**: Does it cover all aspects of the request?
- **Helpfulness**: Would a real traveler find this useful?

### 7. Overall Success Rate

**What it measures:** Combined pass/fail across all criteria.

A test **passes** if:
- Routing is correct (expected agents == actual agents)
- Response is valid (non-empty, no errors)

---

## How to Add New Test Cases

1. Open the appropriate dataset file in `evals/datasets/`
2. Add a new JSON object following the schema above
3. Assign a unique `id` (next available number)
4. Run the evaluator to verify:

```bash
python evals/runner.py --dataset routing
```

---

## How to Interpret Reports

### Terminal Output

After running, you'll see a summary like:

```
============================================================
       Voyager AI — Evaluation Report
============================================================

  Total Tests             30
  Successful Tests        30
  Failed Tests            0

  Routing Accuracy        100.0%
  Routing Precision       100.0%
  Routing Recall          100.0%
  Execution Accuracy      100.0%

  Avg Response Time       7.62s
  Avg Supervisor Time     0.07s
  Avg Planning Time       2.51s
  Avg Discovery Time      13.87s
  Avg Budget Time         0.09s

  Overall Success Rate    100.0%

============================================================
```

### Output Files

| File | What It Contains |
|------|-----------------|
| `evaluation_report.json` | Full structured report with all per-test results |
| `evaluation_summary.md` | Human-readable report with tables, latency breakdown, and suggestions |
| `latest_metrics.json` | Metrics-only snapshot for programmatic comparison |
| `agent_usage.png` | Bar chart showing how often each agent was invoked |
| `agent_latency.png` | Horizontal bar chart of average per-agent latency |

---

## Architecture

The framework is designed to be **completely separate** from production code:

```
                    ┌──────────────┐
                    │  runner.py   │  CLI entry point
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ evaluator.py │  Runs tests through instrumented graph
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──┐  ┌──────▼──┐  ┌─────▼───┐
       │utils.py │  │metrics.py│  │report.py│
       └─────────┘  └─────────┘  └─────────┘
       State builder  Precision/   JSON, Markdown,
       Tool tracking  Recall calc  Charts
```

**Key design decisions:**
- **No production code changes**: Tools are monkey-patched at runtime for tracking
- **Separate instrumented graph**: A copy of the LangGraph is built with timing wrappers
- **LLM-as-a-Judge**: Uses the same LLM service (Groq/Gemini) already configured
- **30 curated test cases**: Quality over quantity — each tests a specific behavior

