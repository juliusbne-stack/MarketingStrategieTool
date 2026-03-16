"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, LayoutDashboardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProfileBackNavProps = {
  returnTo: string | null;
};

export function ProfileBackNav({ returnTo }: ProfileBackNavProps) {
  const router = useRouter();

  return (
    <div className="container mx-auto flex flex-wrap items-center gap-2 px-4 pb-4 pt-2">
      {returnTo ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href={returnTo} className="gap-2">
            <ArrowLeftIcon className="size-4" />
            Zurück zur vorherigen Seite
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeftIcon className="size-4" />
          Zurück
        </Button>
      )}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard" className="gap-2">
          <LayoutDashboardIcon className="size-4" />
          Zum Dashboard
        </Link>
      </Button>
    </div>
  );
}
