import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { decksTable, cardsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";

interface StudyPageProps {
  params: Promise<{
    deckId: string;
  }>;
}

export default async function StudyPage({ params }: StudyPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { deckId } = await params;
  const deckIdNum = parseInt(deckId, 10);

  if (isNaN(deckIdNum)) {
    notFound();
  }

  // Fetch deck and verify ownership
  const deck = await db
    .select()
    .from(decksTable)
    .where(and(eq(decksTable.id, deckIdNum), eq(decksTable.userId, userId)))
    .limit(1);

  if (!deck[0]) {
    notFound();
  }

  // Fetch cards for this deck
  const cards = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.deckId, deckIdNum));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {deck[0].title}
          </h1>
          {deck[0].description && (
            <p className="text-muted-foreground mt-2">{deck[0].description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            {cards.length} {cards.length === 1 ? "card" : "cards"} in this deck
          </p>
        </div>

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              No cards yet
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add some flashcards to this deck to start studying.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8">
            <p className="text-center text-muted-foreground">
              Study interface coming soon! This deck contains {cards.length}{" "}
              flashcards ready to study.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
