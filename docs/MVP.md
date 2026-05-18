# TripFlow MVP

## Goal

Build a working CRM flow for one individual travel agent.

The MVP is done when an agent can manage a client from first request to proposal, follow-up, and booking or rejection.

## Core Flow

1. Create a `Client`.
2. Create a `TravelRequest`.
3. Fill trip parameters and client wishes.
4. Add 2-5 `TourOption` records.
5. Create a `Proposal` manually or with AI.
6. Edit and copy proposal text for Telegram / WhatsApp.
7. Move the request through pipeline statuses.
8. Create a `Reminder`.
9. See today's reminders on the dashboard.

## MVP Statuses

- `new`
- `clarifying`
- `searching`
- `sent`
- `thinking`
- `booked`
- `rejected`

## In Scope

- Authentication.
- Clients and client preferences.
- Travel requests.
- Pipeline board.
- Tour options.
- Manual proposal builder.
- AI proposal generation.
- Communication notes.
- Reminders.
- Dashboard with today's work.
- Demo data.

## Required Screens

- Dashboard.
- Pipeline.
- Clients list.
- Client detail.
- Travel request detail.
- Proposal builder.
- Reminders list.

## Out of Scope

- Payments.
- Tour operator integrations.
- Online booking.
- WhatsApp Business API.
- Team roles.
- Mobile app.
- PDF export.
- Advanced analytics.

## Definition of Done

Each feature is done when:

- UI is implemented.
- API is implemented when needed.
- Loading, error, and empty states exist.
- Backend and frontend validation exist.
- User-owned data is scoped to the current user.
- Domain naming matches `AGENTS.md`.
- Basic manual testing is complete.
