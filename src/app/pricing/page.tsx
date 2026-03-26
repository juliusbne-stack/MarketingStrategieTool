import PricingContentClient from '../../components/PricingContentClient';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            Unlock more features with Pro
          </p>
        </div>

        <PricingContentClient />
      </div>
    </div>
  );
}
