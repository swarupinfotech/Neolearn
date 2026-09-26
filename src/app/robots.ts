import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Learner area, lesson player, quiz runner and API routes are all
 * behind authentication and are explicitly `noindex`, so they are
 * disallowed here rather than merely omitted from the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/courses", "/courses/", "/about", "/pricing", "/blog", "/blog/"],
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/learn/",
          "/quiz/",
          "/challenges/",
          "/projects/",
          "/paths/",
          "/community/",
          "/search",
          "/settings",
          "/profile",
          "/onboarding",
          "/login",
          "/signup",
          "/verify/",
          "/certificates",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
