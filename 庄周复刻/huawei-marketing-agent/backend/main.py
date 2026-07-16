"""
Huawei Marketing Agent - FastAPI Backend
Main entry point with all routes and WebSocket support.

Routes:
  POST /api/sessions              - Create session
  POST /api/sessions/{id}/chat    - Send message (triggers agent workflow)
  GET  /api/sessions/{id}/status  - Get current state
  GET  /api/sessions/{id}/reports/{type}       - Get report
  GET  /api/sessions/{id}/reports/{type}/export - Export report
  POST /api/sessions/{id}/audit   - Trigger audit
  GET  /api/products              - Get product knowledge base
  WS   /ws/{session_id}           - Real-time progress
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional

from fastapi import (
    BackgroundTasks,
    FastAPI,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from agent_system import main_agent, product_kb, ws_broadcaster
from config import settings
from models import (
    AuditResult,
    ChatMessage,
    ChatResponse,
    ReportType,
    ScoreBreakdown,
    SessionCreate,
    SessionState,
    SessionStatusResponse,
)
from report_service import report_service
from session_manager import session_manager

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("main")

# ---------------------------------------------------------------------------
# Lifespan - startup / shutdown events
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: load KB on startup."""
    logger.info("=" * 60)
    logger.info("Huawei Marketing Agent API starting up...")
    logger.info("=" * 60)

    # Load product knowledge base
    try:
        product_kb.load()
        logger.info("Product knowledge base loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load product knowledge base: {e}")

    yield  # Application runs here

    logger.info("Huawei Marketing Agent API shutting down...")


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (frontend build output)
frontend_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

# ---------------------------------------------------------------------------
# WebSocket Endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time progress updates.
    Clients connect here to receive live status during agent execution.
    """
    await websocket.accept()
    connection_id = str(uuid.uuid4())

    # Validate session
    session = session_manager.get_session(session_id)
    if session is None:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": f"Session {session_id} not found",
        }, ensure_ascii=False))
        await websocket.close(code=4004)
        return

    # Register connection
    ws_broadcaster.register(session_id, websocket)
    session_manager.register_websocket(session_id, connection_id)
    logger.info(f"WebSocket connected: {connection_id} for session {session_id}")

    try:
        # Send initial state
        agent_state = session_manager.get_agent_state(session_id)
        if agent_state:
            await websocket.send_text(json.dumps({
                "type": "connected",
                "session_id": session_id,
                "state": agent_state.state.value,
                "current_task": agent_state.current_agent,
                "sub_tasks": [
                    {"id": t.id, "name": t.name, "state": t.state.value, "agent": t.agent}
                    for t in agent_state.sub_tasks
                ],
                "reports_ready": agent_state.reports_ready,
            }, ensure_ascii=False, default=str))

        # Keep connection alive, handle client messages
        while True:
            try:
                message = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=settings.ws_heartbeat_interval,
                )
                # Handle client messages (ping, etc.)
                try:
                    data = json.loads(message)
                    msg_type = data.get("type", "")
                    if msg_type == "ping":
                        await websocket.send_text(json.dumps({
                            "type": "pong",
                            "timestamp": data.get("timestamp"),
                        }))
                except json.JSONDecodeError:
                    pass
            except asyncio.TimeoutError:
                # Send heartbeat
                try:
                    await websocket.send_text(json.dumps({
                        "type": "heartbeat",
                        "timestamp": asyncio.get_event_loop().time(),
                    }))
                except Exception:
                    break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
    finally:
        ws_broadcaster.unregister(session_id, websocket)
        session_manager.unregister_websocket(session_id, connection_id)
        logger.info(f"WebSocket cleanup: {connection_id}")


# ---------------------------------------------------------------------------
# REST API Routes
# ---------------------------------------------------------------------------

@app.post("/api/sessions", response_model=Dict[str, Any])
async def create_session(request: SessionCreate):
    """Create a new session for a product analysis."""
    session = session_manager.create_session(request)
    return {
        "session_id": session.session_id,
        "state": session.state.value,
        "product_name": session.product_name,
        "created_at": session.created_at,
    }


@app.post("/api/sessions/{session_id}/chat", response_model=ChatResponse)
async def send_message(
    session_id: str,
    message: ChatMessage,
    background_tasks: BackgroundTasks,
):
    """
    Send a message to the agent. If trigger_agent is True,
    the full agent workflow is started as a background task.
    """
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    # Store user message
    session_manager.add_message(session_id, "user", message.message)

    # If not triggering agent, just return acknowledgment
    if not message.trigger_agent:
        return ChatResponse(
            session_id=session_id,
            status="acknowledged",
            message="Message received",
            state=session.state,
        )

    # Check if already running
    if session.state in (SessionState.RESEARCHING, SessionState.PLANNING, SessionState.AUDITING):
        return ChatResponse(
            session_id=session_id,
            status="busy",
            message="Agent is already processing. Please wait.",
            state=session.state,
        )

    # Start agent workflow in background
    background_tasks.add_task(
        main_agent.run_workflow,
        session_id=session_id,
        product_name=session.product_name,
        product_info=session.product_info,
        run_audit=False,  # Audit is triggered separately
    )

    return ChatResponse(
        session_id=session_id,
        status="started",
        message=f"Agent workflow started for: {session.product_name}",
        state=SessionState.RESEARCHING,
    )


@app.get("/api/sessions/{session_id}/status", response_model=SessionStatusResponse)
async def get_status(session_id: str):
    """Get the current state of a session."""
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    current_task = None
    for task in session.sub_tasks:
        if task.state.value == "running":
            current_task = task.name
            break

    return SessionStatusResponse(
        session_id=session_id,
        state=session.state,
        current_task=current_task,
        sub_tasks=session.sub_tasks,
        reports_available=session_manager.list_available_reports(session_id),
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@app.get("/api/sessions/{session_id}/reports/{report_type}")
async def get_report(session_id: str, report_type: str):
    """Get a generated report by type."""
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    report = session_manager.get_report(session_id, report_type)
    if report is None:
        raise HTTPException(
            status_code=404,
            detail=f"Report '{report_type}' not found for session {session_id}",
        )

    return {
        "session_id": session_id,
        "report_type": report_type,
        "title": report.get("title", ""),
        "content": report.get("content", ""),
        "markdown": report.get("markdown", ""),
        "created_at": report.get("created_at"),
    }


@app.get("/api/sessions/{session_id}/reports/{report_type}/export")
async def export_report(
    session_id: str,
    report_type: str,
    format: str = Query("markdown", description="Export format: markdown, html, pdf"),
):
    """
    Export a report in the specified format.
    Formats: markdown, html, pdf
    """
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    report = session_manager.get_report(session_id, report_type)
    if report is None:
        raise HTTPException(
            status_code=404,
            detail=f"Report '{report_type}' not found",
        )

    if format not in ("markdown", "html", "pdf"):
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

    file_bytes, content_type = report_service.export_report(report, format)

    # Build filename
    product_name = session.product_name.replace(" ", "_")
    ext_map = {"markdown": "md", "html": "html", "pdf": "pdf"}
    filename = f"{product_name}_{report_type}.{ext_map[format]}"

    return StreamingResponse(
        iter([file_bytes]),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/sessions/{session_id}/audit")
async def trigger_audit(session_id: str, background_tasks: BackgroundTasks):
    """Trigger Marketing 7.0 audit on the existing marketing plan."""
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    # Check if marketing plan exists
    if "marketing_plan" not in session.reports:
        raise HTTPException(
            status_code=400,
            detail="No marketing plan found. Please run the agent workflow first.",
        )

    # Check if already auditing
    if session.state == SessionState.AUDITING:
        return {
            "session_id": session_id,
            "status": "busy",
            "message": "Audit is already in progress.",
        }

    # Start audit in background
    background_tasks.add_task(
        main_agent.run_audit_only,
        session_id=session_id,
        product_name=session.product_name,
    )

    return {
        "session_id": session_id,
        "status": "started",
        "message": "Marketing 7.0 audit started.",
    }


@app.get("/api/products")
async def get_products(query: Optional[str] = None):
    """
    Get product knowledge base.
    Optionally filter by query string.
    """
    all_data = product_kb.get_all_data()

    if query:
        # Search for matching products
        query_lower = query.lower()
        results = {"huawei": {}, "competitors": {}}

        # Search Huawei products
        huawei = all_data.get("huawei", {})
        for series, products in huawei.items():
            if not isinstance(products, list):
                continue
            matches = [p for p in products if query_lower in p.get("model", "").lower()]
            if matches:
                results["huawei"][series] = matches

        # Search competitor products
        competitors = all_data.get("competitors", {})
        for brand, products in competitors.items():
            if isinstance(products, list):
                matches = [p for p in products if query_lower in p.get("model", "").lower()]
                if matches:
                    results["competitors"][brand] = matches

        return results

    return all_data


# ---------------------------------------------------------------------------
# Health & Root
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "timestamp": asyncio.get_event_loop().time(),
    }


@app.get("/")
async def root():
    """Root endpoint - API info."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "endpoints": {
            "sessions": "POST /api/sessions",
            "chat": "POST /api/sessions/{id}/chat",
            "status": "GET /api/sessions/{id}/status",
            "reports": "GET /api/sessions/{id}/reports/{type}",
            "export": "GET /api/sessions/{id}/reports/{type}/export?format=markdown|html|pdf",
            "audit": "POST /api/sessions/{id}/audit",
            "products": "GET /api/products",
            "websocket": "WS /ws/{session_id}",
        },
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info",
    )
