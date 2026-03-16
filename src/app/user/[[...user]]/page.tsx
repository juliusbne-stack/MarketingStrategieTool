import { UserProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
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
