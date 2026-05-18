import { EmptyState } from "@/pages/components/EmptyState";
import { PageHeader } from "@/pages/components/PageHeader";

const statuses = [
  "Новая",
  "Уточнение",
  "Подбор",
  "Отправлено",
  "Клиент думает",
  "Бронь",
  "Отказ"
];

export function PipelinePage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Заявки на путешествия будут проходить здесь через статусы MVP."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statuses.map((status) => (
          <article
            key={status}
            className="min-h-36 rounded-lg border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{status}</h2>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                0
              </span>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Заявки появятся здесь после добавления API для pipeline.
            </p>
          </article>
        ))}
      </div>

      <EmptyState
        title="Структура pipeline готова"
        description="Это только доска-заглушка. Перетаскивание и смена статусов относятся к отдельному шагу roadmap."
      />
    </section>
  );
}
