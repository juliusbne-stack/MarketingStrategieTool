"use client";

import { PricingTable } from "@clerk/nextjs";

export default function PricingContent() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8">
      <PricingTable />
    </div>
  );
}
