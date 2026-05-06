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
  } catch (error) {
    console.error("Gemini API Error:", error);
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
  } catch (error) {
    console.error("Calorie estimation error:", error);
    return 400;
  }
}

export async function brainstormTaskBreakdown(taskTitle: string): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY) return ["Krok 1", "Krok 2", "Krok 3"];
  
  const prompt = `Moje zadanie to: "${taskTitle}". Rozbij je na 3-5 konkretnych, krótkich kroków (podzadań). Zwróć tylko listę kroków oddzielonych średnikami.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text.split(';').map(s => s.trim().replace(/^[\d.-]+\s*/, ''));
  } catch (e) {
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
