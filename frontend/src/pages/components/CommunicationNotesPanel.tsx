import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createCommunicationNote,
  deleteCommunicationNote,
  fetchClientCommunicationNotes,
  fetchRequestCommunicationNotes,
  updateCommunicationNote,
  type CommunicationNote,
  type CommunicationNoteInput,
  type CommunicationNoteType
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { EmptyState } from "@/pages/components/EmptyState";
import { FormField } from "@/pages/components/FormField";

const noteTypes: Array<{ value: CommunicationNoteType; label: string }> = [
  { value: "note", label: "Заметка" },
  { value: "call", label: "Звонок" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" }
];

const noteTypeLabels: Record<CommunicationNoteType, string> = {
  note: "Заметка",
  call: "Звонок",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  email: "Email"
};

const noteTypeVariants: Record<CommunicationNoteType, BadgeProps["variant"]> = {
  note: "outline",
  call: "amber",
  telegram: "sky",
  whatsapp: "emerald",
  email: "indigo"
};

type NoteFormValues = {
  type: CommunicationNoteType;
  content: string;
};

type NotesScope =
  | {
      kind: "client";
      clientId: string;
    }
  | {
      kind: "request";
      clientId: string;
      requestId: string;
    };

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function toInput(
  values: NoteFormValues,
  scope: NotesScope,
): CommunicationNoteInput {
  return {
    requestId: scope.kind === "request" ? scope.requestId : null,
    type: values.type,
    content: values.content
  };
}

function emptyValues(): NoteFormValues {
  return {
    type: "note",
    content: ""
  };
}

export function CommunicationNotesPanel({
  scope,
  token
}: {
  scope: NotesScope;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const queryKey =
    scope.kind === "request"
      ? ["communication-notes", "request", scope.requestId]
      : ["communication-notes", "client", scope.clientId];

  const notesQuery = useQuery({
    queryKey,
    queryFn: () =>
      scope.kind === "request"
        ? fetchRequestCommunicationNotes(token, scope.requestId)
        : fetchClientCommunicationNotes(token, scope.clientId)
  });

  async function invalidateNotes() {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({
      queryKey: ["communication-notes", "client", scope.clientId]
    });
    if (scope.kind === "request") {
      await queryClient.invalidateQueries({
        queryKey: ["communication-notes", "request", scope.requestId]
      });
    }
  }

  const createMutation = useMutation({
    mutationFn: (values: NoteFormValues) =>
      createCommunicationNote(token, scope.clientId, toInput(values, scope)),
    onSuccess: async () => {
      setFormError(null);
      setIsCreateOpen(false);
      await invalidateNotes();
    },
    onError: (error) => setFormError(getApiErrorMessage(error))
  });

  const updateMutation = useMutation({
    mutationFn: ({
      noteId,
      values
    }: {
      noteId: string;
      values: NoteFormValues;
    }) =>
      updateCommunicationNote(token, noteId, {
        type: values.type,
        content: values.content
      }),
    onSuccess: async () => {
      setFormError(null);
      setEditingNoteId(null);
      await invalidateNotes();
    },
    onError: (error) => setFormError(getApiErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => deleteCommunicationNote(token, noteId),
    onSuccess: async () => {
      setMutationError(null);
      await invalidateNotes();
    },
    onError: (error) => setMutationError(getApiErrorMessage(error))
  });

  async function handleCreate(values: NoteFormValues) {
    await createMutation.mutateAsync(values);
  }

  async function handleUpdate(noteId: string, values: NoteFormValues) {
    await updateMutation.mutateAsync({ noteId, values });
  }

  async function handleDelete(note: CommunicationNote) {
    if (!window.confirm("Удалить запись коммуникации? Это действие нельзя отменить.")) {
      return;
    }
    await deleteMutation.mutateAsync(note.id);
  }

  const notes = notesQuery.data ?? [];
  const title =
    scope.kind === "request" ? "Коммуникации по заявке" : "История коммуникаций";
  const description =
    scope.kind === "request"
      ? "Контакты, уточнения и сообщения, связанные именно с этой поездкой."
      : "Хронология звонков, сообщений и рабочих заметок по клиенту.";

  return (
    <Card>
      <CardContent className="p-5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setFormError(null);
            setEditingNoteId(null);
            setIsCreateOpen((value) => !value);
          }}
        >
          {isCreateOpen ? "Скрыть форму" : "Добавить запись"}
        </Button>
      </div>

      {isCreateOpen ? (
        <div className="mb-5 rounded-lg border bg-background p-4">
          <CommunicationNoteForm
            error={formError}
            isSubmitting={createMutation.isPending}
            submitLabel="Добавить запись"
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

      {notesQuery.isLoading ? (
        <PanelLoading text="Загружаем историю коммуникаций..." />
      ) : null}

      {notesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{getApiErrorMessage(notesQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      {!notesQuery.isLoading && !notesQuery.isError && notes.length === 0 ? (
        <EmptyState
          title="История пока пустая"
          description="Добавьте звонок, сообщение или рабочую заметку после контакта с клиентом."
        />
      ) : null}

      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) =>
            editingNoteId === note.id ? (
              <div className="rounded-lg border bg-background p-4" key={note.id}>
                <CommunicationNoteForm
                  error={formError}
                  initialValues={{
                    type: note.type,
                    content: note.content
                  }}
                  isSubmitting={updateMutation.isPending}
                  submitLabel="Сохранить запись"
                  onCancel={() => {
                    setFormError(null);
                    setEditingNoteId(null);
                  }}
                  onSubmit={(values) => handleUpdate(note.id, values)}
                />
              </div>
            ) : (
              <CommunicationNoteCard
                isDeleting={deleteMutation.isPending}
                key={note.id}
                note={note}
                showRequestLink={scope.kind === "client" && note.requestId !== null}
                onDelete={handleDelete}
                onEdit={(selectedNote) => {
                  setFormError(null);
                  setIsCreateOpen(false);
                  setEditingNoteId(selectedNote.id);
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

function CommunicationNoteForm({
  error,
  initialValues,
  isSubmitting,
  submitLabel,
  onCancel,
  onSubmit
}: {
  error: string | null;
  initialValues?: NoteFormValues;
  isSubmitting: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: NoteFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<NoteFormValues>(
    initialValues ?? emptyValues(),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = values.content.trim();
    if (!content) {
      setLocalError("Заполните текст записи.");
      return;
    }
    setLocalError(null);
    await onSubmit({ ...values, content });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error || localError ? (
        <Alert variant="destructive">
          <AlertDescription>{error ?? localError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <FormField label="Тип">
          <Select
            value={values.type}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                type: value as CommunicationNoteType
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {noteTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Запись">
          <Textarea
            className="min-h-28 leading-6"
            placeholder="Что обсудили, что обещали отправить или что важно помнить"
            value={values.content}
            onChange={(event) =>
              setValues((current) => ({ ...current, content: event.target.value }))
            }
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" type="button" onClick={onCancel}>
          Отмена
        </Button>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Сохраняем..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function CommunicationNoteCard({
  isDeleting,
  note,
  showRequestLink,
  onDelete,
  onEdit
}: {
  isDeleting: boolean;
  note: CommunicationNote;
  showRequestLink: boolean;
  onDelete: (note: CommunicationNote) => void;
  onEdit: (note: CommunicationNote) => void;
}) {
  return (
    <Card className="bg-background transition hover:border-primary/40 hover:bg-muted/30">
      <CardContent className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={noteTypeVariants[note.type]}>
              {noteTypeLabels[note.type]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(note.createdAt)}
            </span>
            {showRequestLink && note.requestId ? (
              <Link
                className="text-xs font-medium text-primary hover:underline"
                to={`/requests/${note.requestId}`}
              >
                Заявка
              </Link>
            ) : null}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {note.content}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button variant="outline" type="button" onClick={() => onEdit(note)}>
            Редактировать
          </Button>
          <Button
            disabled={isDeleting}
            variant="destructive"
            type="button"
            onClick={() => onDelete(note)}
          >
            {isDeleting ? "Удаляем..." : "Удалить"}
          </Button>
        </div>
      </div>
      </CardContent>
    </Card>
  );
}
