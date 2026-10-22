"""LazyFlow AI - FastAPI Application Entry Point"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine
from app.models.database import Base
from app.api import tasks, documents, ai

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    logger.info("Starting LazyFlow AI backend v%s", settings.app_version)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready at: %s", settings.get_database_url())
    yield
    await engine.dispose()
    logger.info("LazyFlow AI backend stopped.")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Local-first AI productivity assistant API",
    lifespan=lifespan,
)

# CORS - restrict to local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)

# Register routers
app.include_router(tasks.router)
app.include_router(documents.router)
app.include_router(ai.router)


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.app_version}


@app.post("/api/workspace/clear", status_code=200)
async def clear_workspace():
    """Clear all data from the workspace. Requires explicit user action."""
    async with engine.begin() as conn:
        # Drop and recreate all tables
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    return {"status": "cleared", "message": "All data has been deleted."}
