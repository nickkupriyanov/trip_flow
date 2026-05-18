# AGENTS.md

## Project

TripFlow is a narrow CRM for individual travel agents.

Core workflow:

Client → Travel Request → Tour Options → Proposal → Follow-up → Booking / Rejection

Do not treat this as a generic CRM. Every feature should support the travel-agent workflow.

---

## MVP Goal

The MVP is complete when a travel agent can:

1. create a client;
2. create a travel request;
3. add several tour options;
4. generate or manually create a proposal;
5. copy the proposal text for Telegram / WhatsApp;
6. move the request through pipeline statuses;
7. create a reminder;
8. see today's tasks on the dashboard.

---

## Product Rules

- Keep the product narrow.
- Optimize for daily usage by one travel agent.
- AI assists the agent but does not replace the CRM.
- Do not add post-MVP features unless explicitly requested.
- Prefer simple, useful workflows over complex abstractions.

Avoid in MVP:

- payments;
- tour operator integrations;
- online booking;
- team roles;
- WhatsApp Business API;
- PDF builder;
- complex analytics;
- mobile app.

---

## Tech Direction

Frontend:

- React;
- TypeScript;
- Vite;
- React Router;
- TanStack Query;
- React Hook Form;
- Zod;
- Tailwind CSS;
- shadcn/ui.

Backend:

- FastAPI;
- SQLAlchemy;
- Alembic;
- Pydantic;
- PostgreSQL;
- JWT auth.

Infrastructure:

- Docker;
- Docker Compose;
- environment variables for secrets.

---

## Code Rules

- Write simple, explicit, maintainable code.
- Do not over-engineer.
- Avoid unnecessary dependencies.
- Avoid `any` in TypeScript.
- Use type hints in Python.
- Keep route handlers thin.
- Put business logic into services.
- Validate input on backend and frontend.
- Never hardcode secrets.
- Never commit API keys.

---

## Domain Language

Use these terms consistently:

- User;
- Client;
- ClientPreference;
- TravelRequest;
- TourOption;
- Proposal;
- Reminder;
- CommunicationNote;
- GenerationTask.

Avoid generic CRM terms unless needed:

- Deal;
- Lead;
- Task;
- Record;
- Item.

---

## UI Direction

The UI should feel like a clean SaaS workspace with a light travel mood.

Use:

- clean layout;
- cards;
- readable tables;
- useful empty states;
- clear status badges;
- calm colors.

Avoid:

- visual noise;
- glassmorphism;
- heavy gradients;
- excessive decorative travel icons;
- vacation landing page style.

This is a working tool, not a travel magazine.

---

## AI Rules

AI-generated text must always be editable before saving or sending.

Never auto-send AI-generated messages to clients.

Never invent:

- real-time prices;
- hotel availability;
- booking status;
- factual hotel details not provided by the user or stored in the app.

AI features should focus on:

- proposal text;
- client summary;
- message rewrite;
- next questions;
- short Telegram / WhatsApp messages.

---

## Security Rules

Every user-owned entity must be scoped by the current user.

Do not rely only on frontend filtering.

Backend queries must prevent cross-user data access.

Use environment variables for secrets.

Do not log tokens or API keys.

---

## Development Order

Build in this order:

1. project scaffold;
2. auth;
3. clients;
4. travel requests;
5. pipeline;
6. tour options;
7. manual proposal builder;
8. AI generation;
9. reminders;
10. dashboard;
11. polish;
12. demo data and README.

Do not start with AI before the core CRM flow works.

---

## Definition of Done

A feature is done when:

- UI is implemented;
- API is implemented if needed;
- loading state exists;
- error state exists;
- empty state exists where relevant;
- validation exists;
- user data is scoped correctly;
- naming matches the domain;
- basic manual testing is done.