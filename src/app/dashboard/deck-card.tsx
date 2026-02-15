import Link from "next/link";

interface DeckCardProps {
  id: number;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function DeckCard({ id, title, description, createdAt, updatedAt }: DeckCardProps) {
  return (
    <Link
      href={`/study/${id}`}
      className="group relative block rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50"
    >
      <div className="flex flex-col h-full p-6">
        {/* Date badge */}
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Updated {updatedAt.toLocaleDateString()}
          </span>
        </div>

        {/* Deck info */}
        <div className="flex-1 mb-4 pr-24">
          <h3 className="text-xl font-semibold mb-2 text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Status label */}
        <div>
          <span className="inline-flex items-center text-sm text-emerald-600 dark:text-emerald-400">
            <svg
              className="mr-1.5 h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Ready to study
          </span>
        </div>
      </div>
    </Link>
  );
}
