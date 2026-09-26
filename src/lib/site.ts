// ============================================================
// Canonical site origin.
//
// One place to resolve the public origin so canonical URLs, sitemaps
// and JSON-LD never disagree with `metadataBase` in the root layout.
// ============================================================

/** Public origin without a trailing slash. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${p}`;
}
