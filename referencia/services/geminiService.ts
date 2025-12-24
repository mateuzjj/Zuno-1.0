import { GoogleGenAI } from "@google/genai";
import { Track, ContextType } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const identifyContextFromText = async (text: string): Promise<ContextType> => {
  // Fallback if no API key or error
  const fallback = (): ContextType => {
     const t = text.toLowerCase();
     if (t.includes('party') || t.includes('dance') || t.includes('fun')) return ContextType.Party;
     if (t.includes('work') || t.includes('study') || t.includes('focus') || t.includes('code')) return ContextType.Focus;
     if (t.includes('sleep') || t.includes('rain') || t.includes('sad') || t.includes('calm')) return ContextType.Rainy;
     if (t.includes('run') || t.includes('gym') || t.includes('lift') || t.includes('energy')) return ContextType.Workout;
     if (t.includes('morning') || t.includes('wake') || t.includes('coffee')) return ContextType.Morning;
     return ContextType.Chill;
  };

  if (!ai) return fallback();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Classify the user's request "${text}" into exactly one of these music contexts: Morning, Focus, Workout, Party, Chill, Rainy. Return ONLY the context word.`,
    });
    
    const result = response.text?.trim();
    
    // Validate that the result is a valid ContextType
    const validContexts = Object.values(ContextType);
    if (result && validContexts.includes(result as ContextType)) {
        return result as ContextType;
    }
    return fallback();
  } catch (error) {
    console.error("Gemini Context Analysis Error:", error);
    return fallback();
  }
};

export const generateRecommendationExplanation = async (
  track: Track, 
  context: ContextType, 
  userHistoryCount: number
): Promise<string> => {
  if (!ai) {
    return "ZUNO Engine: High affinity match based on your recent listening patterns.";
  }

  try {
    const prompt = `
      You are ZUNO, an intelligent music recommendation engine.
      Context: The user is in "${context}" mode.
      Track: "${track.title}" by ${track.artist}.
      Metadata: Energy ${(track.energy * 100).toFixed(0)}%, Valence ${(track.valence * 100).toFixed(0)}%.
      
      Task: Write a 1-sentence witty reason why this track fits the vibe.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || `Perfect for ${context} vibes.`;
  } catch (error) {
    console.error("Gemini Explanation Error:", error);
    return `Recommended for your ${context} session.`;
  }
};