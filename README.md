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

## Быстрый старт через Docker Compose

Скопируйте пример переменных окружения:

```bash
cp .env.example .env
```

Запустите локальный стек:

```bash
docker compose up --build
```

Backend-контейнер автоматически применит миграции Alembic перед запуском API.

После запуска:

- frontend: http://localhost:5173
- backend health: http://localhost:8000/health
- PostgreSQL: `localhost:5432`

## Demo data

После первого запуска можно заполнить базу демонстрационным MVP-сценарием:

```bash
docker compose exec backend python -m app.demo_seed
```

Тестовый пользователь:

- email: `agent@example.com`
- password: `strong-password`

Demo-сценарий включает клиента, предпочтения, заявку на семейную Турцию, три
варианта тура, готовое предложение, заметку коммуникации и напоминание на
сегодня. Этого достаточно, чтобы пройти основной маршрут:

```text
Клиент -> Заявка -> Варианты тура -> Предложение -> Копирование -> Pipeline -> Напоминание -> Dashboard
```

Если нужно применить миграции вручную:

```bash
docker compose exec backend alembic upgrade head
```

Остановить стек:

```bash
docker compose down
```

Остановить стек и удалить локальные данные PostgreSQL:

```bash
docker compose down -v
```

## Локальный запуск без Docker

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Проверка backend:

```bash
curl http://localhost:8000/health
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend будет доступен на http://localhost:5173.

## Команды проверки

Frontend build:

```bash
cd frontend
npm run build
```

Backend import check:

```bash
cd backend
python -c "from app.main import app; print(app.title)"
```

Backend tests:

```bash
cd backend
pytest
```

Manual MVP smoke-check:

1. Войти под demo-пользователем.
2. Открыть клиента Анну Петрову.
3. Открыть заявку по Белеку.
4. Проверить варианты тура и recommended option.
5. Создать или отредактировать proposal и скопировать текст.
6. Сменить статус заявки в pipeline.
7. Создать напоминание.
8. Проверить, что сегодняшнее напоминание видно на dashboard.

## MVP walkthrough

Демонстрационный сценарий после `docker compose up --build` и `docker compose exec backend python -m app.demo_seed`:

1. Войти под `agent@example.com` / `strong-password`.
2. Открыть дашборд и убедиться, что видно сегодняшнее напоминание, заявки в работе и недавнего клиента.
3. Перейти в клиента Анну Петрову и проверить контакты, предпочтения и заявку по Белеку.
4. Открыть заявку: проверить параметры поездки, варианты тура, recommended option, заметки коммуникации и предложения.
5. Создать или отредактировать предложение, открыть превью и скопировать текст для ручной отправки в Telegram / WhatsApp.
6. На pipeline сменить статус заявки и убедиться, что карточка остается в рабочем маршруте турагента.
7. Создать follow-up в напоминаниях, связать его с клиентом и заявкой, затем проверить появление на дашборде.

## Документация

- [MVP](docs/MVP.md)
- [Roadmap](docs/ROADMAP.md)
- [Data Model](docs/DATA_MODEL.md)
- [API](docs/API.md)
- [AI Rules](docs/AI.md)
