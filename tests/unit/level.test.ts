import { describe, it, expect } from "vitest";
import { xpThresholdForLevel, levelFromXp, levelInfo } from "@/services/level";

describe("xpThresholdForLevel", () => {
  it("returns 0 for level 1", () => {
    expect(xpThresholdForLevel(1)).toBe(0);
  });
  it("computes known thresholds", () => {
    expect(xpThresholdForLevel(2)).toBe(25 * 1 * 4); // 100
    expect(xpThresholdForLevel(3)).toBe(25 * 2 * 5); // 250
    expect(xpThresholdForLevel(5)).toBe(25 * 4 * 7); // 700
  });
});

describe("levelFromXp", () => {
  it("starts at level 1", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
  });
  it("levels exactly at thresholds", () => {
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(250)).toBe(3);
    expect(levelFromXp(700)).toBe(5);
  });
  it("caps at max level", () => {
    expect(levelFromXp(10_000_000, 100)).toBe(100);
  });
});

describe("levelInfo", () => {
  it("describes a mid-level user", () => {
    const info = levelInfo(175);
    expect(info.level).toBe(2);
    expect(info.currentLevelXp).toBe(100);
    expect(info.nextLevelXp).toBe(250);
    expect(info.xpIntoLevel).toBe(75);
    expect(info.xpNeededForNext).toBe(75);
    // progress: 75 / (250-100) = 50%
    expect(info.progressPct).toBe(50);
    expect(info.isMaxLevel).toBe(false);
  });
  it("handles max level", () => {
    const info = levelInfo(xpThresholdForLevel(100), 100);
    expect(info.isMaxLevel).toBe(true);
    expect(info.xpNeededForNext).toBe(0);
    expect(info.progressPct).toBe(100);
  });
  it("matches seed math (sara 160 XP → level 2)", () => {
    const info = levelInfo(160);
    expect(info.level).toBe(2);
  });
});