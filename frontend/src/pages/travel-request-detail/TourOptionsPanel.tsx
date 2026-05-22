import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createTourOption,
  deleteTourOption,
  fetchTourOptions,
  importTourOptions,
  updateTourOption,
  type TourOption,
  type TourOptionInput
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import {
  formatHotel,
  formatPlace,
  formatPrice,
  formatRange,
  formatTourOptionMeta
} from "@/lib/formatters";
import { queryKeys } from "@/lib/queryKeys";
import { EmptyState } from "@/pages/components/EmptyState";
import { TourOptionForm } from "@/pages/components/TourOptionForm";

type ImportSummary = {
  createdCount: number;
  skippedCount: number;
};

export function TourOptionsPanel({
  requestId,
  token
}: {
  requestId: string;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const optionsQuery = useQuery({
    queryKey: queryKeys.tourOptions(requestId),
    queryFn: () => fetchTourOptions(token, requestId)
  });

  const createMutation = useMutation({
    mutationFn: (payload: TourOptionInput) =>
      createTourOption(token, requestId, payload),
    onSuccess: async () => {
      setFormError(null);
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tourOptions(requestId) });
    },
    onError: (error) => setFormError(getApiErrorMessage(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({
      optionId,
      payload
    }: {
      optionId: string;
      payload: TourOptionInput;
    }) => updateTourOption(token, optionId, payload),
    onSuccess: async () => {
      setFormError(null);
      setEditingOptionId(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tourOptions(requestId) });
    },
    onError: (error) => setFormError(getApiErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: (optionId: string) => deleteTourOption(token, optionId),
    onSuccess: async () => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tourOptions(requestId) });
    },
    onError: (error) => setMutationError(getApiErrorMessage(error))
  });

  const importMutation = useMutation({
    mutationFn: (url: string) => importTourOptions(token, requestId, { url }),
    onSuccess: async (result) => {
      setMutationError(null);
      setImportUrl("");
      setImportSummary({
        createdCount: result.createdCount,
        skippedCount: result.skippedCount
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tourOptions(requestId) });
    },
    onError: (error) => {
      setImportSummary(null);
      setMutationError(getApiErrorMessage(error));
    }
  });

  async function handleCreate(payload: TourOptionInput) {
    await createMutation.mutateAsync(payload);
  }

  async function handleUpdate(optionId: string, payload: TourOptionInput) {
    await updateMutation.mutateAsync({ optionId, payload });
  }

  async function handleDelete(option: TourOption) {
    if (!window.confirm("Удалить вариант тура? Это действие нельзя отменить.")) {
      return;
    }
    await deleteMutation.mutateAsync(option.id);
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = importUrl.trim();
    if (!url) {
      return;
    }
    await importMutation.mutateAsync(url);
  }

  const options = optionsQuery.data ?? [];
  const canImport = importUrl.trim().length > 0 && !importMutation.isPending;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Варианты тура</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Подборки для этой заявки: отели, питание, цена и рабочие плюсы/минусы.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setFormError(null);
              setEditingOptionId(null);
              setIsCreateOpen((value) => !value);
            }}
          >
            {isCreateOpen ? "Скрыть форму" : "Добавить вариант"}
          </Button>
        </div>

        <form
          className="mb-5 rounded-lg border bg-background p-4"
          onSubmit={handleImport}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="qui-quo-import-url"
              >
                Импорт из Qui-Quo
              </label>
              <input
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={importMutation.isPending}
                id="qui-quo-import-url"
                placeholder="https://qui-quo.ru/CZ22-SU39"
                type="url"
                value={importUrl}
                onChange={(event) => {
                  setImportSummary(null);
                  setMutationError(null);
                  setImportUrl(event.target.value);
                }}
              />
            </div>
            <Button disabled={!canImport} type="submit">
              {importMutation.isPending ? "Импортируем..." : "Импортировать"}
            </Button>
          </div>
          {importMutation.isPending ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Загружаем подборку и создаём варианты тура...
            </p>
          ) : null}
          {importSummary ? (
            <p className="mt-3 text-sm font-medium text-emerald-700">
              Добавлено вариантов: {importSummary.createdCount}
              {importSummary.skippedCount > 0
                ? `, уже были в заявке: ${importSummary.skippedCount}`
                : ""}
            </p>
          ) : null}
        </form>

        {isCreateOpen ? (
          <div className="mb-5 rounded-lg border bg-background p-4">
            <TourOptionForm
              error={formError}
              isSubmitting={createMutation.isPending}
              submitLabel="Добавить вариант"
              onCancel={() => setIsCreateOpen(false)}
              onSubmit={handleCreate}
            />
          </div>
        ) : null}

        {mutationError ? (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        ) : null}

        {optionsQuery.isLoading ? (
          <PanelLoading text="Загружаем варианты тура..." />
        ) : null}

        {optionsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{getApiErrorMessage(optionsQuery.error)}</AlertDescription>
          </Alert>
        ) : null}

        {!optionsQuery.isLoading && !optionsQuery.isError && options.length === 0 ? (
          <EmptyState
            title="Вариантов тура пока нет"
            description="Добавьте 2-5 рабочих вариантов, чтобы затем собрать предложение для клиента."
          />
        ) : null}

        {options.length > 0 ? (
          <div className="grid gap-4">
            {options.map((option) =>
              editingOptionId === option.id ? (
                <div className="rounded-lg border bg-background p-4" key={option.id}>
                  <TourOptionForm
                    error={formError}
                    isSubmitting={updateMutation.isPending}
                    option={option}
                    submitLabel="Сохранить вариант"
                    onCancel={() => {
                      setFormError(null);
                      setEditingOptionId(null);
                    }}
                    onSubmit={(payload) => handleUpdate(option.id, payload)}
                  />
                </div>
              ) : (
                <TourOptionCard
                  isDeleting={deleteMutation.isPending}
                  key={option.id}
                  option={option}
                  onDelete={handleDelete}
                  onEdit={(selectedOption) => {
                    setFormError(null);
                    setIsCreateOpen(false);
                    setEditingOptionId(selectedOption.id);
                  }}
                />
              ),
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PanelLoading({ text }: { text: string }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <Skeleton className="h-4 w-44" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function TourOptionCard({
  isDeleting,
  option,
  onDelete,
  onEdit
}: {
  isDeleting: boolean;
  option: TourOption;
  onDelete: (option: TourOption) => void;
  onEdit: (option: TourOption) => void;
}) {
  return (
    <Card className="bg-background transition [contain-intrinsic-size:320px] [content-visibility:auto] hover:border-primary/40 hover:bg-muted/30">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold">{option.title}</h4>
              {option.isRecommended ? (
                <Badge variant="emerald">Рекомендованный</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatTourOptionMeta(option)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" type="button" onClick={() => onEdit(option)}>
              Редактировать
            </Button>
            <Button
              disabled={isDeleting}
              variant="destructive"
              type="button"
              onClick={() => onDelete(option)}
            >
              {isDeleting ? "Удаляем..." : "Удалить"}
            </Button>
          </div>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Отель" value={formatHotel(option)} />
          <Info label="Даты" value={formatRange(option.dateFrom, option.dateTo)} />
          <Info label="Ночи" value={option.nights} />
          <Info label="Цена" value={formatPrice(option)} />
          <Info label="Номер" value={option.roomType} />
          <Info label="Питание" value={option.mealType} />
          <Info label="Курорт" value={formatPlace(option)} />
          <Info label="Ссылка" value={option.link} />
        </dl>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ListBlock label="Плюсы" values={option.pros} />
          <ListBlock label="Минусы" values={option.cons} />
        </div>

        {option.agentComment ? (
          <div className="mt-4 rounded-md border bg-card px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Комментарий агента
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
              {option.agentComment}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">
        {value === null || value === "" ? "Не указано" : value}
      </dd>
    </div>
  );
}

function ListBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <h5 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </h5>
      {values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
              key={value}
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Не указано</p>
      )}
    </div>
  );
}
