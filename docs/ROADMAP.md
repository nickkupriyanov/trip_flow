# Roadmap

## 1. Project Scaffold

- Create frontend app with React, TypeScript, and Vite.
- Create backend app with FastAPI.
- Add Docker Compose with PostgreSQL.
- Add `.env.example`.
- Add base app layout.

## 2. Auth

- Add user model and migrations.
- Add register, login, and current user endpoints.
- Add JWT auth.
- Protect frontend routes.

## 3. Clients

- Add `Client` model, schemas, and API.
- Add client list, search, create, edit, and delete.
- Add client detail page.
- Add user-scoped queries.

## 4. Travel Requests

- Add `TravelRequest` model, schemas, and API.
- Create requests from client detail.
- Add request detail page.
- Add travel fields, wishes, restrictions, and internal comment.

## 5. Pipeline

- Add pipeline API grouped by request status.
- Add Kanban board.
- Add request cards.
- Support status updates and drag-and-drop.

## 6. Tour Options

- Add `TourOption` model, schemas, and API.
- Add CRUD inside request detail.
- Support pros, cons, price, link, and agent comment.
- Allow one recommended option per request.

## 7. Manual Proposal Builder

- Add `Proposal` model, schemas, and API.
- Add editable proposal builder.
- Add preview.
- Add copy-to-clipboard for Telegram / WhatsApp text.

## 8. AI Generation

- Add AI service behind environment-based API keys.
- Generate editable proposal text.
- Generate short messages, client summary, next questions, and rewrites.
- Save AI attempts as `GenerationTask`.

## 9. Reminders

- Add `Reminder` model, schemas, and API.
- Link reminders to clients and optional requests.
- Add today and overdue lists.
- Add mark-as-done action.

## 10. Dashboard

- Show today's reminders.
- Show new requests.
- Show requests in progress.
- Show recent clients.
- Keep widgets focused on daily agent work.

## 11. Polish

- Add useful empty states.
- Add loading and error states.
- Add demo seed data.
- Add screenshots to README.
- Verify Docker Compose startup.
