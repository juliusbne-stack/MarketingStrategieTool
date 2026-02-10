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
import { usersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
```

### Create (Insert)

```typescript
await db.insert(usersTable).values({
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
});
```

### Read (Select)

```typescript
// Get all users
const users = await db.select().from(usersTable);

// Get specific user
const user = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, 'john@example.com'));
```

### Update

```typescript
await db
  .update(usersTable)
  .set({ age: 31 })
  .where(eq(usersTable.email, 'john@example.com'));
```

### Delete

```typescript
await db
  .delete(usersTable)
  .where(eq(usersTable.email, 'john@example.com'));
```

## 🔄 Workflow

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
