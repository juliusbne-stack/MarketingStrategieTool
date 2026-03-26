'use client';
import dynamic from 'next/dynamic';

const PricingContent = dynamic(
  () => import('../app/pricing/pricing-content'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8 text-center text-zinc-500">
        Loading pricing…
      </div>
    ),
  }
);

export default function PricingContentClient() {
  return <PricingContent />;
}
