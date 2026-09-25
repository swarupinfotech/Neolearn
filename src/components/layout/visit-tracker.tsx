"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Fires one page-view beacon per navigation. Silent by design: it must never
 * block navigation, so every failure is swallowed and the request is sent with
 * keepalive so it survives a page unload right after a click.
 */
export function VisitTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer && document.referrer !== location.href ? document.referrer : null,
    });

    try {
      const url = "/api/track";
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
        return;
      }
      void fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* analytics must never break navigation */
    }
  }, [pathname]);

  return null;
}
