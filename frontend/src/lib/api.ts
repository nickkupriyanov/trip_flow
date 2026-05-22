const API_URL =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:8000`;

export type User = {
  id: string;
  email: string;
  name: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type Client = {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  telegram: string | null;
  whatsapp: string | null;
  city: string | null;
  source: string | null;
  tags: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientInput = {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  source?: string | null;
  tags?: string[];
  notes?: string | null;
};

export type HotelLevel = "3*" | "4*" | "5*" | "luxury";

export type ClientPreference = {
  id: string;
  clientId: string;
  preferredDestinations: string[];
  dislikedDestinations: string[];
  preferredHotelLevel: HotelLevel | null;
  mealPreferences: string[];
  travelStyle: string[];
  importantFactors: string[];
  avoidFactors: string[];
  averageBudgetMin: number | null;
  averageBudgetMax: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientPreferenceInput = {
  preferredDestinations?: string[];
  dislikedDestinations?: string[];
  preferredHotelLevel?: HotelLevel | null;
  mealPreferences?: string[];
  travelStyle?: string[];
  importantFactors?: string[];
  avoidFactors?: string[];
  averageBudgetMin?: number | null;
  averageBudgetMax?: number | null;
};

export type TravelRequestStatus =
  | "new"
  | "clarifying"
  | "searching"
  | "sent"
  | "thinking"
  | "booked"
  | "rejected";

export type TravelRequest = {
  id: string;
  userId: string;
  clientId: string;
  status: TravelRequestStatus;
  destination: string | null;
  departureCity: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  nightsFrom: number | null;
  nightsTo: number | null;
  adults: number;
  children: number;
  childrenAges: number[];
  budgetMin: number | null;
  budgetMax: number | null;
  travelType: string | null;
  wishes: string | null;
  restrictions: string | null;
  internalComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PipelineTravelRequest = TravelRequest & {
  clientFullName: string;
};

export type Pipeline = Record<TravelRequestStatus, PipelineTravelRequest[]>;

export type DashboardWidgetId =
  | "overview"
  | "todayReminders"
  | "recentClients"
  | "miniPipeline";

export type DashboardPreferences = {
  dashboardWidgetOrder: DashboardWidgetId[];
};

export type DashboardPreferencesInput = {
  dashboardWidgetOrder: DashboardWidgetId[];
};

export type TravelRequestInput = {
  status?: TravelRequestStatus;
  destination?: string | null;
  departureCity?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  nightsFrom?: number | null;
  nightsTo?: number | null;
  adults?: number;
  children?: number;
  childrenAges?: number[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  travelType?: string | null;
  wishes?: string | null;
  restrictions?: string | null;
  internalComment?: string | null;
};

export type TravelRequestStatusInput = {
  status: TravelRequestStatus;
};

export type Currency = "RUB" | "USD" | "EUR";

export type TourOption = {
  id: string;
  requestId: string;
  title: string;
  country: string | null;
  resort: string | null;
  hotelName: string | null;
  hotelStars: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  nights: number | null;
  roomType: string | null;
  mealType: string | null;
  price: number | null;
  currency: Currency;
  link: string | null;
  pros: string[];
  cons: string[];
  agentComment: string | null;
  isRecommended: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TourOptionInput = {
  title: string;
  country?: string | null;
  resort?: string | null;
  hotelName?: string | null;
  hotelStars?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  nights?: number | null;
  roomType?: string | null;
  mealType?: string | null;
  price?: number | null;
  currency?: Currency;
  link?: string | null;
  pros?: string[];
  cons?: string[];
  agentComment?: string | null;
  isRecommended?: boolean;
};

export type ImportTourOptionsInput = {
  url: string;
};

export type ImportTourOptionsOutput = {
  createdCount: number;
  skippedCount: number;
  options: TourOption[];
  skippedOptions: TourOption[];
};

export type ProposalFormat = "telegram" | "whatsapp" | "email";

export type Proposal = {
  id: string;
  requestId: string;
  title: string;
  content: string;
  format: ProposalFormat;
  createdAt: string;
  updatedAt: string;
};

export type ProposalInput = {
  title: string;
  content: string;
  format?: ProposalFormat;
};

export type ProposalTone = "friendly" | "concise" | "premium";

export type GenerateProposalInput = {
  requestId: string;
  selectedOptionIds?: string[];
  tone?: ProposalTone;
  format?: ProposalFormat;
};

export type GenerateProposalOutput = {
  title: string;
  message: string;
  recommendedOptionId: string | null;
  shortSummary: string;
  generationTaskId: string;
};

export type GenerateNextQuestionsInput = {
  requestId: string;
  tone?: ProposalTone;
  format?: ProposalFormat;
};

export type GenerateNextQuestionsOutput = {
  questions: string[];
  message: string;
  shortSummary: string;
  generationTaskId: string;
};

export type ReminderStatus = "active" | "done";

export type Reminder = {
  id: string;
  userId: string;
  clientId: string | null;
  requestId: string | null;
  title: string;
  description: string | null;
  dueAt: string;
  status: ReminderStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReminderInput = {
  clientId?: string | null;
  requestId?: string | null;
  title: string;
  description?: string | null;
  dueAt: string;
  status?: ReminderStatus;
};

export type CommunicationNoteType =
  | "note"
  | "call"
  | "telegram"
  | "whatsapp"
  | "email";

export type CommunicationNote = {
  id: string;
  clientId: string;
  requestId: string | null;
  type: CommunicationNoteType;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CommunicationNoteInput = {
  requestId?: string | null;
  type?: CommunicationNoteType;
  content: string;
};

export type ReminderFilters = {
  status?: ReminderStatus;
  dueFrom?: string;
  dueTo?: string;
  clientId?: string;
  requestId?: string;
};

type ApiErrorDetail =
  | string
  | Array<{
      loc?: Array<number | string>;
      msg?: string;
      type?: string;
    }>;

type ApiErrorBody = {
  detail?: ApiErrorDetail;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.detail === "string") {
      return body.detail;
    }
    if (Array.isArray(body.detail)) {
      const messages = body.detail
        .map((item) => item.msg)
        .filter((message): message is string => Boolean(message));
      if (messages.length > 0) {
        return messages.join("; ");
      }
    }
    if (response.status === 401) {
      return "Сессия истекла. Войдите снова.";
    }
    if (response.status === 404) {
      return "Запись не найдена или у вас нет доступа.";
    }
    if (response.status >= 500) {
      return "Сервис временно недоступен. Попробуйте позже.";
    }
    return "Не удалось выполнить запрос";
  } catch {
    if (response.status >= 500) {
      return "Сервис временно недоступен. Попробуйте позже.";
    }
    return "Не удалось выполнить запрос";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "Не удалось связаться с сервером. Проверьте, что TripFlow запущен.",
      0,
    );
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function registerUser(payload: {
  email: string;
  name: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchCurrentUser(token: string): Promise<User> {
  return apiRequest<User>("/auth/me", {}, token);
}

export function fetchClients(token: string, search?: string): Promise<Client[]> {
  const params = new URLSearchParams();
  if (search?.trim()) {
    params.set("search", search.trim());
  }
  const query = params.toString();
  return apiRequest<Client[]>(`/clients${query ? `?${query}` : ""}`, {}, token);
}

export function createClient(
  token: string,
  payload: ClientInput,
): Promise<Client> {
  return apiRequest<Client>(
    "/clients",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchClient(token: string, clientId: string): Promise<Client> {
  return apiRequest<Client>(`/clients/${clientId}`, {}, token);
}

export function updateClient(
  token: string,
  clientId: string,
  payload: Partial<ClientInput>,
): Promise<Client> {
  return apiRequest<Client>(
    `/clients/${clientId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteClient(token: string, clientId: string): Promise<void> {
  return apiRequest<void>(`/clients/${clientId}`, { method: "DELETE" }, token);
}

export function fetchClientPreferences(
  token: string,
  clientId: string,
): Promise<ClientPreference | null> {
  return apiRequest<ClientPreference | null>(
    `/clients/${clientId}/preferences`,
    {},
    token,
  );
}

export function upsertClientPreferences(
  token: string,
  clientId: string,
  payload: ClientPreferenceInput,
): Promise<ClientPreference> {
  return apiRequest<ClientPreference>(
    `/clients/${clientId}/preferences`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchClientRequests(
  token: string,
  clientId: string,
): Promise<TravelRequest[]> {
  return apiRequest<TravelRequest[]>(
    `/clients/${clientId}/requests`,
    {},
    token,
  );
}

export function fetchTravelRequests(token: string): Promise<TravelRequest[]> {
  return apiRequest<TravelRequest[]>("/requests", {}, token);
}

export function createTravelRequest(
  token: string,
  clientId: string,
  payload: TravelRequestInput,
): Promise<TravelRequest> {
  return apiRequest<TravelRequest>(
    `/clients/${clientId}/requests`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchTravelRequest(
  token: string,
  requestId: string,
): Promise<TravelRequest> {
  return apiRequest<TravelRequest>(`/requests/${requestId}`, {}, token);
}

export function updateTravelRequest(
  token: string,
  requestId: string,
  payload: Partial<TravelRequestInput>,
): Promise<TravelRequest> {
  return apiRequest<TravelRequest>(
    `/requests/${requestId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateTravelRequestStatus(
  token: string,
  requestId: string,
  payload: TravelRequestStatusInput,
): Promise<TravelRequest> {
  return apiRequest<TravelRequest>(
    `/requests/${requestId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchPipeline(token: string): Promise<Pipeline> {
  return apiRequest<Pipeline>("/pipeline", {}, token);
}

export function fetchDashboardPreferences(
  token: string,
): Promise<DashboardPreferences> {
  return apiRequest<DashboardPreferences>("/dashboard/preferences", {}, token);
}

export function updateDashboardPreferences(
  token: string,
  payload: DashboardPreferencesInput,
): Promise<DashboardPreferences> {
  return apiRequest<DashboardPreferences>(
    "/dashboard/preferences",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteTravelRequest(
  token: string,
  requestId: string,
): Promise<void> {
  return apiRequest<void>(`/requests/${requestId}`, { method: "DELETE" }, token);
}

export function fetchTourOptions(
  token: string,
  requestId: string,
): Promise<TourOption[]> {
  return apiRequest<TourOption[]>(`/requests/${requestId}/options`, {}, token);
}

export function createTourOption(
  token: string,
  requestId: string,
  payload: TourOptionInput,
): Promise<TourOption> {
  return apiRequest<TourOption>(
    `/requests/${requestId}/options`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateTourOption(
  token: string,
  optionId: string,
  payload: Partial<TourOptionInput>,
): Promise<TourOption> {
  return apiRequest<TourOption>(
    `/options/${optionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteTourOption(token: string, optionId: string): Promise<void> {
  return apiRequest<void>(`/options/${optionId}`, { method: "DELETE" }, token);
}

export function importTourOptions(
  token: string,
  requestId: string,
  payload: ImportTourOptionsInput,
): Promise<ImportTourOptionsOutput> {
  return apiRequest<ImportTourOptionsOutput>(
    `/requests/${requestId}/options/import`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchProposals(
  token: string,
  requestId: string,
): Promise<Proposal[]> {
  return apiRequest<Proposal[]>(`/requests/${requestId}/proposals`, {}, token);
}

export function createProposal(
  token: string,
  requestId: string,
  payload: ProposalInput,
): Promise<Proposal> {
  return apiRequest<Proposal>(
    `/requests/${requestId}/proposals`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateProposal(
  token: string,
  proposalId: string,
  payload: Partial<ProposalInput>,
): Promise<Proposal> {
  return apiRequest<Proposal>(
    `/proposals/${proposalId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteProposal(token: string, proposalId: string): Promise<void> {
  return apiRequest<void>(`/proposals/${proposalId}`, { method: "DELETE" }, token);
}

export function generateProposalDraft(
  token: string,
  payload: GenerateProposalInput,
): Promise<GenerateProposalOutput> {
  return apiRequest<GenerateProposalOutput>(
    "/ai/generate-proposal",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function generateNextQuestionsDraft(
  token: string,
  payload: GenerateNextQuestionsInput,
): Promise<GenerateNextQuestionsOutput> {
  return apiRequest<GenerateNextQuestionsOutput>(
    "/ai/next-questions",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function fetchReminders(
  token: string,
  filters: ReminderFilters = {},
): Promise<Reminder[]> {
  const params = new URLSearchParams();
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.dueFrom) {
    params.set("due_from", filters.dueFrom);
  }
  if (filters.dueTo) {
    params.set("due_to", filters.dueTo);
  }
  if (filters.clientId) {
    params.set("client_id", filters.clientId);
  }
  if (filters.requestId) {
    params.set("request_id", filters.requestId);
  }
  const query = params.toString();
  return apiRequest<Reminder[]>(`/reminders${query ? `?${query}` : ""}`, {}, token);
}

export function createReminder(
  token: string,
  payload: ReminderInput,
): Promise<Reminder> {
  return apiRequest<Reminder>(
    "/reminders",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateReminder(
  token: string,
  reminderId: string,
  payload: Partial<ReminderInput>,
): Promise<Reminder> {
  return apiRequest<Reminder>(
    `/reminders/${reminderId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function markReminderDone(
  token: string,
  reminderId: string,
): Promise<Reminder> {
  return apiRequest<Reminder>(
    `/reminders/${reminderId}/done`,
    { method: "PATCH" },
    token,
  );
}

export function deleteReminder(token: string, reminderId: string): Promise<void> {
  return apiRequest<void>(`/reminders/${reminderId}`, { method: "DELETE" }, token);
}

export function fetchClientCommunicationNotes(
  token: string,
  clientId: string,
): Promise<CommunicationNote[]> {
  return apiRequest<CommunicationNote[]>(
    `/clients/${clientId}/notes`,
    {},
    token,
  );
}

export function fetchRequestCommunicationNotes(
  token: string,
  requestId: string,
): Promise<CommunicationNote[]> {
  return apiRequest<CommunicationNote[]>(
    `/requests/${requestId}/notes`,
    {},
    token,
  );
}

export function createCommunicationNote(
  token: string,
  clientId: string,
  payload: CommunicationNoteInput,
): Promise<CommunicationNote> {
  return apiRequest<CommunicationNote>(
    `/clients/${clientId}/notes`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateCommunicationNote(
  token: string,
  noteId: string,
  payload: Partial<CommunicationNoteInput>,
): Promise<CommunicationNote> {
  return apiRequest<CommunicationNote>(
    `/notes/${noteId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteCommunicationNote(
  token: string,
  noteId: string,
): Promise<void> {
  return apiRequest<void>(`/notes/${noteId}`, { method: "DELETE" }, token);
}
