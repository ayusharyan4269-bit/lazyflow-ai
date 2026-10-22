# Contributing to LazyFlow AI

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository and clone your fork.
2. Follow the [Quick Start](README.md#quick-start) instructions.
3. Create a feature branch: `git checkout -b my-feature`
4. Make your changes and verify:
   - Backend tests pass: `cd backend && python -m pytest tests/ -v`
   - Frontend compiles: `cd frontend && npx tsc -b --noEmit`
   - Frontend builds: `npm run build`
5. Commit with a clear message and open a pull request.

## Guidelines

- Keep changes focused — one feature or fix per PR.
- Add tests for new backend endpoints or logic changes.
- Do not commit `.env` files, database files, model weights, or `node_modules`.
- Do not add external API calls without discussion — this is a local-first application.
- Do not add analytics or telemetry.

## Reporting Issues

Open a GitHub issue with:
- Steps to reproduce
- Expected vs. actual behavior
- OS, Python version, Node version, and GPU (if relevant)

## Code Style

- **Python:** Follow PEP 8. Run `ruff check .` from `backend/`.
- **TypeScript:** Follow the existing patterns. Run `npx tsc -b --noEmit` from `frontend/`.
