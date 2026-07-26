# Voyager AI — Evaluation Summary

## Overall Results

| Metric | Value |
|--------|-------|
| Total Tests | 30 |
| Passed | 30 |
| Failed | 0 |
| **Overall Success Rate** | **100.0%** |

## Routing Metrics

| Metric | Value |
|--------|-------|
| Routing Accuracy | 100.0% |
| Routing Precision | 100.0% |
| Routing Recall | 100.0% |
| Execution Accuracy | 100.0% |

## Tool Metrics

| Metric | Value |
|--------|-------|
| Tool Precision | 0.0% |
| Tool Recall | 0.0% |

## Latency

| Component | Avg | Min | Max |
|-----------|-----|-----|-----|
| Overall | 15.949s | 0.164s | 87.447s |
| Supervisor | 0.737s | 0.068s | 8.509s |
| Planning | 12.487s | 1.127s | 61.237s |
| Discovery | 13.183s | 0.875s | 51.072s |
| Budget | 1.577s | 0.076s | 10.636s |

## Agent Usage

| Agent | Times Invoked |
|-------|---------------|
| Planning | 17 |
| Budget | 15 |
| Discovery | 13 |

## Response Quality (LLM-as-a-Judge)

| Criterion | Average Score (out of 5) |
|-----------|------------------------|
| Relevance | 3.44 |
| Completeness | 2.78 |
| Helpfulness | 3.11 |
| Tests Judged | 9 |

## Slowest Requests

| Test ID | Query | Latency |
|---------|-------|---------|
| 4 | Plan my Rome itinerary and check if it fits within | 87.447s |
| 5 | Create a day-by-day schedule and recommend restaur | 82.632s |
| 7 | Plan my entire trip, find nearby attractions, and  | 64.314s |
| 17 | I just spent 80 euros on a museum ticket. Now find | 51.434s |
| 19 | Are there any good parks or museums near my hotel? | 35.926s |

## Fastest Requests

| Test ID | Query | Latency |
|---------|-------|---------|
| 10 | I spent 150 dollars on dinner last night, add that | 0.306s |
| 23 |  | 0.241s |
| 12 | Hello! How are you doing today? | 0.196s |
| 28 | The quick brown fox jumps over the lazy dog. | 0.173s |
| 30 | Do something travel related maybe? | 0.164s |

## Suggestions for Improvement

- Average response time exceeds 5 seconds. Consider optimizing API calls or caching.
- Response relevance is below 3.5/5. Review agent prompts for better query understanding.
- Response completeness is below 3.5/5. Agents may be missing parts of the user's request.
- All core metrics are healthy. Consider adding more edge cases to stress-test the system.
