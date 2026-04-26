"use client";

import { PricingTable } from "@clerk/nextjs";

export default function PricingContent() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 text-center text-sm text-muted-foreground">
        Pricing requires{" "}
        <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>{" "}
        (ClerkProvider). Configure it on your host and redeploy.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8">
      <PricingTable />
    </div>
  );
}
