# AI Rules

AI helps the travel agent write and summarize. It does not replace the CRM workflow.

## MVP Capabilities

- Generate editable proposal text.

## Planned AI Capabilities

These are useful after the core MVP is stable, but they are not implemented in
the current polish stage:

- Generate short Telegram / WhatsApp messages.
- Generate client summary.
- Suggest next questions for incomplete travel requests.
- Rewrite an agent message in a clearer tone.

## Safety Rules

- AI output must be editable before saving or copying.
- AI must never auto-send messages to clients.
- AI must not invent real-time prices.
- AI must not invent hotel availability.
- AI must not invent booking status.
- AI must not invent factual hotel details missing from stored data or user input.
- Secrets and API keys must come from environment variables.

## Proposal Generation

Input should include:

- client name and preferences;
- travel request parameters;
- selected tour options;
- desired tone.

Output should include:

```ts
type ProposalGenerationOutput = {
  title: string;
  message: string;
  recommendedOptionId?: string;
  shortSummary: string;
};
```

## GenerationTask

Each AI request should be saved as `GenerationTask` when useful for debugging or audit.

Do not store raw secrets, access tokens, or provider credentials in `GenerationTask.input`, `output`, or `error`.
