# marketing strategie tool

A clean Next.js foundation for building SaaS products with:

- **Clerk** – Authentication and billing
- **Neon** – PostgreSQL database
- **Drizzle ORM** – Type-safe database access
- **OpenAI** – AI SDK integration
- **shadcn/ui** – UI components

## Getting Started

### 1. Environment Variables

Create `.env.local` with:

```bash
# Clerk (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database - Neon (required for DB features)
DATABASE_URL=postgresql://...

# OpenAI (required for AI features)
OPENAI_API_KEY=sk-...
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Push schema to database (development)
npm run db:push

# Or run migrations
npm run db:migrate

# Test connection
npm run db:example
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── actions/       # Server actions (e.g. ai-actions.ts)
│   ├── dashboard/     # Protected dashboard
│   ├── pricing/       # Clerk pricing table
│   └── page.tsx       # Landing page
├── components/ui/     # shadcn components
├── db/
│   ├── index.ts       # Database connection
│   ├── schema.ts      # Add your tables here
│   └── example.ts     # Connection test
└── lib/
```

## Commands

- `npm run dev` – Start dev server
- `npm run build` – Production build
- `npm run db:push` – Push schema to DB
- `npm run db:generate` – Generate migrations
- `npm run db:migrate` – Run migrations
- `npm run db:studio` – Open Drizzle Studio
- `npm run db:example` – Test DB connection

## Next Steps

1. Add your tables to `src/db/schema.ts`
2. Create server actions in `src/app/actions/`
3. Build your features in the dashboard
4. Configure plans and features in Clerk Dashboard
