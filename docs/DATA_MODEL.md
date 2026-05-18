# Data Model

All user-owned records must be scoped by `userId` directly or through a parent record that belongs to the current user.

## User

```ts
type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};
```

## Client

```ts
type Client = {
  id: string;
  userId: string;
  fullName: string;
  phone?: string;
  email?: string;
  telegram?: string;
  whatsapp?: string;
  city?: string;
  source?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

## ClientPreference

```ts
type ClientPreference = {
  id: string;
  clientId: string;
  preferredDestinations: string[];
  dislikedDestinations: string[];
  preferredHotelLevel?: "3*" | "4*" | "5*" | "luxury";
  mealPreferences: string[];
  travelStyle: string[];
  importantFactors: string[];
  avoidFactors: string[];
  averageBudgetMin?: number;
  averageBudgetMax?: number;
  createdAt: string;
  updatedAt: string;
};
```

## TravelRequest

```ts
type TravelRequestStatus =
  | "new"
  | "clarifying"
  | "searching"
  | "sent"
  | "thinking"
  | "booked"
  | "rejected";

type TravelRequest = {
  id: string;
  userId: string;
  clientId: string;
  status: TravelRequestStatus;
  destination?: string;
  departureCity?: string;
  dateFrom?: string;
  dateTo?: string;
  nightsFrom?: number;
  nightsTo?: number;
  adults: number;
  children: number;
  childrenAges: number[];
  budgetMin?: number;
  budgetMax?: number;
  travelType?: string;
  wishes?: string;
  restrictions?: string;
  internalComment?: string;
  createdAt: string;
  updatedAt: string;
};
```

## TourOption

```ts
type Currency = "RUB" | "USD" | "EUR";

type TourOption = {
  id: string;
  requestId: string;
  title: string;
  country?: string;
  resort?: string;
  hotelName?: string;
  hotelStars?: number;
  dateFrom?: string;
  dateTo?: string;
  nights?: number;
  roomType?: string;
  mealType?: string;
  price?: number;
  currency: Currency;
  link?: string;
  pros: string[];
  cons: string[];
  agentComment?: string;
  isRecommended: boolean;
  createdAt: string;
  updatedAt: string;
};
```

## Proposal

```ts
type ProposalFormat = "telegram" | "whatsapp" | "email";

type Proposal = {
  id: string;
  requestId: string;
  title: string;
  content: string;
  format: ProposalFormat;
  createdAt: string;
  updatedAt: string;
};
```

## Reminder

```ts
type ReminderStatus = "active" | "done";

type Reminder = {
  id: string;
  userId: string;
  clientId?: string;
  requestId?: string;
  title: string;
  description?: string;
  dueAt: string;
  status: ReminderStatus;
  createdAt: string;
  updatedAt: string;
};
```

## CommunicationNote

```ts
type CommunicationNoteType = "note" | "call" | "telegram" | "whatsapp" | "email";

type CommunicationNote = {
  id: string;
  clientId: string;
  requestId?: string;
  type: CommunicationNoteType;
  content: string;
  createdAt: string;
};
```

## GenerationTask

```ts
type GenerationTaskType =
  | "proposal"
  | "client_summary"
  | "message_template"
  | "next_questions"
  | "rewrite_message";

type GenerationTaskStatus = "pending" | "processing" | "done" | "failed";

type GenerationTask = {
  id: string;
  userId: string;
  requestId?: string;
  clientId?: string;
  type: GenerationTaskType;
  status: GenerationTaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
};
```

## Relationships

- `User` has many `Client`, `TravelRequest`, `Reminder`, and `GenerationTask` records.
- `Client` has one optional `ClientPreference`.
- `Client` has many `TravelRequest`, `Reminder`, and `CommunicationNote` records.
- `TravelRequest` has many `TourOption`, `Proposal`, `Reminder`, `CommunicationNote`, and `GenerationTask` records.
- `TourOption` belongs to one `TravelRequest`.
- `Proposal` belongs to one `TravelRequest`.
