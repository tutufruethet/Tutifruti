import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";

const ui = Instrument_Sans({ subsets: ["latin"], variable: "--font-ui", weight: ["400", "500", "600"] });
const num = JetBrains_Mono({ subsets: ["latin"], variable: "--font-num", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Football Legacy",
  description: "Simulador de carreira de futebol: jogador ou treinador, temporadas infinitas, amizades no vestiário.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#0e100f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${ui.variable} ${num.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
