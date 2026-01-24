# Rizz Backend

Node.js/Express backend для Telegram Mini App генератора сообщений для знакомств.

## Технологии

- Node.js + TypeScript
- Express
- Prisma (PostgreSQL)
- OpenAI API
- Vercel (serverless deployment)

## Установка

```bash
cd backend
npm install
npx prisma generate
```

## Настройка

Создайте `.env` файл на основе `.env.example`:

```bash
cp .env.example .env
```

Заполните переменные:
- `DATABASE_URL` — connection string из Supabase (Settings → Database → Connection string → URI)
- `OPENAI_API_KEY` — API ключ OpenAI

## Локальная разработка

```bash
npm run dev
```

Сервер запустится на `http://localhost:3001`

## Деплой на Vercel

1. Установите Vercel CLI:
```bash
npm i -g vercel
```

2. Залогиньтесь:
```bash
vercel login
```

3. Деплой:
```bash
cd backend
vercel
```

4. Добавьте переменные окружения в Vercel Dashboard:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`

## API Endpoints

### POST /auth/telegram

Регистрация/авторизация пользователя Telegram.

**Request:**
```json
{
  "telegram_id": 123456789,
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "language": "ru"
}
```

**Response:**
```json
{
  "user_id": "uuid-string"
}
```

### POST /generate

Генерация сообщений.

**Request:**
```json
{
  "user_id": "uuid-string",
  "platform": "tinder",
  "stage": "first",
  "girl_info": "Любит путешествия, на фото в Париже"
}
```

**Response:**
```json
{
  "messages": [
    "Сообщение 1",
    "Сообщение 2", 
    "Сообщение 3"
  ]
}
```

## Платформы

- `tinder` — Tinder
- `pure` — Pure
- `twinby` — Twinby
- `telegram` — Telegram
- `instagram` — Instagram
- `real` — Реальная жизнь

## Стадии

- `first` — Первое сообщение
- `transition` — Переход в мессенджер
- `chatting` — Уже общаемся
