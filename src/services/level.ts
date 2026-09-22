// ------------------------------------------------------------
// Level system — centralized calculation service.
// threshold(level L) = XP required to REACH level L.
//   L1=0, L2=100, L3=250, L4=450, L5=700, L6=1000, L7=1350 ...
// ------------------------------------------------------------

export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * (level - 1) * (level + 2);
}

export function levelFromXp(xp: number, maxLevel = 100): number {
  let level = 1;
  while (level < maxLevel && xp >= xpThresholdForLevel(level + 1)) level += 1;
  return level;
}

export interface LevelInfo {
  level: number;
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpNeededForNext: number;
  progressPct: number; // 0..100 within current level
  isMaxLevel: boolean;
}

export function levelInfo(xp: number, maxLevel = 100): LevelInfo {
  const level = levelFromXp(xp, maxLevel);
  const currentLevelXp = xpThresholdForLevel(level);
  const nextLevelXp = xpThresholdForLevel(level + 1);
  const xpIntoLevel = xp - currentLevelXp;
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const isMaxLevel = level >= maxLevel && xp >= xpThresholdForLevel(maxLevel);
  return {
    level,
    xp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeededForNext: isMaxLevel ? 0 : nextLevelXp - xp,
    progressPct: isMaxLevel ? 100 : Math.min(100, Math.round((xpIntoLevel / span) * 100)),
    isMaxLevel,
  };
}