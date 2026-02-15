import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function NewDeckPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Create New Deck
          </h1>
          <p className="text-muted-foreground mt-2">
            Create a new flashcard deck to start learning
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8">
          <p className="text-center text-muted-foreground">
            Deck creation form coming soon!
          </p>
        </div>
      </div>
    </div>
  );
}
