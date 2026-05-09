const FALLBACK_INSIGHT =
  'Skoncentruj się na swoich najważniejszych celach dzisiaj. Każdy mały krok przybliża Cię do sukcesu.';

export async function getDashboardInsight(_tasks: any[], _habits: any[], _userDisplayName: string) {
  return FALLBACK_INSIGHT;
}

export async function estimateCalories(_mealName: string): Promise<number> {
  return 300;
}

export async function brainstormTaskBreakdown(taskTitle: string): Promise<string[]> {
  if (!taskTitle || typeof taskTitle !== 'string' || taskTitle.trim().length < 3) {
    return ['Zdefiniuj cel', 'Zacznij działać', 'Monitoruj postępy'];
  }
  return ['Przygotuj plan', 'Zacznij działać', 'Dokończ zadanie'];
}

export async function summarizeNote(content: string): Promise<string> {
  return content;
}

export async function getHabitCoaching(_habitName: string, _streak: number): Promise<string> {
  const tips = [
    'Rób tak dalej! Każdy dzień się liczy.',
    'Dyscyplina to klucz do wolności. Kontynuuj!',
    'Regularność buduje nawyki. Świetna robota!',
    'Małe kroki, duże zmiany. Nie odpuszczaj.',
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}
