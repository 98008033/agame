# Agame Deployment Guide

## Prerequisites

- Node.js v18+ (tested with v25)
- npm
- SQLite (default for development) or PostgreSQL (production)
- At least one LLM API key (Zhipu, Qwen, or Ernie)

## Quick Start (Development)

### 1. Install Dependencies

```bash
# Server
cd server && npm install

# Web
cd web && npm install
```

### 2. Environment Setup

**Server** (`server/.env`):
```bash
cp server/.env.example server/.env
# Edit server/.env and set at least one LLM API key
```

Required server variables:
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | Database connection | `file:./prisma/dev.db` (SQLite) |
| `JWT_SECRET` | JWT signing secret | _(must set)_ |
| `JWT_EXPIRES_IN` | Token expiry | `24h` |
| `ZHIPU_API_KEY` | Zhipu (GLM-4) API key | _(empty)_ |
| `QWEN_API_KEY` | Alibaba Qwen API key | _(empty)_ |
| `ERNIE_API_KEY` | Baidu Ernie API key | _(empty)_ |
| `ERNIE_SECRET_KEY` | Baidu Ernie secret | _(empty)_ |

**Web** (`web/.env`):
```bash
cp web/.env.example web/.env
```

Required web variables:
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:3000/v1` |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:3000` |

### 3. Database Setup

```bash
cd server

# Generate Prisma client
npx prisma generate

# Push schema to database (SQLite dev)
npx prisma db push

# Or for production with migrations:
# npx prisma migrate deploy

# Seed initial data
npm run db:seed
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd web && npm run dev
```

## Production Build

### Build Server

```bash
cd server && npm run build
```

Output: `server/dist/`

### Build Web

```bash
cd web && npm run build
```

Output: `web/dist/`

### Start Production Server

```bash
cd server && node dist/index.js
```

### Serve Web Frontend

Option 1 - Vite preview (not for production):
```bash
cd web && npm run preview
```

Option 2 - Any static file server (nginx, Caddy, etc.) pointing at `web/dist/`:
```bash
npx serve web/dist
```

Option 3 - Serve from backend (configure Express to serve static files):
```bash
# Add to server/src/index.ts before app.listen():
app.use(express.static(path.join(__dirname, '../../web/dist')))
```

## Verification

### Health Check
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"...","version":"v1.0.0"}
```

### Auth Test
```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123","email":"test@test.com"}'
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000
# Kill the process if needed
kill <PID>
```

### Database Issues
```bash
# Reset database (WARNING: deletes all data)
cd server && npx prisma migrate reset

# Re-seed after reset
npm run db:seed
```

### Build Failures
- Server: Ensure all TypeScript errors are resolved (`npm run build`)
- Web: Check for unused imports/variables (`npm run build`)
- Run `npm install` in both directories to ensure dependencies are up to date

### LLM API Errors
- At least one of `ZHIPU_API_KEY`, `QWEN_API_KEY`, or `ERNIE_API_KEY` must be set
- The system falls back through providers in order: GLM-4 → Qwen → Ernie
- Without any keys, agent-generated events will fail

### WebSocket Connection Issues
- Ensure `VITE_WS_URL` matches the server's actual host and port
- For production behind a reverse proxy, configure WebSocket upgrade headers
