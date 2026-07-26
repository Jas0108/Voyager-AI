"""
Data models for the evaluation framework.
Defines structures for test cases, results, and metrics.
"""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime


class EvalTestCase(BaseModel):
    """A single evaluation test case loaded from the dataset."""
    id: int
    query: str
    expected_agents: List[str]
    expected_tools: List[str] = Field(default_factory=list)
    description: str
    category: str = "general"
    expected_behavior: Optional[str] = None
    trip_context: Optional[Dict[str, Any]] = None


class JudgeScores(BaseModel):
    """LLM-as-a-judge quality scores for a response."""
    relevance: float = 0.0
    completeness: float = 0.0
    helpfulness: float = 0.0
    reasoning: str = ""


class EvalResult(BaseModel):
    """Result of evaluating a single test case."""
    test_id: int
    query: str
    description: str
    category: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

    # Routing
    expected_agents: List[str]
    actual_agents: List[str] = Field(default_factory=list)
    routing_correct: bool = False

    # Tool usage
    expected_tools: List[str] = Field(default_factory=list)
    actual_tools: List[str] = Field(default_factory=list)

    # Execution details
    execution_order: List[str] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)

    # Latency (seconds)
    total_latency: float = 0.0
    supervisor_latency: float = 0.0
    planning_latency: float = 0.0
    discovery_latency: float = 0.0
    budget_latency: float = 0.0

    # Response
    response_text: str = ""
    response_valid: bool = False

    # LLM Judge
    judge_scores: Optional[JudgeScores] = None

    # Overall
    success: bool = False
    failure_reason: str = ""


class LatencyStats(BaseModel):
    """Aggregated latency statistics."""
    avg: float = 0.0
    min: float = 0.0
    max: float = 0.0


class ResponseQuality(BaseModel):
    """Aggregated LLM judge quality scores."""
    avg_relevance: float = 0.0
    avg_completeness: float = 0.0
    avg_helpfulness: float = 0.0
    total_judged: int = 0


class EvalMetrics(BaseModel):
    """Aggregated evaluation metrics across all test cases."""
    total_tests: int = 0
    passed: int = 0
    failed: int = 0

    # Routing
    routing_precision: float = 0.0
    routing_recall: float = 0.0
    routing_accuracy: float = 0.0

    # Execution
    execution_accuracy: float = 0.0

    # Tools
    tool_precision: float = 0.0
    tool_recall: float = 0.0
    tool_accuracy: float = 0.0

    # Latency
    overall_latency: LatencyStats = Field(default_factory=LatencyStats)
    supervisor_latency: LatencyStats = Field(default_factory=LatencyStats)
    planning_latency: LatencyStats = Field(default_factory=LatencyStats)
    discovery_latency: LatencyStats = Field(default_factory=LatencyStats)
    budget_latency: LatencyStats = Field(default_factory=LatencyStats)

    # Agent usage counts
    agent_usage: Dict[str, int] = Field(default_factory=dict)

    # Response quality
    response_valid_rate: float = 0.0
    response_quality: ResponseQuality = Field(default_factory=ResponseQuality)

    # Overall
    success_rate: float = 0.0

    # Failed test details
    failed_tests: List[Dict[str, str]] = Field(default_factory=list)


class EvalReport(BaseModel):
    """Complete evaluation report."""
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    metrics: EvalMetrics = Field(default_factory=EvalMetrics)
    results: List[EvalResult] = Field(default_factory=list)
