import { EmptyState } from "@/pages/components/EmptyState";
import { PageHeader } from "@/pages/components/PageHeader";

const overviewCards = [
  { label: "Напоминания на сегодня", value: "0", note: "Логика напоминаний появится позже" },
  { label: "Новые заявки", value: "0", note: "Сначала будет добавлена авторизация" },
  { label: "Предложения для follow-up", value: "0", note: "Демо-данных пока нет" }
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
        description="Данные появятся после реализации напоминаний, клиентов и заявок на путешествия."
      />
    </section>
  );
}
