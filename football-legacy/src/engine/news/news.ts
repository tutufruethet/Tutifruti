import type { GameState, NewsItem } from "../types";

export function addNews(g: GameState, n: Omit<NewsItem, "id" | "day"> & { day?: number }): NewsItem {
  const item: NewsItem = { ...n, id: `n${g.ids++}`, day: n.day ?? g.day };
  g.news.unshift(item);
  if (g.news.length > 350) g.news.length = 350;
  return item;
}

export function milestone(g: GameState, text: string) {
  g.history.milestones.unshift({ day: g.day, text });
  if (g.history.milestones.length > 200) g.history.milestones.length = 200;
}
