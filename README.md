# LazyFlow AI

> Stop repeating yourself. Let your local AI handle the boring work.

LazyFlow AI is a **local-first** productivity assistant that turns messy notes, meeting discussions, and project updates into **organized, actionable tasks** — powered by an open-weight language model running on your own machine.

---

## Features

- **Smart Inbox** — Paste any unstructured text (lecture notes, meeting minutes, project chats). AI extracts tasks, generates a summary, and highlights key information.
- **Task Extraction** — Structured action items with title, description, priority, due date, category, and source context — all validated before saving.
- **Intelligent Summaries** — Multiple styles: quick overview, key points, meeting summary, study notes, project update.
- **Review Before Saving** — Edit, remove, or re-prioritize AI suggestions before committing to your task list.
- **Task Dashboard** — Real-time stats, recent tasks, and source documents. Filter by status, priority, or search.
- **Task Manager** — Full CRUD with inline editing, status toggling, delete confirmation, and follow-up drafting.
- **Follow-up Drafts** — AI-drafted follow-up messages in professional, friendly, or concise tones. Copy to clipboard.
- **Demo Mode** — Sample student project meeting notes to try the workflow instantly.
- **Privacy Controls** — Settings page shows model status, setup instructions, and a one-click workspace wipe (with confirmation).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Lucide icons |
| Backend | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2 (async), aiosqlite |
| AI | Ollama + `qwen2.5:3b` (Apache 2.0, ~2 GB download) |
| Storage | SQLite (local file, auto-created) |

## Prerequisites

- **Node.js** ≥ 18 and npm
- **Python** ≥ 3.11
- **Ollama** — [ollama.ai](https://ollama.ai)
- **GPU (recommended):** NVIDIA GPU with ≥ 4 GB VRAM for faster inference. CPU-only works but is slower.

## Quick Start

### 1. Clone

```bash
git clone https://github.com/ayusharyan4269-bit/lazyflow-ai.git
cd lazyflow-ai
```

### 2. Install & start Ollama

```bash
# Install from https://ollama.ai, then:
ollama serve            # Start the runtime (keep this terminal open)
ollama pull qwen2.5:3b  # Download the model (~2 GB)
```

### 3. Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -e ".[dev]"
pip install greenlet      # Required for SQLAlchemy async on some platforms

# (Optional) Copy and edit environment config
cp ../.env.example .env

# Start the backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The SQLite database is auto-created at `backend/app/data/lazyflow.db` on first startup.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### 5. Verify

- Dashboard should load with an empty-state onboarding message.
- Settings page → **Test Connection** should show the model as ready (green).
- Smart Inbox → **Load Demo** → **Analyze with AI** → review extracted tasks → save.

## Environment Variables

All optional. Defaults work out of the box with a local Ollama install.

| Variable | Default | Description |
|----------|---------|-------------|
| `LAZYFLOW_AI_PROVIDER` | `ollama` | AI runtime |
| `LAZYFLOW_AI_MODEL` | `qwen2.5:3b` | Model identifier |
| `LAZYFLOW_AI_BASE_URL` | `http://localhost:11434` | Ollama endpoint |
| `LAZYFLOW_AI_REQUEST_TIMEOUT` | `120` | Seconds before timeout |
| `LAZYFLOW_AI_MAX_TOKENS` | `4096` | Max generation length |
| `LAZYFLOW_DEBUG` | `false` | Verbose logging |

See [`.env.example`](.env.example) for the full list.

## Architecture

```
User (Browser)
     │
     ▼
┌──────────────┐   Vite proxy /api/*   ┌──────────────────┐
│  React SPA   │ ───────────────────►  │  FastAPI Backend  │
│  (port 5173) │                       │  (port 8000)      │
└──────────────┘                       └────────┬─────────┘
                                                │
                              ┌─────────────────┼───────────────┐
                              ▼                 ▼               ▼
                    ┌──────────────┐   ┌──────────────┐  ┌───────────┐
                    │ Ollama       │   │ SQLite DB    │  │ Pydantic  │
                    │ (localhost   │   │ (local file) │  │ Validation│
                    │  :11434)     │   └──────────────┘  └───────────┘
                    └──────────────┘
```

- **All AI processing is local.** Text is sent to Ollama on `localhost`; nothing leaves your machine.
- **Structured output validation:** Model JSON is parsed, validated against a strict schema, and sanitized before reaching the database.
- **Provider abstraction:** The `OllamaProvider` class can be replaced with any compatible backend.

## AI Model

| Property | Value |
|----------|-------|
| Model | `qwen2.5:3b` |
| License | Apache 2.0 |
| Source | [Qwen on Ollama](https://ollama.com/library/qwen2.5:3b) |
| Size | ~2 GB (Q4_K_M quantization) |
| Runtime | Ollama |
| VRAM | ~3 GB recommended |

The model is instruction-tuned and produces structured JSON for task extraction. Summaries and follow-ups are generated as plain text.

## Testing

```bash
# Backend (from backend/ with venv active)
python -m pytest tests/ -v

# Frontend type-check
cd frontend && npx tsc -b --noEmit

# Frontend production build
npm run build
```

## Privacy & Data Handling

- **Local only:** All AI inference runs via Ollama on `localhost`. No data is sent to external APIs.
- **No telemetry:** No analytics, tracking, or usage reporting.
- **No accounts:** No authentication, no personal data collection.
- **Storage:** Tasks and documents are stored in a local SQLite file (`backend/app/data/lazyflow.db`).
- **Clear data:** Settings page → "Clear All Data" (requires confirmation).
- **Network:** The only network call is to your local Ollama instance. The Google Fonts CDN is loaded for the Inter typeface.

## Known Limitations

- **Single user:** No authentication or multi-user support. Designed for personal local use.
- **Model quality:** `qwen2.5:3b` is a compact model. Extraction accuracy varies with input complexity. Larger models (7B+) improve results but require more VRAM.
- **Dates:** Ambiguous dates (e.g., "next Friday") are preserved as-is. The app does not resolve relative dates.
- **Inference speed:** First request after model load may take 30–60 seconds. Subsequent requests are faster.
- **No offline fonts:** The Inter font requires an initial internet connection to load from Google Fonts.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE).

---

Built for the [Hacktoberfest Open-Source AI Challenge](https://dev.to/challenges/hacktoberfest-week3-2026-10-19).
