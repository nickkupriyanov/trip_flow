import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "@/auth/AuthContext";
import {
  ApiError,
  createClient,
  fetchClients,
  type ClientInput
} from "@/lib/api";
import { ClientForm } from "@/pages/components/ClientForm";
import { EmptyState } from "@/pages/components/EmptyState";
import { PageHeader } from "@/pages/components/PageHeader";

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

export function ClientsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ["clients", search],
    queryFn: () => fetchClients(token!, search),
    enabled: Boolean(token)
  });

  const createMutation = useMutation({
    mutationFn: (payload: ClientInput) => createClient(token!, payload),
    onSuccess: async () => {
      setFormError(null);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error) => setFormError(getErrorMessage(error))
  });

  const clients = clientsQuery.data ?? [];
  const hasSearch = Boolean(search.trim());

  async function handleCreate(payload: ClientInput) {
    await createMutation.mutateAsync(payload);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Клиенты"
          description="Контакты, заметки и предпочтения клиентов перед созданием заявок на путешествие."
        />
        <button
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
          type="button"
          onClick={() => {
            setFormError(null);
            setIsCreateOpen((value) => !value);
          }}
        >
          {isCreateOpen ? "Скрыть форму" : "Добавить клиента"}
        </button>
      </div>

      {isCreateOpen ? (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-semibold">Новый клиент</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Заполните минимум имя. Контакты и теги помогут быстрее найти клиента позже.
            </p>
          </div>
          <ClientForm
            error={formError}
            isSubmitting={createMutation.isPending}
            submitLabel="Создать клиента"
            onCancel={() => setIsCreateOpen(false)}
            onSubmit={handleCreate}
          />
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Поиск</span>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            placeholder="Имя, телефон, email, Telegram, город или источник"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {clientsQuery.isLoading ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Загружаем клиентов...
        </div>
      ) : null}

      {clientsQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {getErrorMessage(clientsQuery.error)}
        </div>
      ) : null}

      {!clientsQuery.isLoading && !clientsQuery.isError && clients.length === 0 ? (
        <EmptyState
          title={hasSearch ? "Клиенты не найдены" : "Пока нет клиентов"}
          description={
            hasSearch
              ? "Попробуйте изменить запрос или очистить поиск."
              : "Добавьте первого клиента, чтобы затем создать заявку на путешествие."
          }
        />
      ) : null}

      {clients.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase tracking-normal text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Клиент</th>
                  <th className="px-4 py-3 font-semibold">Контакты</th>
                  <th className="px-4 py-3 font-semibold">Город / источник</th>
                  <th className="px-4 py-3 font-semibold">Теги</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((client) => (
                  <tr key={client.id} className="transition hover:bg-muted/40">
                    <td className="px-4 py-4 align-top">
                      <Link
                        className="font-semibold text-foreground hover:text-primary"
                        to={`/clients/${client.id}`}
                      >
                        {client.fullName}
                      </Link>
                      {client.notes ? (
                        <p className="mt-1 line-clamp-2 max-w-xs text-sm text-muted-foreground">
                          {client.notes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">
                      <ContactLine value={client.phone} />
                      <ContactLine value={client.email} />
                      <ContactLine value={client.telegram} />
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">
                      <ContactLine value={client.city} />
                      <ContactLine value={client.source} />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex max-w-xs flex-wrap gap-1.5">
                        {client.tags.length > 0 ? (
                          client.tags.map((tag) => (
                            <span
                              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                              key={tag}
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Без тегов</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ContactLine({ value }: { value: string | null }) {
  if (!value) {
    return null;
  }
  return <p className="leading-6">{value}</p>;
}
