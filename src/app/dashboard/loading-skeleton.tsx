export function LoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 animate-pulse"
        >
          <div className="flex flex-col h-full">
            <div className="flex-1 mb-4">
              <div className="h-6 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-full mb-1" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
            <div className="h-4 bg-muted rounded w-24 mb-4" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
