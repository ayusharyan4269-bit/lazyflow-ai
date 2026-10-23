"""Tests for LazyFlow AI API — health, tasks CRUD, input validation, persistence."""

import pytest
from httpx import AsyncClient, ASGITransport

# Override database to use in-memory SQLite before importing app
import os
os.environ["LAZYFLOW_DATABASE_URL"] = "sqlite+aiosqlite://"

from app.main import app  # noqa: E402
from app.core.database import engine  # noqa: E402
from app.models.database import Base  # noqa: E402


@pytest.fixture(autouse=True)
async def setup_db():
    """Create and drop tables for each test."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ── Health ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "version" in data


# ── Tasks CRUD ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_task(client: AsyncClient):
    resp = await client.post("/api/tasks", json={
        "title": "Write unit tests",
        "priority": "high",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Write unit tests"
    assert data["priority"] == "high"
    assert data["status"] == "pending"
    assert data["id"] > 0


@pytest.mark.asyncio
async def test_list_tasks(client: AsyncClient):
    # Create two tasks
    await client.post("/api/tasks", json={"title": "Task A"})
    await client.post("/api/tasks", json={"title": "Task B"})
    resp = await client.get("/api/tasks")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_get_task(client: AsyncClient):
    create = await client.post("/api/tasks", json={"title": "Get me"})
    task_id = create.json()["id"]
    resp = await client.get(f"/api/tasks/{task_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Get me"


@pytest.mark.asyncio
async def test_update_task(client: AsyncClient):
    create = await client.post("/api/tasks", json={"title": "Old title"})
    task_id = create.json()["id"]
    resp = await client.patch(f"/api/tasks/{task_id}", json={"title": "New title", "status": "completed"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "New title"
    assert resp.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient):
    create = await client.post("/api/tasks", json={"title": "Delete me"})
    task_id = create.json()["id"]
    resp = await client.delete(f"/api/tasks/{task_id}")
    assert resp.status_code == 204
    # Verify gone
    resp2 = await client.get(f"/api/tasks/{task_id}")
    assert resp2.status_code == 404


@pytest.mark.asyncio
async def test_task_not_found(client: AsyncClient):
    resp = await client.get("/api/tasks/99999")
    assert resp.status_code == 404


# ── Task Stats ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_task_stats(client: AsyncClient):
    await client.post("/api/tasks", json={"title": "A", "priority": "high"})
    await client.post("/api/tasks", json={"title": "B", "priority": "low"})
    resp = await client.get("/api/tasks/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert data["pending"] == 2
    assert data["high_priority"] == 1


# ── Batch Create ────────────────────────────────────────

@pytest.mark.asyncio
async def test_batch_create(client: AsyncClient):
    tasks = [{"title": f"Task {i}"} for i in range(3)]
    resp = await client.post("/api/tasks/batch", json=tasks)
    assert resp.status_code == 201
    assert len(resp.json()) == 3


# ── Input Validation ────────────────────────────────────

@pytest.mark.asyncio
async def test_create_task_empty_title(client: AsyncClient):
    resp = await client.post("/api/tasks", json={"title": ""})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_priority_normalization(client: AsyncClient):
    resp = await client.post("/api/tasks", json={"title": "Test", "priority": "INVALID"})
    assert resp.status_code == 201
    assert resp.json()["priority"] == "medium"  # Normalized to default


# ── Filter & Search ─────────────────────────────────────

@pytest.mark.asyncio
async def test_filter_by_status(client: AsyncClient):
    create = await client.post("/api/tasks", json={"title": "Done"})
    task_id = create.json()["id"]
    await client.patch(f"/api/tasks/{task_id}", json={"status": "completed"})
    await client.post("/api/tasks", json={"title": "Pending"})

    resp = await client.get("/api/tasks?status=completed")
    assert len(resp.json()) == 1
    assert resp.json()[0]["title"] == "Done"


@pytest.mark.asyncio
async def test_search(client: AsyncClient):
    await client.post("/api/tasks", json={"title": "Alpha task"})
    await client.post("/api/tasks", json={"title": "Beta task"})
    resp = await client.get("/api/tasks?search=Alpha")
    assert len(resp.json()) == 1


# ── Workspace Clear ─────────────────────────────────────

@pytest.mark.asyncio
async def test_clear_workspace(client: AsyncClient):
    await client.post("/api/tasks", json={"title": "Will be cleared"})
    resp = await client.post("/api/workspace/clear")
    assert resp.status_code == 200
    tasks = await client.get("/api/tasks")
    assert len(tasks.json()) == 0


# ── AI Status (no Ollama expected in CI) ────────────────

@pytest.mark.asyncio
async def test_ai_status_returns_structure(client: AsyncClient):
    resp = await client.get("/api/ai/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "provider" in data
    assert "model" in data
    assert "available" in data
    assert "message" in data


# ── Documents ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_documents_crud(client: AsyncClient):
    # Create
    create = await client.post("/api/documents", json={
        "title": "Meeting notes",
        "content": "Discussed project timeline.",
    })
    assert create.status_code == 201
    doc_id = create.json()["id"]

    # List
    listing = await client.get("/api/documents")
    assert len(listing.json()) == 1

    # Get
    get = await client.get(f"/api/documents/{doc_id}")
    assert get.status_code == 200
    assert get.json()["content"] == "Discussed project timeline."

    # Delete
    delete = await client.delete(f"/api/documents/{doc_id}")
    assert delete.status_code == 204


# ── Priority Validation (unit test, no server) ──────────

def test_validate_extracted_tasks_mixed_priorities():
    """Verify that validate_extracted_tasks preserves valid priorities and normalizes invalid ones."""
    from app.ai.provider import validate_extracted_tasks

    raw = {
        "tasks": [
            {"title": "Fix production outage", "priority": "high"},
            {"title": "Update docs", "priority": "low"},
            {"title": "Refactor auth module", "priority": "medium"},
            {"title": "Bad priority", "priority": "CRITICAL"},
            {"title": "Missing priority"},
            {"title": "   ", "priority": "high"},  # blank title — should be rejected
            {"title": "Empty string priority", "priority": ""},
            "not a dict",  # malformed — should be skipped
        ],
        "key_info": ["Server uptime is 99.9%", 42, ""]
    }

    result = validate_extracted_tasks(raw)

    titles = [t["title"] for t in result["tasks"]]
    priorities = [t["priority"] for t in result["tasks"]]

    # Valid tasks preserved
    assert "Fix production outage" in titles
    assert "Update docs" in titles
    assert "Refactor auth module" in titles

    # Blank title rejected
    assert "   " not in titles

    # Valid priorities preserved
    assert priorities[titles.index("Fix production outage")] == "high"
    assert priorities[titles.index("Update docs")] == "low"
    assert priorities[titles.index("Refactor auth module")] == "medium"

    # Invalid priorities normalized to medium
    assert priorities[titles.index("Bad priority")] == "medium"
    assert priorities[titles.index("Missing priority")] == "medium"
    assert priorities[titles.index("Empty string priority")] == "medium"

    # key_info: non-string and empty entries filtered out
    assert result["key_info"] == ["Server uptime is 99.9%"]
