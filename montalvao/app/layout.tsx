import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { loja, mensagens } from "@/content/loja";
import { PREVIA } from "@/lib/modo";
import { SITE_URL } from "@/lib/site";
import { linkWhatsApp } from "@/lib/whatsapp";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Revelador } from "@/components/Revelador";
import { BotaoFlutuante } from "@/components/BotaoFlutuante";
import { MarcaPrevia } from "@/components/MarcaPrevia";

// Uma família (Archivo, variável em peso e largura), servida pelo próprio site.
const archivo = localFont({
  src: "./fonts/archivo-latin-wdth-normal.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

const descricao =
  "Montalvão Motors: conheça a loja, veja os veículos e fale com a equipe sobre o carro que você procura.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${loja.nome} · Loja de veículos`, template: `%s · ${loja.nome}` },
  description: descricao,
  applicationName: loja.nome,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: loja.nome,
    title: `${loja.nome} · Loja de veículos`,
    description: descricao,
    images: [{ url: "/midia/og.jpg", width: 1200, height: 630, alt: "Salão da Montalvão Motors com carros enfileirados" }],
  },
  twitter: { card: "summary_large_image" },
  // A prévia nunca deve ser indexada.
  robots: PREVIA ? { index: false, follow: false } : { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const whatsapp = linkWhatsApp(mensagens.geral);
  return (
    <html lang="pt-BR" className={archivo.variable}>
      <head>
        {/* Marca que há JS antes da pintura: as animações de entrada só escondem conteúdo nesse caso. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <Cabecalho />
        <div id="pagina">
          <main id="conteudo" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Rodape />
          {whatsapp && <BotaoFlutuante href={whatsapp} />}
          <MarcaPrevia />
        </div>
        <Revelador />
      </body>
    </html>
  );
}
