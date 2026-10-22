"""LazyFlow AI - Document API routes"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.database import SourceDocument
from app.schemas.api import DocumentCreate, DocumentResponse, DocumentListItem

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=list[DocumentListItem])
async def list_documents(db: AsyncSession = Depends(get_db)):
    """List all source documents (preview only)."""
    result = await db.execute(
        select(SourceDocument).order_by(SourceDocument.created_at.desc())
    )
    docs = result.scalars().all()
    items = []
    for d in docs:
        items.append(DocumentListItem(
            id=d.id,
            title=d.title,
            category=d.category,
            content_preview=d.content[:150] + "..." if len(d.content) > 150 else d.content,
            created_at=d.created_at,
        ))
    return items


@router.post("", response_model=DocumentResponse, status_code=201)
async def create_document(doc_in: DocumentCreate, db: AsyncSession = Depends(get_db)):
    """Create a new source document."""
    doc = SourceDocument(
        title=doc_in.title,
        content=doc_in.content,
        category=doc_in.category,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single document."""
    doc = await db.get(SourceDocument, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentResponse.model_validate(doc)


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a document and its associated tasks."""
    doc = await db.get(SourceDocument, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    await db.delete(doc)
