"use client";
import { useState } from "react";
import { useG } from "@/store/game";
import { formatDate } from "@/engine/world/players";
import type { NewsItem } from "@/engine/types";
import { PageTitle } from "@/components/ui";

const TAGS: { id: NewsItem["tag"] | "todas" | "meu"; label: string }[] = [
  { id: "todas", label: "Todas" }, { id: "meu", label: "Meu time" }, { id: "carreira", label: "Carreira" }, { id: "transferencia", label: "Transferências" },
  { id: "titulo", label: "Títulos" }, { id: "lesao", label: "Lesões" }, { id: "pressao", label: "Pressão" }, { id: "promessa", label: "Promessas" },
  { id: "quimica", label: "Química" }, { id: "selecao", label: "Seleção" }, { id: "premio", label: "Prêmios" },
];

export default function Noticias() {
  const g = useG();
  const [tag, setTag] = useState<(typeof TAGS)[number]["id"]>("todas");
  const list = g.news.filter((n) => tag === "todas" || (tag === "meu" ? n.clubIds?.includes(g.user.clubId ?? "") || n.playerIds?.includes(g.user.playerId ?? "") : n.tag === tag));
  return (
    <div>
      <PageTitle kicker="(09) Notícias" title="Notícias" meta={<span>{g.news.length} manchetes nesta carreira</span>} />
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">{TAGS.map((t) => <button key={t.id} className="chip shrink-0" data-on={tag === t.id} onClick={() => setTag(t.id)}>{t.label}</button>)}</div>
      <ul className="max-w-3xl">
        {list.slice(0, 150).map((n, i) => (
          <li key={n.id} className={`border-b line py-4 ${i < 6 ? `rise rise-${Math.min(4, i)}` : ""}`}>
            <div className="label">{formatDate(n.day)} · {n.tag}</div>
            <h2 className={`mt-1.5 ${n.importance >= 3 ? "text-xl" : "text-[16px]"}`}>{n.title}</h2>
            {n.body && <p className="dim mt-1 text-sm leading-relaxed">{n.body}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
