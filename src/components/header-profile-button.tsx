"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Standard-Profilbild, bis der Nutzer in Clerk ein eigenes Bild hochlädt. */
const DEFAULT_PROFILE_IMAGE = "/profil_picture.png";

export function HeaderProfileButton() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();

  const profileHref =
    pathname && pathname !== "/user" && !pathname.startsWith("/user/")
      ? `/user?returnTo=${encodeURIComponent(pathname)}`
      : "/user";

  // Eigenes Profilbild nur nutzen, wenn der Nutzer in Clerk ein Bild hochgeladen hat (hasImage = true).
  const imageSrc =
    user?.hasImage && user?.imageUrl ? user.imageUrl : DEFAULT_PROFILE_IMAGE;
  const isLocalImage = imageSrc.startsWith("/");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex shrink-0 rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
            "size-9 sm:size-10",
            "overflow-hidden border border-border/60 bg-muted"
          )}
          aria-label="Profil öffnen"
        >
          {isLocalImage ? (
            <Image
              src={imageSrc}
              alt="Profil"
              fill
              sizes="(max-width: 640px) 36px, 40px"
              className="object-cover object-top"
              priority
            />
          ) : (
            <img
              src={`${imageSrc}?width=80&height=80&fit=crop&quality=85`}
              alt="Profil"
              className="size-full object-cover object-center"
            />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={profileHref}>Profil verwalten</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => signOut({ redirectUrl: "/" })}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
