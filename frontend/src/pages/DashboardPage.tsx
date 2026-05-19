import { EmptyState } from "@/pages/components/EmptyState";
import { PageHeader } from "@/pages/components/PageHeader";

const overviewCards = [
  { label: "Напоминания на сегодня", value: "0", note: "Откройте раздел напоминаний для текущего списка" },
  { label: "Новые заявки", value: "0", note: "Будет подключено на этапе dashboard" },
  { label: "Предложения для follow-up", value: "0", note: "Будет подключено на этапе dashboard" }
];

export function DashboardPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Дашборд"
        description="Спокойная стартовая точка для ежедневной работы турагента."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {overviewCards.map((card) => (
          <article
            key={card.label}
            className="rounded-lg border bg-card p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{card.note}</p>
          </article>
        ))}
      </div>

      <EmptyState
        title="Ежедневная работа пока не подключена"
        description="Напоминания уже доступны в отдельном разделе. Следующий этап свяжет их с виджетами dashboard."
      />
    </section>
  );
}
