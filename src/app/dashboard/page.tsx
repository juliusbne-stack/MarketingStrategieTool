import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { decksTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { DeckCard } from "./deck-card";
import { EmptyState } from "./empty-state";
import { LoadingSkeleton } from "./loading-skeleton";

async function UserDecks() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Fetch user's decks from database
  const decks = await db
    .select()
    .from(decksTable)
    .where(eq(decksTable.userId, userId))
    .orderBy(desc(decksTable.updatedAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Your Decks</h2>
        {decks.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {decks.length} {decks.length === 1 ? "deck" : "decks"}
          </span>
        )}
      </div>

      {decks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              id={deck.id}
              title={deck.title}
              description={deck.description}
              createdAt={deck.createdAt}
              updatedAt={deck.updatedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome to your flashcard dashboard
          </p>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <UserDecks />
        </Suspense>
      </div>
    </div>
  );
}
