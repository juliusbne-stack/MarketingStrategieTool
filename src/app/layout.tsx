import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Link from "next/link";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { HeaderProfileButton } from "@/components/header-profile-button";
import { dark } from "@clerk/themes";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Your Marketing Strategic Agent",
  description: "A clean foundation for building SaaS products",
};

function AppHeader() {
  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-6 pl-6">
          <h1 className="text-xl font-semibold">Your Marketing Strategic Agent</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View pricing
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <HeaderProfileButton />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="en" className="dark">
      <body
        className={`${poppins.variable} font-sans antialiased`}
      >
        {clerkKey ? (
          <ClerkProvider
            appearance={{
              baseTheme: dark,
            }}
          >
            <AppHeader />
            {children}
          </ClerkProvider>
        ) : (
          <>
            <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
                <div className="flex items-center gap-6 pl-6">
                  <h1 className="text-xl font-semibold">Your Marketing Strategic Agent</h1>
                </div>
              </div>
            </header>
            {children}
          </>
        )}
      </body>
    </html>
  );
}
