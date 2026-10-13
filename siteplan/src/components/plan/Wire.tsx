import type { SectionKind } from "@/lib/schema/catalog";

/** Miniatura de estrutura por tipo de seção. Representa a organização do conteúdo, não o visual final. */
export function Wire({ kind }: { kind: SectionKind }) {
  const bar = (w: string, strong = false) => <div className="h-[4px] rounded-full" style={{ width: w, background: strong ? "var(--color-ink-3)" : "var(--color-line-strong)" }} />;
  const box = (cls = "") => <div className={`rounded-[2px] bg-sunken ring-1 ring-line-strong/70 ${cls}`} />;
  let inner: React.ReactNode;
  switch (kind) {
    case "hero":
      inner = (
        <div className="grid h-full grid-cols-[1.3fr_1fr] gap-1.5">
          <div className="flex flex-col justify-center gap-1">
            {bar("95%", true)}
            {bar("70%", true)}
            {bar("80%")}
            <div className="mt-0.5 h-[7px] w-[55%] rounded-[2px] bg-accent" />
          </div>
          {box("h-full")}
        </div>
      );
      break;
    case "servicos":
    case "faq":
    case "conteudo":
      inner = (
        <div className="flex h-full flex-col justify-center gap-[5px]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between border-b border-line pb-[3px]">
              {bar(`${60 - i * 6}%`, true)}
              <div className="size-[4px] rounded-full bg-line-strong" />
            </div>
          ))}
        </div>
      );
      break;
    case "produtos":
    case "portfolio":
    case "equipe":
      inner = <div className="grid h-full grid-cols-3 gap-1">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i}>{box("h-full")}</div>)}</div>;
      break;
    case "beneficios":
    case "autoridade":
    case "problema-solucao":
      inner = (
        <div className="grid h-full grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col justify-center gap-1">
              {bar("80%", true)}
              {bar("100%")}
              {bar("70%")}
            </div>
          ))}
        </div>
      );
      break;
    case "processo":
      inner = (
        <div className="flex h-full items-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 flex-col items-start gap-1">
              <div className="grid size-[9px] place-items-center rounded-full bg-ink-3" />
              {bar("90%")}
            </div>
          ))}
        </div>
      );
      break;
    case "depoimentos":
      inner = (
        <div className="grid h-full grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col justify-between rounded-[2px] p-[3px] ring-1 ring-line-strong/70">
              {bar("100%")}
              {bar("60%", true)}
            </div>
          ))}
        </div>
      );
      break;
    case "comparacao":
    case "precos":
      inner = (
        <div className="grid h-full grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`flex flex-col gap-[3px] rounded-[2px] p-[3px] ring-1 ${i === 1 ? "ring-accent" : "ring-line-strong/70"}`}>
              {bar("70%", true)}
              {bar("100%")}
              {bar("100%")}
            </div>
          ))}
        </div>
      );
      break;
    case "formulario":
      inner = (
        <div className="grid h-full grid-cols-[1fr_1.2fr] gap-1.5">
          <div className="flex flex-col justify-center gap-1">
            {bar("90%", true)}
            {bar("70%")}
          </div>
          <div className="flex flex-col justify-center gap-[3px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[6px] rounded-[2px] ring-1 ring-line-strong" />
            ))}
            <div className="h-[6px] w-1/2 rounded-[2px] bg-accent" />
          </div>
        </div>
      );
      break;
    case "contato":
      inner = (
        <div className="grid h-full grid-cols-2 gap-1.5">
          <div className="flex flex-col justify-center gap-1">
            {bar("80%", true)}
            {bar("90%")}
            {bar("60%")}
          </div>
          {box("h-full")}
        </div>
      );
      break;
    case "cta-final":
      inner = (
        <div className="flex h-full flex-col items-center justify-center gap-1 rounded-[2px] bg-accent-soft">
          {bar("60%", true)}
          <div className="h-[7px] w-[34%] rounded-[2px] bg-accent" />
        </div>
      );
      break;
    default:
      inner = (
        <div className="flex h-full flex-col justify-center gap-1">
          {bar("50%", true)}
          {bar("95%")}
          {bar("90%")}
          {bar("70%")}
        </div>
      );
  }
  return (
    <div aria-hidden className="h-[46px] w-[72px] shrink-0 rounded-[4px] border border-line bg-surface p-[5px]">
      {inner}
    </div>
  );
}
