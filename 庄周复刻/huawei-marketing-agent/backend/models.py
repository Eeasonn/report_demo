"""
Pydantic data models for the Huawei Marketing Agent API.
Defines all request/response schemas and internal data structures.
"""

from __future__ import annotations

import time
import uuid
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# =============================================================================
# Enums
# =============================================================================

class SessionState(str, Enum):
    """Session lifecycle states."""
    IDLE = "idle"
    RESEARCHING = "researching"
    PLANNING = "planning"
    AUDITING = "auditing"
    COMPLETED = "completed"
    ERROR = "error"


class SubTaskState(str, Enum):
    """Sub-task execution states."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ReportType(str, Enum):
    """Available report types."""
    COMPETITOR = "competitor"
    MARKETING_PLAN = "marketing_plan"
    AUDIT = "audit"
    FULL = "full"


# =============================================================================
# Session Models
# =============================================================================

class SessionCreate(BaseModel):
    """Request body for creating a new session."""
    product_name: str = Field(..., description="Name of the Huawei product to analyze")
    product_info: Optional[str] = Field(None, description="Additional product information provided by user")


class SessionData(BaseModel):
    """Internal session data structure."""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    state: SessionState = Field(default=SessionState.IDLE)
    product_name: str = Field(default="")
    product_info: Optional[str] = Field(default=None)
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    reports: Dict[str, Any] = Field(default_factory=dict)
    sub_tasks: List[SubTask] = Field(default_factory=list)
    websocket_connections: List[str] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "state": "idle",
                "product_name": "Pura 80 Ultra",
                "created_at": 1700000000.0,
                "updated_at": 1700000000.0,
            }
        }


# =============================================================================
# Chat Models
# =============================================================================

class ChatMessage(BaseModel):
    """Request body for sending a chat message."""
    message: str = Field(..., description="User message content")
    trigger_agent: bool = Field(default=True, description="Whether to trigger the agent workflow")


class ChatResponse(BaseModel):
    """Response for chat message endpoint."""
    session_id: str
    status: str
    message: str
    state: SessionState


# =============================================================================
# Agent Progress Models
# =============================================================================

class SubTask(BaseModel):
    """A sub-task within the agent workflow."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = Field(..., description="Task name")
    description: str = Field(default="", description="Task description")
    state: SubTaskState = Field(default=SubTaskState.PENDING)
    agent: str = Field(default="", description="Agent responsible for this task")
    input_data: Optional[str] = Field(default=None)
    output_data: Optional[str] = Field(default=None)
    started_at: Optional[float] = Field(default=None)
    completed_at: Optional[float] = Field(default=None)
    error_message: Optional[str] = Field(default=None)


class AgentProgress(BaseModel):
    """Real-time progress update sent via WebSocket."""
    type: str = Field(default="progress", description="Message type: progress|report|error|complete")
    session_id: str
    state: SessionState
    current_task: Optional[str] = Field(default=None)
    sub_tasks: List[SubTask] = Field(default_factory=list)
    message: str = Field(default="")
    timestamp: float = Field(default_factory=time.time)


class AgentState(BaseModel):
    """Current state of the agent system for a session."""
    session_id: str
    state: SessionState
    current_agent: Optional[str] = Field(default=None)
    sub_tasks: List[SubTask]
    reports_ready: List[str] = Field(default_factory=list)


# =============================================================================
# Report Models
# =============================================================================

class ReportData(BaseModel):
    """A generated report."""
    report_type: ReportType
    title: str
    content: str
    markdown: str
    created_at: float = Field(default_factory=time.time)


class ScoreBreakdown(BaseModel):
    """Score breakdown for Marketing 7.0 audit."""
    category: str
    score: float  # 0-10
    weight: float  # percentage
    weighted_score: float
    findings: str
    suggestions: str


class AuditResult(BaseModel):
    """Marketing 7.0 audit result."""
    readiness_index: float = Field(..., description="Overall score 0-100")
    grade: str = Field(..., description="S/A/B/C/D grade")
    status: str = Field(..., description="就绪/需优化/重大整改")
    three_gates: List[ScoreBreakdown] = Field(default_factory=list)
    cognitive_map: List[ScoreBreakdown] = Field(default_factory=list)
    four_tools: List[ScoreBreakdown] = Field(default_factory=list)
    core_strengths: str = Field(default="")
    core_weaknesses: str = Field(default="")
    priority_fixes: List[Dict[str, str]] = Field(default_factory=list)
    revision_examples: List[Dict[str, str]] = Field(default_factory=list)
    full_report: str = Field(default="")


# =============================================================================
# Product Knowledge Models
# =============================================================================

class ProductInfo(BaseModel):
    """Product information from knowledge base."""
    model: str
    brand: str = "huawei"
    series: str = ""
    launch_date: str = ""
    price_range: str = ""
    chip: str = ""
    screen: str = ""
    camera: str = ""
    battery: str = ""
    os: str = ""
    memory: str = ""
    key_features: List[str] = Field(default_factory=list)
    marketing_slogan: str = ""
    target_audience: str = ""
    series_positioning: str = ""


class ProductKnowledgeResponse(BaseModel):
    """Response for product knowledge endpoint."""
    huawei_products: List[ProductInfo] = Field(default_factory=list)
    competitor_products: Dict[str, List[ProductInfo]] = Field(default_factory=dict)
    brand_keywords: List[str] = Field(default_factory=list)
    product_lineup: Dict[str, Any] = Field(default_factory=dict)


# =============================================================================
# WebSocket Message Models
# =============================================================================

class WSMessage(BaseModel):
    """WebSocket message wrapper."""
    type: str = Field(..., description="progress|report|error|complete|heartbeat")
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)


class SessionStatusResponse(BaseModel):
    """Response for session status endpoint."""
    session_id: str
    state: SessionState
    current_task: Optional[str]
    sub_tasks: List[SubTask]
    reports_available: List[str]
    created_at: float
    updated_at: float
