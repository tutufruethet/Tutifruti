import type { NextConfig } from "next";

if (process.env.NEXT_PUBLIC_MODO === "publico" && !process.env.NEXT_PUBLIC_SITE_URL) {
  console.warn("\n⚠ NEXT_PUBLIC_SITE_URL não definido: links absolutos (Open Graph, sitemap, mensagem do WhatsApp) vão usar localhost.\n");
}

const config: NextConfig = {
  // Site estático: cada página e cada veículo viram HTML em out/, hospedável em qualquer servidor.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
