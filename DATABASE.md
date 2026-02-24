# Database Setup - Drizzle ORM with Neon

This project uses Drizzle ORM with a Neon Postgres database.

## 📁 Project Structure

```
├── src/
│   └── db/
│       ├── index.ts        # Database connection instance
│       ├── schema.ts       # Database schema definitions
│       └── example.ts      # Example CRUD operations
├── drizzle/               # Migration files (auto-generated)
├── drizzle.config.ts      # Drizzle Kit configuration
└── .env.local            # Environment variables (DATABASE_URL)
```

## 🚀 Available Commands

```bash
# Push schema changes directly to database (for development)
npm run db:push

# Generate migration files from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Open Drizzle Studio (visual database browser)
npm run db:studio

# Run the example CRUD operations
npm run db:example
```

## 📝 Using the Database

### Import the database instance

```typescript
import { db } from '@/db';
import { yourTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
```

### Create (Insert)

```typescript
await db.insert(yourTable).values({
  userId: 'clerk_user_id',
  title: 'Example',
  // ... your columns
});
```

### Read (Select)

```typescript
// Get all items
const items = await db.select().from(yourTable);

// Get specific item
const item = await db
  .select()
  .from(yourTable)
  .where(eq(yourTable.id, id));
```

### Update

```typescript
await db
  .update(yourTable)
  .set({ title: 'Updated' })
  .where(eq(yourTable.id, id));
```

### Delete

```typescript
await db
  .delete(yourTable)
  .where(eq(yourTable.id, id));
```

## 🔄 Workflow

### Fresh Database Setup

For a new Neon project or empty database:

```bash
npm run db:migrate
```

This applies all migrations in `drizzle/` (0000 → 0001 → 0002). Migrations are idempotent where possible (e.g. `CREATE TABLE IF NOT EXISTS`).

### Development (Quick Changes)

1. Modify `src/db/schema.ts`
2. Run `npm run db:push` to apply changes immediately

### Production (With Migrations)

1. Modify `src/db/schema.ts`
2. Run `npm run db:generate` to create migration files
3. Run `npm run db:migrate` to apply migrations

## 🎨 Drizzle Studio

Launch the visual database browser:

```bash
npm run db:studio
```

This will open a web interface where you can view and edit your database tables.

## 📚 Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Neon Documentation](https://neon.tech/docs)
- [Drizzle with Next.js](https://orm.drizzle.team/docs/get-started-postgresql#nextjs)
