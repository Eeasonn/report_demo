"""
Session Manager - Manages in-memory session storage and state transitions.
All session data is stored in a thread-safe dictionary with async support.
"""

from __future__ import annotations

import time
import logging
from typing import Any, Dict, List, Optional

from models import (
    AgentProgress,
    AgentState,
    SessionCreate,
    SessionData,
    SessionState,
    SubTask,
    SubTaskState,
    WSMessage,
)

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages all active sessions in memory.
    Thread-safe using dict operations (GIL-protected in CPython).
    """

    def __init__(self):
        self._sessions: Dict[str, SessionData] = {}
        logger.info("SessionManager initialized")

    # ------------------------------------------------------------------
    # CRUD Operations
    # ------------------------------------------------------------------

    def create_session(self, request: SessionCreate) -> SessionData:
        """Create a new session from user request."""
        session = SessionData(
            product_name=request.product_name,
            product_info=request.product_info,
        )
        self._sessions[session.session_id] = session
        logger.info(f"Session created: {session.session_id} for product: {request.product_name}")
        return session

    def get_session(self, session_id: str) -> Optional[SessionData]:
        """Get session by ID. Returns None if not found."""
        return self._sessions.get(session_id)

    def update_session(self, session: SessionData) -> None:
        """Update an existing session."""
        session.updated_at = time.time()
        self._sessions[session.session_id] = session

    def delete_session(self, session_id: str) -> bool:
        """Delete a session. Returns True if deleted."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"Session deleted: {session_id}")
            return True
        return False

    def list_sessions(self) -> List[SessionData]:
        """List all active sessions."""
        return list(self._sessions.values())

    # ------------------------------------------------------------------
    # State Management
    # ------------------------------------------------------------------

    def set_state(self, session_id: str, state: SessionState) -> Optional[SessionData]:
        """Update session state."""
        session = self.get_session(session_id)
        if session is None:
            logger.warning(f"Session not found: {session_id}")
            return None
        session.state = state
        session.updated_at = time.time()
        logger.info(f"Session {session_id} state -> {state.value}")
        return session

    def add_message(self, session_id: str, role: str, content: str) -> bool:
        """Add a message to session history."""
        session = self.get_session(session_id)
        if session is None:
            return False
        session.messages.append({
            "role": role,
            "content": content,
            "timestamp": time.time(),
        })
        session.updated_at = time.time()
        return True

    # ------------------------------------------------------------------
    # Sub-task Management
    # ------------------------------------------------------------------

    def create_sub_task(
        self,
        session_id: str,
        name: str,
        description: str = "",
        agent: str = "",
        input_data: Optional[str] = None,
    ) -> Optional[SubTask]:
        """Create and register a new sub-task for a session."""
        session = self.get_session(session_id)
        if session is None:
            return None
        task = SubTask(
            name=name,
            description=description,
            agent=agent,
            input_data=input_data,
            state=SubTaskState.PENDING,
        )
        session.sub_tasks.append(task)
        session.updated_at = time.time()
        logger.info(f"Sub-task created for {session_id}: {name}")
        return task

    def update_sub_task_state(
        self,
        session_id: str,
        task_id: str,
        state: SubTaskState,
        output_data: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> bool:
        """Update sub-task state and optionally set output."""
        session = self.get_session(session_id)
        if session is None:
            return False
        for task in session.sub_tasks:
            if task.id == task_id:
                task.state = state
                if state == SubTaskState.RUNNING and task.started_at is None:
                    task.started_at = time.time()
                if state in (SubTaskState.COMPLETED, SubTaskState.FAILED):
                    task.completed_at = time.time()
                if output_data is not None:
                    task.output_data = output_data
                if error_message is not None:
                    task.error_message = error_message
                session.updated_at = time.time()
                logger.info(f"Sub-task {task_id} state -> {state.value}")
                return True
        return False

    # ------------------------------------------------------------------
    # Report Management
    # ------------------------------------------------------------------

    def store_report(self, session_id: str, report_type: str, report_data: Dict[str, Any]) -> bool:
        """Store a generated report in the session."""
        session = self.get_session(session_id)
        if session is None:
            return False
        session.reports[report_type] = report_data
        session.updated_at = time.time()
        logger.info(f"Report stored for {session_id}: {report_type}")
        return True

    def get_report(self, session_id: str, report_type: str) -> Optional[Dict[str, Any]]:
        """Retrieve a stored report."""
        session = self.get_session(session_id)
        if session is None:
            return None
        return session.reports.get(report_type)

    def list_available_reports(self, session_id: str) -> List[str]:
        """List all available report types for a session."""
        session = self.get_session(session_id)
        if session is None:
            return []
        return list(session.reports.keys())

    # ------------------------------------------------------------------
    # WebSocket Connection Tracking
    # ------------------------------------------------------------------

    def register_websocket(self, session_id: str, connection_id: str) -> bool:
        """Register a WebSocket connection for a session."""
        session = self.get_session(session_id)
        if session is None:
            return False
        if connection_id not in session.websocket_connections:
            session.websocket_connections.append(connection_id)
        return True

    def unregister_websocket(self, session_id: str, connection_id: str) -> bool:
        """Unregister a WebSocket connection."""
        session = self.get_session(session_id)
        if session is None:
            return False
        if connection_id in session.websocket_connections:
            session.websocket_connections.remove(connection_id)
        return True

    # ------------------------------------------------------------------
    # State Transition Helpers
    # ------------------------------------------------------------------

    def transition_to_researching(self, session_id: str) -> Optional[SessionData]:
        """Transition session to researching state."""
        return self.set_state(session_id, SessionState.RESEARCHING)

    def transition_to_planning(self, session_id: str) -> Optional[SessionData]:
        """Transition session to planning state."""
        return self.set_state(session_id, SessionState.PLANNING)

    def transition_to_auditing(self, session_id: str) -> Optional[SessionData]:
        """Transition session to auditing state."""
        return self.set_state(session_id, SessionState.AUDITING)

    def transition_to_completed(self, session_id: str) -> Optional[SessionData]:
        """Transition session to completed state."""
        return self.set_state(session_id, SessionState.COMPLETED)

    def transition_to_error(self, session_id: str) -> Optional[SessionData]:
        """Transition session to error state."""
        return self.set_state(session_id, SessionState.ERROR)

    # ------------------------------------------------------------------
    # Build Agent State / Progress
    # ------------------------------------------------------------------

    def get_agent_state(self, session_id: str) -> Optional[AgentState]:
        """Build AgentState from session data."""
        session = self.get_session(session_id)
        if session is None:
            return None
        current_task = None
        for task in session.sub_tasks:
            if task.state == SubTaskState.RUNNING:
                current_task = task.name
                break
        return AgentState(
            session_id=session_id,
            state=session.state,
            current_agent=current_task,
            sub_tasks=session.sub_tasks,
            reports_ready=self.list_available_reports(session_id),
        )

    def build_progress_message(
        self,
        session_id: str,
        message: str = "",
        msg_type: str = "progress",
    ) -> Optional[AgentProgress]:
        """Build an AgentProgress message for WebSocket broadcast."""
        session = self.get_session(session_id)
        if session is None:
            return None
        current_task = None
        for task in session.sub_tasks:
            if task.state == SubTaskState.RUNNING:
                current_task = task.name
                break
        return AgentProgress(
            type=msg_type,
            session_id=session_id,
            state=session.state,
            current_task=current_task,
            sub_tasks=session.sub_tasks,
            message=message,
        )


# Global singleton instance
session_manager = SessionManager()
