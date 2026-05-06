/**
 * LifeFlow Gamification Engine
 * Calculates player level, XP and streaks.
 */

export interface UserStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  tasksCompleted: number;
  habitStreak: number;
  badges: string[];
}

export function calculateStats(tasks: any[], habits: any[]): UserStats {
  const completedTasks = tasks.filter(t => t.completed).length;
  
  // XP calculation
  // Each task = 50 XP
  // Each habit completion today = 30 XP
  let totalXP = completedTasks * 50;
  
  habits.forEach(habit => {
    if (habit.completions) {
      const completionCount = Object.keys(habit.completions).length;
      totalXP += completionCount * 30;
    }
  });

  const level = Math.floor(totalXP / 1000) + 1;
  const xpInCurrentLevel = totalXP % 1000;
  
  // Streak check (simplified)
  let maxStreak = 0;
  habits.forEach(habit => {
    // In a real app we'd check consecutive dates
    const streak = Object.keys(habit.completions || {}).length;
    if (streak > maxStreak) maxStreak = streak;
  });

  return {
    level,
    xp: xpInCurrentLevel,
    xpToNextLevel: 1000,
    tasksCompleted: completedTasks,
    habitStreak: maxStreak,
    badges: getBadges(level, completedTasks, maxStreak)
  };
}

function getBadges(level: number, tasks: number, streak: number): string[] {
  const badges = ['Nowicjusz'];
  if (level >= 5) badges.push('Mistrz Produktywności');
  if (tasks >= 50) badges.push('Zadaniowiec');
  if (streak >= 7) badges.push('Legenda Nawyków');
  if (level >= 10) badges.push('LifeFlow VIP');
  return badges;
}
