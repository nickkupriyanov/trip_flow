# Qui-Quo Tour Option Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a travel agent paste a Qui-Quo подборка URL into a travel request and import every parsed tour as `TourOption` records.

**Architecture:** Add a focused backend parser/import service that validates Qui-Quo URLs, fetches HTML, parses `section.tour` blocks, and creates options under the already-owned request. Expose it through the existing tour option router and add a compact frontend import form inside `TourOptionsPanel`.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, React, TypeScript, TanStack Query, Tailwind/shadcn UI.

---

## File Map

- Create `backend/app/services/qui_quo_import.py`: URL validation, HTML fetch, standard-library HTML parsing, and mapping to `TourOptionCreate`.
- Modify `backend/app/schemas/tour_option.py`: import request/response schemas.
- Modify `backend/app/api/tour_options.py`: `POST /requests/{request_id}/options/import`.
- Modify `backend/app/services/tour_options.py`: batch creation helper for parsed payloads.
- Modify `backend/tests/test_tour_options.py`: parser and API coverage.
- Modify `frontend/src/lib/api.ts`: import types and client function.
- Modify `frontend/src/pages/travel-request-detail/TourOptionsPanel.tsx`: import form, mutation, loading/error/success states.

## Task 1: Backend Parser

**Files:**
- Create: `backend/app/services/qui_quo_import.py`
- Test: `backend/tests/test_tour_options.py`

- [ ] **Step 1: Write parser tests**

Add tests that call `parse_qui_quo_tour_options(html, source_url=...)` with a small HTML sample containing two `section class="tour"` blocks. Assert parsed title, country, resort, stars, dates, nights, meal, room, price, currency, link, pros, and agent comment.

- [ ] **Step 2: Run parser tests and verify they fail**

Run: `cd backend && pytest tests/test_tour_options.py::test_parse_qui_quo_tour_options_extracts_options -v`

Expected: import failure because `app.services.qui_quo_import` does not exist.

- [ ] **Step 3: Implement parser**

Use `html.parser.HTMLParser`, `urllib.parse`, `re`, and `datetime.date`. Keep optional fields nullable when parsing fails. Validate only `https://qui-quo.ru/...`.

- [ ] **Step 4: Run parser tests and verify they pass**

Run: `cd backend && pytest tests/test_tour_options.py::test_parse_qui_quo_tour_options_extracts_options -v`

Expected: pass.

## Task 2: Backend Import API

**Files:**
- Modify: `backend/app/schemas/tour_option.py`
- Modify: `backend/app/services/tour_options.py`
- Modify: `backend/app/api/tour_options.py`
- Test: `backend/tests/test_tour_options.py`

- [ ] **Step 1: Write API tests**

Add tests for unsupported URL rejection, empty parsed page, successful import, and current-user request scoping. Monkeypatch the fetch function so tests do not use the network.

- [ ] **Step 2: Run API tests and verify they fail**

Run: `cd backend && pytest tests/test_tour_options.py -k "import" -v`

Expected: fail because the endpoint and schemas do not exist yet.

- [ ] **Step 3: Add schemas**

Add `TourOptionImportRequest` with `url: str` and `TourOptionImportResult` with `created_count: int` plus `options: list[TourOptionRead]`.

- [ ] **Step 4: Add service and route**

Add batch creation in `tour_options.py` and a route that resolves ownership with `owned_request_or_404`, fetches/parses Qui-Quo, creates every parsed option, and returns created records.

- [ ] **Step 5: Run API tests and verify they pass**

Run: `cd backend && pytest tests/test_tour_options.py -k "import" -v`

Expected: pass.

## Task 3: Frontend Import Form

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/pages/travel-request-detail/TourOptionsPanel.tsx`

- [ ] **Step 1: Add API client types**

Add `ImportTourOptionsInput`, `ImportTourOptionsOutput`, and `importTourOptions(token, requestId, payload)`.

- [ ] **Step 2: Add form state and mutation**

Add URL, error, and success count state in `TourOptionsPanel`. Use `useMutation` to call `importTourOptions`, clear the URL on success, and invalidate `queryKeys.tourOptions(requestId)`.

- [ ] **Step 3: Add UI**

Render a compact bordered import form above the manual create form. Disable submit while pending or URL is blank. Show loading text, error alert, and success message.

- [ ] **Step 4: Run frontend build**

Run: `cd frontend && npm run build`

Expected: TypeScript and Vite build pass.

## Task 4: Verification

**Files:**
- Potentially update files touched by earlier tasks only.

- [ ] **Step 1: Run backend tests**

Run: `cd backend && pytest tests/test_tour_options.py -v`

Expected: all tour option tests pass.

- [ ] **Step 2: Run focused full checks**

Run: `cd backend && pytest -q`

Expected: backend suite passes.

- [ ] **Step 3: Run frontend build**

Run: `cd frontend && npm run build`

Expected: frontend build passes.

- [ ] **Step 4: Final review**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only intended implementation files plus this plan are changed.
