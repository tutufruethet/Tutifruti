import type { Fixture, GameState } from "../types";
import { isUserFixture } from "./apply";

export function fixturesOn(g: GameState, day: number): Fixture[] {
  return Object.values(g.fixtures).filter((f) => f.day === day);
}

export function userFixtureToday(g: GameState): Fixture | undefined {
  return fixturesOn(g, g.day).find((f) => !f.played && isUserFixture(g, f));
}

export function nextUserFixture(g: GameState): Fixture | undefined {
  return Object.values(g.fixtures)
    .filter((f) => !f.played && f.day >= g.day && isUserFixture(g, f))
    .sort((a, b) => a.day - b.day)[0];
}

export function userFixtures(g: GameState): Fixture[] {
  return Object.values(g.fixtures).filter((f) => isUserFixture(g, f)).sort((a, b) => a.day - b.day);
}
