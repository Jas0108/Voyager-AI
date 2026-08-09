# Voyager AI

Voyager AI is a multi-agent travel assistant. You describe your trip by just having a conversation with it (destination, dates, budget, interests) and it handles the rest. It builds your itinerary, finds places nearby, tracks your spending, and answers questions about your trip, all through a single chat interface.

It runs on a **Supervisor-Worker** pipeline built with **LangGraph**. When you send a message, a Supervisor agent analyses your intent and decides which specialist agents to run: Planning, Discovery, or Budget. Those agents execute in sequence, and a Synthesizer combines their outputs into one clean response. No manual tool selection, no switching between views.

Demo: https://voyager-ai-sigma.vercel.app/

## What It Does

**Trip Planning**
Generate a structured day-by-day itinerary for any destination based on your travel dates and interests
Modify individual days without losing the rest of the schedule ("change day 4 to something beachside")
Factor live weather forecasts into activity suggestions

**Place Discovery**
Search for restaurants, cafes, tourist attractions, hospitals, banks, ATMs, parks, and supermarkets near any location
Powered by OpenStreetMap and the Overpass API with no paid map APIs required
Every result includes a direct Google Maps link

**Budget Tracking**
Set a trip budget in any major currency (USD, EUR, GBP, INR, JPY, CAD, AUD)
Log expenses by category (food, transport, accommodation, activities, shopping)
Check remaining balance and daily spending allowance at any point
Live currency conversion between supported currencies

**Conversation Memory**
The assistant knows your destination, budget, itinerary, and expenses across the entire conversation
Ask follow-up questions naturally without repeating yourself every time


## How the Agent Pipeline Works

```
User Message
     │
     ▼
Supervisor Agent
  (reads intent → builds execution plan: e.g. ["planning", "discovery"])
     │
     ├──► Planning Agent    ← Builds/modifies itineraries, checks weather
     ├──► Discovery Agent   ← Geocodes location, queries Overpass for nearby places
     └──► Budget Agent      ← Logs expenses, calculates remaining budget, converts currency
     │
     ▼
Synthesizer Agent
  (merges all agent outputs into one clean, coherent response)
     │
     ▼
Final Response
```

The Supervisor first attempts LLM-based JSON intent parsing. If that fails (rate limit, malformed output), it falls back to a deterministic regex router in `app/utils/query_parser.py` that uses whole-word boundary matching to prevent false positives.


## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI (Python 3.10+) |
| **Agent Orchestration** | LangGraph + LangChain Core |
| **LLM** | Groq API, Llama 3.3 70B |
| **Database & Auth** | Supabase (PostgreSQL) + JWT |
| **Place Discovery** | OpenStreetMap Nominatim + Overpass API |
| **Weather** | OpenWeatherMap API |
| **Frontend** | Next.js 15 (App Router, TypeScript) |
| **Styling** | Tailwind CSS |
| **Data Fetching** | TanStack Query |
| **Charts** | Recharts |


## Project Structure

```
Voyager AI/
├── backend/
│   ├── app/
│   │   ├── agents/        # Supervisor, Planning, Discovery, Budget, Synthesizer
│   │   ├── api/           # Route handlers (auth, trips, expenses, assistant)
│   │   ├── database/      # Supabase client
│   │   ├── graph/         # LangGraph state + graph builder
│   │   ├── models/        # DB model definitions
│   │   ├── prompts/       # System prompts for each agent
│   │   ├── schemas/       # Request / response validation
│   │   ├── services/      # Business logic (LLM, places, weather, trips, expenses)
│   │   ├── tools/         # LangChain tools (weather, nearby, budget, currency)
│   │   ├── utils/         # Intent parser and async helpers
│   │   ├── config.py
│   │   └── main.py
│   │
│   ├── evals/             # Evaluation framework (see section below)
│   │   ├── datasets/      # 30 test scenarios across 3 JSON files
│   │   ├── outputs/       # Reports and charts generated after each run
│   │   ├── evaluator.py
│   │   ├── metrics.py
│   │   ├── models.py
│   │   ├── report.py
│   │   ├── runner.py
│   │   ├── utils.py
│   │   └── README.md
│   │
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── app/               # Pages: dashboard, assistant, trips, budget, login, settings
│   ├── components/        # AppLayout, Sidebar, Navbar, ItineraryView, PlacesView, etc.
│   ├── lib/               # Axios client and utils
│   ├── services/          # Auth, trip, expense, assistant API calls
│   ├── hooks/             # useAuthUser
│   ├── types/             # TypeScript interfaces
│   └── package.json
│
└── README.md
```


## Getting Started

### Prerequisites

Python 3.10+
Node.js 18+
[Supabase](https://supabase.com) project (free tier works)
[Groq](https://console.groq.com) API key (free tier works)


### 1. Clone the Repository

```bash
git clone https://github.com/your-username/voyager-ai.git
cd voyager-ai
```

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET=any_long_random_string
OPENWEATHER_API_KEY=your_openweather_key   # optional
```

```bash
python run.py
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
# App running at http://localhost:3000
```


## Evaluation Framework

The project ships with a fully decoupled evaluation framework in `backend/evals/` that measures how reliably the system routes queries, executes the right agents, and produces quality responses without touching any production code.

### Why It Exists

Agent routing bugs are subtle. Early versions of the system had a substring-matching bug where the keyword `"eat"` would match inside `"weather"` and `"create"`, incorrectly routing weather queries and itinerary edits to the Discovery agent. The word `"hot"` matched inside `"hotel"`, and `"show me"` in the sightseeing keyword list caused spending breakdown requests to trigger planning. None of these were obvious from manual testing.

Building an automated suite made these failure modes visible. The first benchmark run scored **83.3%** (25/30 passed). The failing tests pointed directly at the broken logic. Fixing the root cause (upgrading all intent detection to regex whole-word boundary matching and hardening the fallback routing guards) brought the score to **100%** on the next run.

### Architecture

The framework is completely separate from the production codebase:

```
runner.py         ← CLI entry point, loads datasets, calls evaluator
evaluator.py      ← Runs each test through the agent graph with instrumentation
utils.py          ← Monkey-patches tools at runtime to track invocations + timing
metrics.py        ← Computes precision, recall, accuracy, latency per agent
report.py         ← Generates Markdown summary, JSON report, and PNG charts
models.py         ← Pydantic data models for test cases and results
```

Tools are monkey-patched at runtime. No changes to production code are needed to observe which tools were called, in what order, and how long each took.

### Datasets

30 test cases spread across three files in `evals/datasets/`:

| File | Count | Tests |
|------|-------|-------|
| `routing.json` | 12 | Single-agent routing: does the Supervisor route to the correct agent and only that agent? |
| `multi_agent.json` | 10 | Multi-agent workflows: does the system correctly invoke multiple agents in the right combination? |
| `edge_cases.json` | 8 | Edge cases: gibberish input, empty queries, ambiguous intent, prompt injection attempts |

Each test case specifies the input query, the expected agents, and optionally the expected tools:

```json
{
  "id": 7,
  "query": "What's the weather like in Tokyo next week?",
  "expected_agents": ["planning"],
  "expected_tools": ["get_weather"],
  "description": "Pure weather query, should route only to planning agent",
  "category": "planning_only"
}
```

### Metrics

| Metric | What it measures |
|--------|-----------------|
| **Routing Accuracy** | % of tests where actual agents exactly matched expected agents |
| **Routing Precision** | Of agents invoked, what fraction were correct |
| **Routing Recall** | Of expected agents, what fraction were actually invoked |
| **Execution Accuracy** | Whether all expected agents ran successfully without errors |
| **Response Validity** | Response is non-empty, no unhandled exceptions |
| **LLM-as-a-Judge** | Scores each response 1 to 5 on Relevance, Completeness, Helpfulness |
| **Latency** | Per-agent timing across Supervisor, Planning, Discovery, and Budget |

### Running It

```bash
cd backend

# Run all 30 tests
python evals/runner.py

# Run a specific dataset
python evals/runner.py --dataset routing
python evals/runner.py --dataset multi_agent
python evals/runner.py --dataset edge_cases
```

Reports are written to `backend/evals/outputs/`:
`evaluation_summary.md` - human-readable table with per-test pass/fail
`evaluation_report.json` - full structured data for all 30 results
`latest_metrics.json` - metrics snapshot for programmatic comparison
`agent_usage.png` - bar chart of how often each agent was invoked
`agent_latency.png` - bar chart of average per-agent latency

### Results

| Metric | Initial Run (Unfixed) | After Fix |
|--------|-----------------------|-----------|
| Routing Accuracy | 83.3% (25/30) | **100.0% (30/30)** |
| Routing Precision | 91.7% | **100.0%** |
| Routing Recall | 100.0% | **100.0%** |
| Avg Response Latency | 19.96s | **7.62s** |

Bugs the eval suite surfaced:
`"eat"` matching inside `"weather"` and `"create"` causing a false Discovery agent trigger
`"hot"` matching inside `"hotel"` causing a false Discovery agent trigger
`"show me"` in sightseeing keywords routing spending breakdown requests to Planning
Expense log queries with food terms (e.g. "I spent 200 on dinner") triggering place search

All fixed by switching to `\b`-bounded regex matching and adding explicit guards in `_fallback_routing`.


## Environment Variables

| Variable | Where | Required | Description |
|----------|-------|----------|-------------|
| `GROQ_API_KEY` | `backend/.env` | Yes | Groq LLM inference |
| `SUPABASE_URL` | `backend/.env` | Yes | Supabase project URL |
| `SUPABASE_KEY` | `backend/.env` | Yes | Supabase anon key |
| `JWT_SECRET` | `backend/.env` | Yes | JWT signing secret |
| `OPENWEATHER_API_KEY` | `backend/.env` | Optional | Live weather data |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Yes | Backend URL |


## License

MIT
