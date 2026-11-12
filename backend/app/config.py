from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCKER_FIXTURES_DIR = Path("/fixtures")


class Settings(BaseSettings):
    # Read the repo-root .env (where the README tells you to put it) regardless
    # of which directory uvicorn is started from. A missing file is ignored,
    # and real environment variables (e.g. from docker compose) still win.
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", extra="ignore")

    ingestion_mode: Literal["fixture", "live"] = "fixture"

    azure_tenant_id: str = ""
    azure_client_id: str = ""
    azure_client_secret: str = ""

    frontend_origin: str = "http://localhost:5173"

    @property
    def fixtures_dir(self) -> Path:
        if DOCKER_FIXTURES_DIR.is_dir():
            return DOCKER_FIXTURES_DIR
        return REPO_ROOT / "fixtures"


settings = Settings()
