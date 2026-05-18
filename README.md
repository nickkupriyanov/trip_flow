# TripFlow

TripFlow — узкая CRM для индивидуального турагента.

Продукт помогает вести клиента по рабочему маршруту:

```text
Клиент -> Заявка -> Варианты тура -> Предложение -> Напоминание -> Бронь / Отказ
```

## Для кого

- индивидуальные турагенты;
- маленькие турагентства;
- специалисты по авторским турам;
- travel-консьержи.

## MVP

Первая версия должна позволять турагенту:

1. создать клиента;
2. создать заявку на путешествие;
3. заполнить параметры поездки;
4. добавить несколько вариантов тура;
5. вручную создать или сгенерировать предложение;
6. скопировать текст предложения для Telegram / WhatsApp;
7. менять статус заявки в pipeline;
8. создать напоминание;
9. видеть задачи на сегодня на dashboard.

## Не входит в MVP

- оплаты;
- интеграции с туроператорами;
- онлайн-бронирование;
- командные роли;
- WhatsApp Business API;
- PDF-конструктор;
- сложная аналитика;
- мобильное приложение.

## Стек

Frontend:

- React;
- TypeScript;
- Vite;
- React Router;
- TanStack Query;
- React Hook Form;
- Zod;
- Tailwind CSS;
- shadcn/ui.

Backend:

- FastAPI;
- SQLAlchemy;
- Alembic;
- Pydantic;
- PostgreSQL;
- JWT auth.

Infrastructure:

- Docker;
- Docker Compose;
- environment variables for secrets.

## Документация

- [MVP](docs/MVP.md)
- [Roadmap](docs/ROADMAP.md)
- [Data Model](docs/DATA_MODEL.md)
- [API](docs/API.md)
- [AI Rules](docs/AI.md)
