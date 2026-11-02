/**
 * Salvamento local em IndexedDB (idb-keyval), comprimido com gzip quando o
 * navegador suporta CompressionStream. A interface de "SaveBackend" deixa a
 * porta aberta para sincronização em nuvem no futuro, sem implementá-la agora.
 */
import { createStore, del, get, set } from "idb-keyval";
import type { GameState } from "@/engine/types";

export interface SaveMeta {
  id: string;
  name: string;
  mode: "player" | "coach";
  season: number;
  day: number;
  club: string;
  updatedAt: number;
}

export interface HallEntry {
  id: string;
  name: string;
  mode: "player" | "coach";
  seasons: number;
  score: number;
  goals?: number;
  apps?: number;
  titles: number;
  awards: number;
  peakOvr?: number;
  clubs: string[];
  endedAt: number;
}

export interface SaveBackend {
  list(): Promise<SaveMeta[]>;
  load(id: string): Promise<GameState | null>;
  save(g: GameState): Promise<void>;
  remove(id: string): Promise<void>;
}

const store = typeof indexedDB !== "undefined" ? createStore("football-legacy", "saves") : undefined;

async function gzip(text: string): Promise<Blob | string> {
  if (typeof CompressionStream === "undefined") return text;
  const cs = new CompressionStream("gzip");
  const stream = new Blob([text]).stream().pipeThrough(cs);
  return await new Response(stream).blob();
}

async function gunzip(data: Blob | string): Promise<string> {
  if (typeof data === "string") return data;
  const ds = new DecompressionStream("gzip");
  return await new Response(data.stream().pipeThrough(ds)).text();
}

export function metaOf(g: GameState): SaveMeta {
  const club = g.user.clubId ? g.clubs[g.user.clubId]?.name ?? "" : "Sem clube";
  return { id: g.id, name: g.name, mode: g.user.mode, season: g.season, day: g.day, club, updatedAt: Date.now() };
}

export const localBackend: SaveBackend = {
  async list() {
    if (!store) return [];
    return ((await get<SaveMeta[]>("index", store)) ?? []).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async load(id) {
    if (!store) return null;
    const raw = await get<Blob | string>(`save:${id}`, store);
    if (!raw) return null;
    return JSON.parse(await gunzip(raw)) as GameState;
  },
  async save(g) {
    if (!store) return;
    const data = await gzip(JSON.stringify(g));
    await set(`save:${g.id}`, data, store);
    const idx = ((await get<SaveMeta[]>("index", store)) ?? []).filter((m) => m.id !== g.id);
    idx.push(metaOf(g));
    await set("index", idx, store);
    await set("last", g.id, store);
  },
  async remove(id) {
    if (!store) return;
    await del(`save:${id}`, store);
    const idx = ((await get<SaveMeta[]>("index", store)) ?? []).filter((m) => m.id !== id);
    await set("index", idx, store);
  },
};

export async function lastSaveId(): Promise<string | undefined> {
  if (!store) return undefined;
  return await get<string>("last", store);
}

export async function hallOfFame(): Promise<HallEntry[]> {
  if (!store) return [];
  return ((await get<HallEntry[]>("hof", store)) ?? []).sort((a, b) => b.score - a.score);
}

export async function addToHall(e: HallEntry) {
  if (!store) return;
  const list = (await get<HallEntry[]>("hof", store)) ?? [];
  if (list.some((x) => x.id === e.id)) return;
  list.push(e);
  await set("hof", list, store);
}
