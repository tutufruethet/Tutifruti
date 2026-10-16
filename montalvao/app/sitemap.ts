import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { veiculosVisiveis } from "@/lib/veiculos";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const paginas = ["/", "/veiculos/", "/a-montalvao/", "/privacidade/"];
  return [
    ...paginas.map((p) => ({ url: `${SITE_URL}${p}` })),
    // Demonstração nunca entra no sitemap.
    ...veiculosVisiveis.filter((v) => v.publicado).map((v) => ({ url: `${SITE_URL}/veiculos/${v.slug}/` })),
  ];
}
