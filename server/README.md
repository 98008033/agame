# Agame Server

Backend server for Agame - a faction-strategy narrative game.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express
- **Language**: TypeScript (strict mode)
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Cache**: Redis
- **Scheduler**: node-cron

## Project Structure

```
server/
├── src/
│   ├── agents/       # Agent system (LLM-driven NPCs)
│   ├── services/     # Business logic services
│   ├── models/       # Prisma client and types
│   ├── routes/       # API route handlers
│   ├── utils/        # Helper functions
│   ├── middleware/   # Express middleware
│   └── index.ts      # Entry point
├── prisma/
│   └── schema.prisma # Database schema
├── dist/             # Compiled output
└── tests/            # Test files
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. Setup database:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

## API Endpoints

See docs/api-interface.md for full API specification.

## Scripts

- `npm run dev` - Development with hot reload
- `npm run build` - Compile TypeScript
- `npm run start` - Production server
- `npm run lint` - Check code quality
- `npm run prisma:studio` - Database GUI