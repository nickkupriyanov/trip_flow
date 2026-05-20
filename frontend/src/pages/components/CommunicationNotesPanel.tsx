import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import {
  ApiError,
  createCommunicationNote,
  deleteCommunicationNote,
  fetchClientCommunicationNotes,
  fetchRequestCommunicationNotes,
  updateCommunicationNote,
  type CommunicationNote,
  type CommunicationNoteInput,
  type CommunicationNoteType
} from "@/lib/api";
import { EmptyState } from "@/pages/components/EmptyState";

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

const noteTypeTones: Record<CommunicationNoteType, string> = {
  note: "border-slate-200 bg-slate-50 text-slate-700",
  call: "border-amber-200 bg-amber-50 text-amber-800",
  telegram: "border-sky-200 bg-sky-50 text-sky-800",
  whatsapp: "border-emerald-200 bg-emerald-50 text-emerald-800",
  email: "border-indigo-200 bg-indigo-50 text-indigo-800"
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

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

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
    onError: (error) => setFormError(getErrorMessage(error))
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
    onError: (error) => setFormError(getErrorMessage(error))
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => deleteCommunicationNote(token, noteId),
    onSuccess: async () => {
      setMutationError(null);
      await invalidateNotes();
    },
    onError: (error) => setMutationError(getErrorMessage(error))
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
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          type="button"
          onClick={() => {
            setFormError(null);
            setEditingNoteId(null);
            setIsCreateOpen((value) => !value);
          }}
        >
          {isCreateOpen ? "Скрыть форму" : "Добавить запись"}
        </button>
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
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {mutationError}
        </div>
      ) : null}

      {notesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Загружаем коммуникации...</p>
      ) : null}

      {notesQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getErrorMessage(notesQuery.error)}
        </div>
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
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? localError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <label className="grid gap-2 text-sm font-medium">
          Тип
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={values.type}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                type: event.target.value as CommunicationNoteType
              }))
            }
          >
            {noteTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Запись
          <textarea
            className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Что обсудили, что обещали отправить или что важно помнить"
            value={values.content}
            onChange={(event) =>
              setValues((current) => ({ ...current, content: event.target.value }))
            }
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          className="rounded-md border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          type="button"
          onClick={onCancel}
        >
          Отмена
        </button>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Сохраняем..." : submitLabel}
        </button>
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
    <article className="rounded-lg border bg-background p-4 transition hover:border-primary/40 hover:bg-muted/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${noteTypeTones[note.type]}`}
            >
              {noteTypeLabels[note.type]}
            </span>
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
          <button
            className="rounded-md border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => onEdit(note)}
          >
            Редактировать
          </button>
          <button
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            type="button"
            onClick={() => onDelete(note)}
          >
            {isDeleting ? "Удаляем..." : "Удалить"}
          </button>
        </div>
      </div>
    </article>
  );
}
