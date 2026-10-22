"""LazyFlow AI - SQLAlchemy database models"""

import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    pass


class TaskPriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"


class AnalysisStatus(str, enum.Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class SourceDocument(Base):
    __tablename__ = "source_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    tasks = relationship("Task", back_populates="source_document", cascade="all, delete-orphan")
    analysis_runs = relationship("AnalysisRun", back_populates="source_document", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(SAEnum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)
    status = Column(SAEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    due_date = Column(String(50), nullable=True)  # Stored as string to preserve ambiguous dates
    category = Column(String(50), nullable=True)
    source_context = Column(Text, nullable=True)
    source_document_id = Column(Integer, ForeignKey("source_documents.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    source_document = relationship("SourceDocument", back_populates="tasks")


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_document_id = Column(Integer, ForeignKey("source_documents.id"), nullable=False)
    operation_type = Column(String(30), nullable=False)  # "extract_tasks", "summarize", etc.
    status = Column(SAEnum(AnalysisStatus), default=AnalysisStatus.RUNNING, nullable=False)
    model_identifier = Column(String(100), nullable=True)
    error_summary = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    source_document = relationship("SourceDocument", back_populates="analysis_runs")
