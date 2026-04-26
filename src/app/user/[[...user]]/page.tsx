import { UserProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { isClerkPublishableKeyConfigured } from "@/lib/clerk-env";
import { ProfileBackNav } from "./profile-back-nav";

type UserProfilePageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function UserProfilePage({ searchParams }: UserProfilePageProps) {
  const { returnTo } = await searchParams;
  const safeReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : null;

  if (!isClerkPublishableKeyConfigured()) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-4 text-center text-sm text-muted-foreground">
        <p>
          User profile requires{" "}
          <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>.
        </p>
        <ProfileBackNav returnTo={safeReturnTo} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col">
      <ProfileBackNav returnTo={safeReturnTo} />
      <div className="flex flex-1 items-start justify-center py-8">
        <UserProfile
          appearance={{
            baseTheme: dark,
          }}
        />
      </div>
    </div>
  );
}
