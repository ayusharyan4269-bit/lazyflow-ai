"""LazyFlow AI Backend - Configuration"""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "LazyFlow AI"
    app_version: str = "1.0.0"
    debug: bool = False

    # Server
    host: str = "127.0.0.1"
    port: int = 8000

    # Database
    database_url: str = ""

    # AI Provider
    ai_provider: str = "ollama"
    ai_model: str = "qwen2.5:3b"
    ai_base_url: str = "http://localhost:11434"
    ai_request_timeout: int = 300
    ai_max_tokens: int = 4096

    # Input limits
    max_input_length: int = 50000
    max_title_length: int = 200

    model_config = {
        "env_file": ".env",
        "env_prefix": "LAZYFLOW_",
        "case_sensitive": False,
    }

    def get_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        db_dir = Path(__file__).parent.parent / "data"
        db_dir.mkdir(exist_ok=True)
        return f"sqlite+aiosqlite:///{db_dir / 'lazyflow.db'}"


settings = Settings()
