# Qui-Quo Tour Option Import Design

## Context

TripFlow stores candidate tours as `TourOption` records inside a `TravelRequest`.
Travel agents often already have a public Qui-Quo подборка link that contains
several tour options. The MVP should let the agent import those options into the
current request without turning TripFlow into a broad tour-operator integration.

Example source URL: `https://qui-quo.ru/CZ22-SU39`.

## Goal

Add a narrow import action on the travel request detail page:

1. The agent opens a `TravelRequest`.
2. In the "Варианты тура" panel, the agent enters a Qui-Quo подборка URL.
3. TripFlow imports every tour option found on that page.
4. The newly created options appear in the existing tour options list.

The import should save what the source page provides. It must not infer real-time
availability, booking status, or hotel facts beyond the source content.

## Non-Goals

- No tour operator account integration.
- No live price or availability sync.
- No automatic proposal generation from the import.
- No duplicate detection in the first version.
- No preview or checkbox selection flow; all parsed options are imported.
- No deletion or replacement of existing `TourOption` records.

## User Experience

The existing `TourOptionsPanel` gets a compact import form near the manual
"Добавить вариант" action.

The form contains:

- a URL input with a placeholder like `https://qui-quo.ru/CZ22-SU39`;
- an "Импортировать" button;
- loading text while the import runs;
- an error alert if the URL cannot be imported;
- a success message with the number of created options.

After successful import:

- the URL field is cleared;
- the tour options query is invalidated;
- the existing list refreshes and shows the imported options;
- existing manually created options remain in place.

## Backend API

Add:

`POST /requests/{request_id}/options/import`

Request body:

```json
{
  "url": "https://qui-quo.ru/CZ22-SU39"
}
```

Response body:

```json
{
  "createdCount": 6,
  "options": []
}
```

`options` contains the created `TourOptionRead` records.

Authorization follows the existing request ownership rule:

- resolve the request with `owned_request_or_404`;
- create options only under that request;
- do not accept a request id from the parsed source.

## Source Validation

The first version accepts only `https://qui-quo.ru/...` URLs.

Invalid or unsupported URLs return `422`.
Fetch failures return a clear client-facing error.
If the page is reachable but contains no tour sections, return an error instead
of creating an empty import.

## Parsing Rules

The parser reads the HTML and extracts every `section.tour`.

Map source fields to `TourOptionCreate`:

- `title`: hotel name without the leading list number and star suffix when possible;
- `hotelName`: same clean hotel name;
- `hotelStars`: trailing `3*`, `4*`, or `5*` in the hotel title;
- `country`: first part of `.country`;
- `resort`: second part of `.country`;
- `dateFrom`, `dateTo`: parsed from `.dates`;
- `nights`: number from `.nights`;
- `mealType`: text from `.board`;
- `roomType`: text from `.room`;
- `price`: integer amount from `.price`;
- `currency`: `RUB`, `USD`, or `EUR`, defaulting to `RUB` when absent;
- `link`: absolute item link from the hotel title or thumbnail;
- `pros`: amenity labels from `.amenities .amenity`;
- `agentComment`: source URL plus hotel description when present;
- `isRecommended`: always `false`.

Date parsing uses the current year when the Qui-Quo page omits a year. If the
source provides dates in Russian month names, the parser converts them to ISO
dates before validation. If a specific field cannot be parsed, that field is
stored as `null` while the rest of the option is still created.

## Services

Add a dedicated service module for source parsing and import orchestration.

Responsibilities:

- validate supported source URLs;
- fetch HTML with a conservative timeout;
- parse HTML into `TourOptionCreate` payloads;
- create options through existing `create_tour_option` behavior or equivalent
  service-level logic;
- keep route handlers thin.

The parser should be independently testable from a static HTML fixture.

## Frontend Changes

Add API types and function:

- `ImportTourOptionsInput`;
- `ImportTourOptionsOutput`;
- `importTourOptions(token, requestId, payload)`.

Update `TourOptionsPanel`:

- local state for import URL, import error, and success count;
- `useMutation` for the import endpoint;
- disable the import button while importing or when the URL is empty;
- invalidate `queryKeys.tourOptions(requestId)` after success.

## Errors

User-facing errors should be specific enough to act on:

- unsupported URL: "Поддерживаются только ссылки Qui-Quo";
- fetch/network failure: "Не удалось открыть подборку Qui-Quo";
- no parsed tours: "В подборке не найдены варианты тура";
- validation failure on parsed data: use the existing API error surface.

## Testing

Backend tests:

- parser extracts all options from a saved Qui-Quo HTML fixture;
- parser handles missing optional fields without failing the whole import;
- unsupported URL is rejected;
- import creates options only for a request owned by the current user;
- import returns an error when no tour sections are present.

Frontend checks:

- import form has loading, error, and success states;
- successful import refreshes the tour options list;
- manual option creation still works.

Manual verification:

- import `https://qui-quo.ru/CZ22-SU39` into a demo travel request;
- confirm imported hotels, dates, nights, price, meal, room, and links render in
  the existing tour option cards.
