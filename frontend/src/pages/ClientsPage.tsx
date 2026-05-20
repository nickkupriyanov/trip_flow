import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  ApiError,
  createClient,
  fetchClients,
  type ClientInput
} from "@/lib/api";
import { ClientForm } from "@/pages/components/ClientForm";
import { EmptyState } from "@/pages/components/EmptyState";
import { ErrorState, LoadingState } from "@/pages/components/Feedback";
import { FormField } from "@/pages/components/FormField";
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
        <Button
          className="w-full sm:w-auto"
          type="button"
          onClick={() => {
            setFormError(null);
            setIsCreateOpen((value) => !value);
          }}
        >
          {isCreateOpen ? "Скрыть форму" : "Добавить клиента"}
        </Button>
      </div>

      {isCreateOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>Новый клиент</CardTitle>
            <CardDescription>
              Заполните минимум имя. Контакты и теги помогут быстрее найти клиента позже.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientForm
              error={formError}
              isSubmitting={createMutation.isPending}
              submitLabel="Создать клиента"
              onCancel={() => setIsCreateOpen(false)}
              onSubmit={handleCreate}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-5">
          <FormField label="Поиск">
            <Input
            placeholder="Имя, телефон, email, Telegram, город или источник"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      {clientsQuery.isLoading ? (
        <LoadingState text="Загружаем клиентов..." />
      ) : null}

      {clientsQuery.isError ? (
        <ErrorState message={getErrorMessage(clientsQuery.error)} />
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
        <Card className="overflow-hidden">
          <Table className="min-w-[760px]">
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead>Город / источник</TableHead>
                  <TableHead>Теги</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <ContactLine value={client.phone} />
                      <ContactLine value={client.email} />
                      <ContactLine value={client.telegram} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <ContactLine value={client.city} />
                      <ContactLine value={client.source} />
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-xs flex-wrap gap-1.5">
                        {client.tags.length > 0 ? (
                          client.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Без тегов</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </Card>
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
