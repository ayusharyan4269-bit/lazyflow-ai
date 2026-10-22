"""LazyFlow AI - Task API routes"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.database import Task, TaskPriority, TaskStatus
from app.schemas.api import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    search: str | None = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
):
    """List tasks with optional filtering, search, and sorting."""
    query = select(Task)

    if status:
        try:
            query = query.where(Task.status == TaskStatus(status.lower()))
        except ValueError:
            pass

    if priority:
        try:
            query = query.where(Task.priority == TaskPriority(priority.lower()))
        except ValueError:
            pass

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (Task.title.ilike(search_term)) | (Task.description.ilike(search_term))
        )

    # Sorting
    sort_column = getattr(Task, sort_by, Task.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    result = await db.execute(query)
    tasks = result.scalars().all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/stats")
async def task_stats(db: AsyncSession = Depends(get_db)):
    """Get task statistics for the dashboard."""
    total = await db.scalar(select(func.count(Task.id)))
    pending = await db.scalar(
        select(func.count(Task.id)).where(Task.status == TaskStatus.PENDING)
    )
    completed = await db.scalar(
        select(func.count(Task.id)).where(Task.status == TaskStatus.COMPLETED)
    )
    high_priority = await db.scalar(
        select(func.count(Task.id)).where(
            Task.priority == TaskPriority.HIGH,
            Task.status == TaskStatus.PENDING,
        )
    )

    return {
        "total": total or 0,
        "pending": pending or 0,
        "completed": completed or 0,
        "high_priority": high_priority or 0,
    }


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(task_in: TaskCreate, db: AsyncSession = Depends(get_db)):
    """Create a new task."""
    task = Task(
        title=task_in.title,
        description=task_in.description,
        priority=TaskPriority(task_in.priority),
        due_date=task_in.due_date,
        category=task_in.category,
        source_context=task_in.source_context,
        source_document_id=task_in.source_document_id,
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.post("/batch", response_model=list[TaskResponse], status_code=201)
async def create_tasks_batch(tasks_in: list[TaskCreate], db: AsyncSession = Depends(get_db)):
    """Create multiple tasks at once (used after review)."""
    if len(tasks_in) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 tasks per batch.")

    created = []
    for task_in in tasks_in:
        task = Task(
            title=task_in.title,
            description=task_in.description,
            priority=TaskPriority(task_in.priority),
            due_date=task_in.due_date,
            category=task_in.category,
            source_context=task_in.source_context,
            source_document_id=task_in.source_document_id,
        )
        db.add(task)
        await db.flush()
        await db.refresh(task)
        created.append(TaskResponse.model_validate(task))

    return created


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single task by ID."""
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, task_in: TaskUpdate, db: AsyncSession = Depends(get_db)):
    """Update a task."""
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "priority" and value is not None:
            value = TaskPriority(value)
        elif field == "status" and value is not None:
            value = TaskStatus(value)
        setattr(task, field, value)

    await db.flush()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a task."""
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    await db.delete(task)
