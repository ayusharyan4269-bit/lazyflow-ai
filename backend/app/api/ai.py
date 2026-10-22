"""LazyFlow AI - AI API routes"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.models.database import SourceDocument, AnalysisRun, AnalysisStatus
from app.schemas.api import (
    AnalyzeRequest, AnalyzeResponse,
    SummarizeRequest, SummarizeResponse,
    FollowUpRequest, FollowUpResponse,
    AIStatusResponse,
)
from app.ai.provider import (
    get_provider, extract_tasks, summarize_text, draft_followup,
    AIProviderError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/status", response_model=AIStatusResponse)
async def ai_status():
    """Check AI provider status and model availability."""
    provider = get_provider()
    status = await provider.check_status()
    return AIStatusResponse(
        provider=settings.ai_provider,
        model=settings.ai_model,
        base_url=settings.ai_base_url,
        available=status["available"],
        message=status["message"],
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_text(req: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    """Analyze text: extract tasks, key info, and generate summary."""
    # Save source document
    doc = SourceDocument(
        title=req.title,
        content=req.content,
        category=req.category,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)

    # Create analysis run record
    run = AnalysisRun(
        source_document_id=doc.id,
        operation_type="extract_tasks",
        status=AnalysisStatus.RUNNING,
        model_identifier=settings.ai_model,
    )
    db.add(run)
    await db.flush()

    try:
        # Extract tasks
        result = await extract_tasks(req.content)

        # Generate summary
        summary = await summarize_text(req.content, style="key_points")

        # Update analysis run
        run.status = AnalysisStatus.COMPLETED
        await db.flush()

        return AnalyzeResponse(
            summary=summary,
            tasks=result["tasks"],
            key_info=result["key_info"],
            document_id=doc.id,
        )

    except AIProviderError as e:
        run.status = AnalysisStatus.FAILED
        run.error_summary = str(e)[:500]
        await db.flush()
        raise HTTPException(
            status_code=503,
            detail=str(e),
        )
    except Exception as e:
        run.status = AnalysisStatus.FAILED
        run.error_summary = f"Unexpected error: {type(e).__name__}"
        await db.flush()
        logger.exception("Unexpected error during analysis")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during analysis. Please try again.",
        )


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(req: SummarizeRequest):
    """Generate a summary of the provided text."""
    try:
        summary = await summarize_text(req.content, style=req.style)
        return SummarizeResponse(summary=summary, style=req.style)
    except AIProviderError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        logger.exception("Unexpected error during summarization")
        raise HTTPException(status_code=500, detail="Summarization failed unexpectedly.")


@router.post("/draft-followup", response_model=FollowUpResponse)
async def followup(req: FollowUpRequest):
    """Draft a follow-up message."""
    try:
        draft = await draft_followup(
            context=req.context,
            task_title=req.task_title,
            tone=req.tone,
        )
        return FollowUpResponse(draft=draft, tone=req.tone)
    except AIProviderError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        logger.exception("Unexpected error during follow-up drafting")
        raise HTTPException(status_code=500, detail="Follow-up drafting failed unexpectedly.")
