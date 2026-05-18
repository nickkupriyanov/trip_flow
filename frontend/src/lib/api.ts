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

type ApiErrorBody = {
  detail?: string;
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
    return body.detail ?? "Не удалось выполнить запрос";
  } catch {
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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

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
