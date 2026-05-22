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
7. менять статус заявки на доске заявок;
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
Клиент -> Заявка -> Варианты тура -> Предложение -> Копирование -> Доска заявок -> Напоминание -> Дашборд
```

## Скриншоты

Скриншоты сделаны на demo data из `app.demo_seed`.

![Дашборд TripFlow](docs/screenshots/dashboard.png)

![Заявка и варианты тура](docs/screenshots/request-detail.png)

![Предложение для клиента](docs/screenshots/proposal.png)

![Доска заявок](docs/screenshots/pipeline.png)

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
6. Сменить статус заявки на доске заявок.
7. Создать напоминание.
8. Проверить, что сегодняшнее напоминание видно на dashboard.

## MVP walkthrough

Демонстрационный сценарий после `docker compose up --build` и `docker compose exec backend python -m app.demo_seed`:

1. Войти под `agent@example.com` / `strong-password`.
2. Открыть дашборд и убедиться, что видно сегодняшнее напоминание, заявки в работе и недавнего клиента.
3. Перейти в клиента Анну Петрову и проверить контакты, предпочтения и заявку по Белеку.
4. Открыть заявку: проверить параметры поездки, варианты тура, recommended option, заметки коммуникации и предложения.
5. Создать или отредактировать предложение, открыть превью и скопировать текст для ручной отправки в Telegram / WhatsApp.
6. На доске заявок сменить статус и убедиться, что карточка остается в рабочем маршруте турагента.
7. Создать follow-up в напоминаниях, связать его с клиентом и заявкой, затем проверить появление на дашборде.

## Demo script для турагента

1. Войти под `agent@example.com` / `strong-password` и открыть дашборд как утренний рабочий экран.
2. Показать сегодняшнее напоминание и объяснить, что агент сразу видит, кому нужно написать.
3. Открыть клиента Анну Петрову: контакты, предпочтения и история коммуникаций лежат рядом с заявками.
4. Перейти в заявку по Белеку: проверить вводные, варианты тура и рекомендованный вариант.
5. Открыть предложения, отредактировать текст и скопировать его для ручной отправки в Telegram / WhatsApp.
6. Вернуться на доску заявок и передвинуть заявку в следующий статус.
7. Создать follow-up после отправки предложения и показать, что он появится в ежедневной работе.

## Переменные окружения

| Переменная | Назначение | Пример для локального запуска |
| --- | --- | --- |
| `POSTGRES_DB` | Имя базы PostgreSQL. | `tripflow` |
| `POSTGRES_USER` | Пользователь PostgreSQL. | `tripflow` |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL для локального контейнера. | `tripflow_local_password` |
| `DATABASE_URL` | SQLAlchemy URL backend-базы. | `postgresql+psycopg://tripflow:tripflow_local_password@postgres:5432/tripflow` |
| `BACKEND_CORS_ORIGINS` | Разрешенные frontend origins для API. | `http://localhost:5173,http://127.0.0.1:5173` |
| `JWT_SECRET_KEY` | Секрет для подписи JWT. В demo можно локальный, в production заменить. | `change-this-local-secret` |
| `VITE_API_URL` | URL backend API для frontend. | `http://localhost:8000` |
| `TIMEWEB_AI_AGENT_URL` | URL AI-провайдера для генерации черновиков. Можно оставить пустым без AI. | пусто |
| `TIMEWEB_AI_API_TOKEN` | Токен AI-провайдера. Не коммитить реальные значения. | пусто |
| `AI_MODEL` | Название модели для AI-сервиса. | `gpt-4o-mini` |

## Документация

- [MVP](docs/MVP.md)
- [Roadmap](docs/ROADMAP.md)
- [Data Model](docs/DATA_MODEL.md)
- [API](docs/API.md)
- [AI Rules](docs/AI.md)
