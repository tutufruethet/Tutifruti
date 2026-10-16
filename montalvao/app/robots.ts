import type { MetadataRoute } from "next";
import { PREVIA } from "@/lib/modo";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (PREVIA) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: "/previa/" }, sitemap: `${SITE_URL}/sitemap.xml` };
}
