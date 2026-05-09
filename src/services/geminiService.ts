import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getDashboardInsight(tasks: any[], habits: any[], userDisplayName: string) {
  if (!process.env.GEMINI_API_KEY) {
    return "Skonfiguruj klucz API Gemini, aby otrzymywać spersonalizowane wskazówki.";
  }

  const prompt = `
    Jesteś asystentem produktywności o imieniu LifeFlow AI. 
    Użytkownik: ${userDisplayName}.
    Aktualne zadania: ${tasks.map(t => t.title).join(", ") || "brak"}.
    Nawyki: ${habits.map(h => h.name).join(", ") || "brak"}.
    
    Na podstawie tych danych, napisz jedną krótką, inspirującą i konkretną radę na dziś (max 2 zdania). 
    Pisz bezpośrednio do użytkownika, bądź wspierający i profesjonalny. 
    Używaj języka polskiego.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Skoncentruj się na swoich najważniejszych celach dzisiaj. Każdy mały krok przybliża Cię do sukcesu.";
  } catch {
    return "Skoncentruj się na swoich najważniejszych celach dzisiaj. Każdy mały krok przybliża Cię do sukcesu.";
  }
}

export async function estimateCalories(mealName: string): Promise<number> {
  if (!process.env.GEMINI_API_KEY) return 300;

  const prompt = `
    Jesteś ekspertem dietetykiem. 
    Wpisany posiłek: "${mealName}".
    Oszacuj przybliżoną liczbę kalorii (kcal) dla standardowej porcji tego posiłku.
    Zwróć TYLKO I WYŁĄCZNIE liczbę całkowitą. Jeśli nie wiesz, zwróć 400.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    const calories = parseInt(response.text.trim());
    return isNaN(calories) ? 400 : calories;
  } catch {
    return 400;
  }
}

export async function brainstormTaskBreakdown(taskTitle: string): Promise<string[]> {
  // Input validation and sanitization
  if (!taskTitle || typeof taskTitle !== 'string') {
    return ["Zdefiniuj cel", "Zacznij działać", "Monitoruj postępy"];
  }

  const sanitizedTitle = taskTitle.trim().replace(/\s+/g, ' ');

  if (sanitizedTitle.length < 3) {
    return ["Uściśl cel", "Zbierz informacje", "Wykonaj zadanie"];
  }

  if (sanitizedTitle.length > 200) {
    return ["Podziel na mniejsze części", "Zacznij od pierwszej", "Kontynuuj krok po kroku"];
  }

  if (!process.env.GEMINI_API_KEY) {
    return ["Zdefiniuj cel", "Zacznij działać", "Monitoruj postępy"];
  }

  // Enhanced prompt with better instructions
  const prompt = `
    Jesteś asystentem produktywności. Rozbij zadanie "${sanitizedTitle}" na 3-5 konkretnych, krótkich kroków.
    
    Zasady:
    - Każdy krok powinien być zrozumiały i konkretny
    - Użyj języka polskiego
    - Każdy krok zakończ średnikiem
    - Nie numeruj kroków
    - Unikaj zbyt ogólnych sformułowań
    
    Przykład: "Zrobić zakupy"; Odpowiedź: "Sprawdź lodówkę;Zrób listę zakupów;Idź do sklepu;Spakuj zakupy";
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    if (!response.text) {
      return ["Przygotuj plan", "Zacznij działać", "Dokończ zadanie"];
    }

    // Process and validate the response
    const steps = response.text
      .split(';')
      .map(step => step.trim())
      .filter(step => step.length > 0)
      .map(step => step.replace(/^[\d.-]+\s*/, '')) // Remove numbering
      .filter(step => step.length > 2 && step.length < 100) // Filter reasonable lengths
      .slice(0, 5); // Limit to 5 steps

    if (steps.length === 0) {
      return ["Przygotuj plan", "Zacznij działać", "Dokończ zadanie"];
    }

    return steps;

  } catch (error) {
    
    // Categorized fallback based on error type
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return ["Oszczędzaj zasoby", "Zrób to ręcznie", "Podziel na części"];
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        return ["Sprawdź połączenie", "Zacznij od razu", "Działaj offline"];
      }
    }
    
    return ["Przygotuj plan", "Zacznij działać", "Dokończ zadanie"];
  }
}

export async function summarizeNote(content: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY || content.length < 50) return content;
  
  const prompt = `Streść tę notatkę w jednym krótkim, ale treściwym zdaniu: "${content}"`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text.trim();
  } catch (e) {
    return "Nie udało się wygenerować streszczenia.";
  }
}

export async function getHabitCoaching(habitName: string, streak: number): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return "Rób tak dalej!";
  
  const prompt = `Nawyk: "${habitName}". Obecna seria: ${streak} dni. Daj mi jedną, krótką, motywującą i mądrą poradę psychologiczną w 20 słowach, aby utrzymać ten nawyk.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text.trim();
  } catch (e) {
    return "Dyscyplina to klucz do wolności. Każdy dzień się liczy.";
  }
}
