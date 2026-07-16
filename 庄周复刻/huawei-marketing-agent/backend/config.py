"""
Configuration management for Huawei Marketing Agent Backend.
All settings are loaded from environment variables with sensible defaults.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Kimi API Configuration
    kimi_api_key: str = ""
    kimi_base_url: str = "https://api.moonshot.cn/v1"
    kimi_model: str = "kimi-k2-0528"
    kimi_timeout: int = 120  # seconds
    kimi_max_retries: int = 3

    # Application Configuration
    app_name: str = "Huawei Marketing Agent API"
    app_version: str = "1.0.0"
    debug: bool = False

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000

    # Data Paths
    data_dir: Path = Path("/mnt/agents/output/huawei-marketing-agent/data")
    products_json: Path = Path("/mnt/agents/output/huawei-marketing-agent/data/products.json")
    auditor_skill_path: Path = Path("/mnt/agents/output/marketing7-auditor/SKILL.md")
    auditor_references_dir: Path = Path("/mnt/agents/output/marketing7-auditor/references")

    # WebSocket Configuration
    ws_heartbeat_interval: int = 30  # seconds

    # Report Configuration
    report_cache_dir: Path = Path("/mnt/agents/output/huawei-marketing-agent/backend/cache")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure directories exist
        self.report_cache_dir.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()


# Derived constants
KIMI_API_KEY: str = settings.kimi_api_key or os.getenv("KIMI_API_KEY", "")
KIMI_BASE_URL: str = settings.kimi_base_url
KIMI_MODEL: str = settings.kimi_model
KIMI_TIMEOUT: int = settings.kimi_timeout
KIMI_MAX_RETRIES: int = settings.kimi_max_retries

# Product knowledge base path
PRODUCTS_JSON_PATH: Path = settings.products_json

# Marketing 7.0 Auditor skill paths
AUDITOR_SKILL_PATH: Path = settings.auditor_skill_path
AUDITOR_REFERENCES_DIR: Path = settings.auditor_references_dir

# Session states
SESSION_STATES = ["idle", "researching", "planning", "auditing", "completed", "error"]

# Report types
REPORT_TYPES = ["competitor", "marketing_plan", "audit", "full"]
