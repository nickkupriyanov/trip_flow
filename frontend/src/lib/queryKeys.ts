export const queryKeys = {
  client: (clientId: string | undefined) => ["client", clientId] as const,
  clients: (scope?: string) =>
    scope ? (["clients", scope] as const) : (["clients"] as const),
  clientPreferences: (clientId: string | undefined) =>
    ["client-preferences", clientId] as const,
  clientRequests: (clientId: string | undefined) =>
    ["client-requests", clientId] as const,
  communicationNotes: (scope: string, id: string) =>
    ["communication-notes", scope, id] as const,
  dashboardPreferences: () => ["dashboard-preferences"] as const,
  pipeline: () => ["pipeline"] as const,
  proposals: (requestId: string) => ["proposals", requestId] as const,
  reminders: (filters?: object) =>
    filters ? (["reminders", filters] as const) : (["reminders"] as const),
  tourOptions: (requestId: string) => ["tour-options", requestId] as const,
  travelRequest: (requestId: string | undefined) =>
    ["travel-request", requestId] as const,
  travelRequests: () => ["travel-requests"] as const
};
