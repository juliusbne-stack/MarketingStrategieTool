import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center justify-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold tracking-tight text-black dark:text-zinc-50">
            SaaS Template
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            A clean foundation for your next product
          </p>
        </div>
        <div className="flex gap-4 mt-4">
          <SignInButton mode="modal">
            <button className="px-6 py-2 rounded-lg bg-black text-white hover:bg-zinc-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-zinc-200">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-6 py-2 rounded-lg border border-black text-black hover:bg-black hover:text-white transition-colors dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </main>
    </div>
  );
}
