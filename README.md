# Stoc Backend API

REST API server for the Stoc social feed sharing application.

## Features

- User authentication (JWT)
- Feed post storage and retrieval
- One-time sharing link generation
- Subscription management
- Rate limiting and security middleware
- PostgreSQL database with Prisma ORM

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

3. Set up the database:
```bash
npm run db:generate
npm run db:migrate
```

4. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/login` - User login

### Feeds
- `GET /feeds/posts` - Get user's feed posts
- `GET /feeds/posts/:userId` - Get specific user's feed posts
- `POST /feeds/posts` - Save new feed post

### Sharing
- `POST /sharing/create` - Create one-time sharing link
- `POST /sharing/redeem` - Redeem sharing link and subscribe

### Subscriptions
- `GET /subscriptions` - Get user's subscriptions
- `DELETE /subscriptions/:id` - Unsubscribe from user

## Database Schema

See `prisma/schema.prisma` for the complete database schema.

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run db:studio` - Open Prisma Studio for database management
