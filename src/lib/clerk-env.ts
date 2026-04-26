/** True when Clerk client SDK may be used (matches root layout ClerkProvider branch). */
export function isClerkPublishableKeyConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}
