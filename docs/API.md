# API

All endpoints require authentication unless marked public.

## Ownership Rules

- Every query must be scoped to the current user.
- Nested resources must verify that the parent belongs to the current user.
- Frontend filtering is not a security boundary.
- Tokens, API keys, and secrets must never be logged.

## Auth

Public:

```http
POST /auth/register
POST /auth/login
```

Authenticated:

```http
GET /auth/me
```

## Clients

```http
GET /clients
POST /clients
GET /clients/{client_id}
PATCH /clients/{client_id}
DELETE /clients/{client_id}
```

## Client Preferences

```http
GET /clients/{client_id}/preferences
PUT /clients/{client_id}/preferences
```

## Travel Requests

```http
GET /requests
POST /requests
GET /requests/{request_id}
PATCH /requests/{request_id}
DELETE /requests/{request_id}
GET /clients/{client_id}/requests
PATCH /requests/{request_id}/status
```

## Pipeline

```http
GET /pipeline
```

Returns travel requests grouped by `TravelRequestStatus`.

## Tour Options

```http
GET /requests/{request_id}/options
POST /requests/{request_id}/options
PATCH /options/{option_id}
DELETE /options/{option_id}
```

## Proposals

```http
GET /requests/{request_id}/proposals
POST /requests/{request_id}/proposals
PATCH /proposals/{proposal_id}
DELETE /proposals/{proposal_id}
```

## Reminders

```http
GET /reminders
POST /reminders
PATCH /reminders/{reminder_id}
DELETE /reminders/{reminder_id}
PATCH /reminders/{reminder_id}/done
```

Recommended filters:

- `status`
- `due_from`
- `due_to`
- `client_id`
- `request_id`

## Communication Notes

```http
GET /clients/{client_id}/notes
POST /clients/{client_id}/notes
GET /requests/{request_id}/notes
PATCH /notes/{note_id}
DELETE /notes/{note_id}
```

## AI

```http
POST /ai/generate-proposal
POST /ai/client-summary
POST /ai/message-template
POST /ai/next-questions
POST /ai/rewrite-message
```

AI endpoints return editable draft content and may create `GenerationTask` records.
