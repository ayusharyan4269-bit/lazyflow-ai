"""LazyFlow AI - Pydantic schemas for API validation"""

from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


# --- Task Schemas ---

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: str = Field(default="medium")
    due_date: Optional[str] = None
    category: Optional[str] = None
    source_context: Optional[str] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        allowed = {"high", "medium", "low"}
        v_lower = v.lower().strip()
        if v_lower not in allowed:
            return "medium"
        return v_lower


class TaskCreate(TaskBase):
    source_document_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    category: Optional[str] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = {"high", "medium", "low"}
        v_lower = v.lower().strip()
        if v_lower not in allowed:
            return "medium"
        return v_lower

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = {"pending", "completed"}
        v_lower = v.lower().strip()
        if v_lower not in allowed:
            return "pending"
        return v_lower


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    priority: str
    status: str
    due_date: Optional[str]
    category: Optional[str]
    source_context: Optional[str]
    source_document_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Document Schemas ---

class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=50000)
    category: Optional[str] = Field(None, max_length=50)


class DocumentResponse(BaseModel):
    id: int
    title: str
    content: str
    category: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentListItem(BaseModel):
    id: int
    title: str
    category: Optional[str]
    content_preview: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- AI Schemas ---

class AnalyzeRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=50000)
    category: Optional[str] = Field(None, max_length=50)


class SummarizeRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=50000)
    style: str = Field(default="key_points")

    @field_validator("style")
    @classmethod
    def validate_style(cls, v: str) -> str:
        allowed = {"quick_overview", "key_points", "meeting_summary", "study_notes", "project_update"}
        if v not in allowed:
            return "key_points"
        return v


class FollowUpRequest(BaseModel):
    context: str = Field(..., min_length=1, max_length=10000)
    task_title: Optional[str] = None
    tone: str = Field(default="professional")

    @field_validator("tone")
    @classmethod
    def validate_tone(cls, v: str) -> str:
        allowed = {"professional", "friendly", "concise"}
        if v not in allowed:
            return "professional"
        return v


class ExtractedTask(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: str = Field(default="medium")
    due_date: Optional[str] = None
    category: Optional[str] = None
    source_context: Optional[str] = None


class AnalyzeResponse(BaseModel):
    summary: str
    tasks: list[ExtractedTask]
    key_info: list[str]
    document_id: int


class SummarizeResponse(BaseModel):
    summary: str
    style: str


class FollowUpResponse(BaseModel):
    draft: str
    tone: str


class AIStatusResponse(BaseModel):
    provider: str
    model: str
    base_url: str
    available: bool
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str
