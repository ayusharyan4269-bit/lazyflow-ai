# Security Policy

## Scope

LazyFlow AI is designed as a **local development tool**. It is not intended to be deployed on a public network without additional hardening.

## Reporting a Vulnerability

If you discover a security issue, please report it by opening a GitHub issue or emailing the maintainer directly. Do not include exploit details in public issues.

## Design Considerations

- **Local-only inference:** All AI requests go to `localhost` (Ollama). No data is sent to external services.
- **No authentication:** The app has no user accounts. It trusts the local machine operator.
- **CORS:** Restricted to `localhost` development origins.
- **Input validation:** All API inputs are validated with Pydantic (field lengths, allowed values).
- **AI output validation:** Model responses are parsed, schema-validated, and sanitized before reaching the database.
- **No shell access:** The AI model cannot execute commands or access the filesystem.
- **Destructive actions:** Workspace clear requires an explicit POST request; the frontend requires a confirmation dialog.

## Known Limitations

- The backend binds to `127.0.0.1` by default. Binding to `0.0.0.0` would expose it on the local network without authentication.
- SQLite database files are not encrypted.
- No rate limiting is implemented (acceptable for single-user local use).
- Prompt injection: The system prompts instruct the model to ignore instructions embedded in user text, but this is not a security guarantee.
