# LazyFlow AI — Implementation Plan

## Environment
| Item | Value |
|------|-------|
| OS | Windows 11 |
| RAM | 16 GB |
| GPU | RTX 3050 6GB VRAM |
| Disk Free | 115.8 GB |
| Node | v22.23.2 |
| Python | 3.13.7 |
| Ollama | Not installed — will install |
| Model | qwen2.5:3b (Q4_K_M, ~2GB, Apache 2.0 license) |

## Build Phases

### Phase 1: Project Setup ✦
- Git init, .gitignore
- Backend: FastAPI + SQLite + Pydantic
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Verify both start

### Phase 2: AI Integration ✦
- Install Ollama, pull qwen2.5:3b
- AI provider abstraction (OllamaProvider)
- Prompt templates for extraction, summarization, follow-up
- Structured output validation

### Phase 3: Data Layer ✦
- SQLite models: SourceDocument, Task, AnalysisRun
- CRUD API endpoints
- Persistence verification

### Phase 4: Core UI ✦
- Dashboard, Smart Inbox, Results Review, Task Manager, Settings
- Connect to real backend APIs
- Demo mode with sample data

### Phase 5: Polish & Testing
- Error handling, loading states, empty states
- Backend pytest suite
- Frontend tests
- Security review

### Phase 6: Documentation & Submission
- README, ARCHITECTURE, PRIVACY, CONTRIBUTING, SECURITY
- Screenshots
- SUBMISSION.md for DEV.to
