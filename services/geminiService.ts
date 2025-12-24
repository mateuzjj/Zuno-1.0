import { GoogleGenAI } from "@google/genai";
import { Track } from "../types";
import { ContextType } from "../types";

// Using the key from vite config or env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Enhanced Analysis Result
export interface AnalysisResult {
    intent: 'artist' | 'song' | 'mood' | 'general';
    primaryEntity?: string;
    similarEntities: string[];
    context: ContextType;
    vibeParams?: {
        targetEnergy?: 'high' | 'medium' | 'low';
        targetValence?: 'positive' | 'neutral' | 'negative';
        targetDanceability?: 'high' | 'low';
    };
}

export const analyzeRequest = async (text: string): Promise<AnalysisResult> => {
    // Default fallback
    const fallback: AnalysisResult = {
        intent: 'general',
        similarEntities: [],
        context: 'Chill'
    };

    if (!ai) return fallback;

    try {
        const prompt = `
        Analyze the music search query: "${text}".
        Return JSON with:
        - intent: "artist", "song", "mood", or "general".
        - primaryEntity: Main artist/song name.
        - similarEntities: List of similar artists/songs.
        - context: ONE of [Morning, Focus, Workout, Party, Chill, Rainy].
        - vibeParams: 
            - targetEnergy: high (>0.7), medium, low (<0.4).
            - targetValence: positive (happy), neutral, negative (sad).
            - targetDanceability: high (danceable), low.
        
        Example: "vamos badalar" -> { "intent": "mood", "context": "Party", "vibeParams": { "targetEnergy": "high", "targetValence": "positive", "targetDanceability": "high" } }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
        });

        const raw = response.text?.trim() || '';
        // Clean JSON formatting (remove markdown code blocks if Gemini adds them)
        const jsonStr = raw.replace(/```json/g, '').replace(/```/g, '').trim();

        const data = JSON.parse(jsonStr);
        return {
            intent: data.intent || 'general',
            primaryEntity: data.primaryEntity,
            similarEntities: data.similarEntities || [],
            context: data.context || 'Chill',
            vibeParams: data.vibeParams
        };

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return {
            ...fallback,
            context: await identifyContextFromText(text) // Fallback to simple context detection
        };
    }
};

export const identifyContextFromText = async (text: string): Promise<ContextType> => {
    // Keeping this for backward compatibility or simple checks
    const res = await analyzeRequest(text);
    return res.context;
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
      Metadata: Energy ${(track.energy * 100).toFixed(0)}%, Valance ${(track.valence * 100).toFixed(0)}%.
      
      Task: Write a 1-sentence witty reason why this track fits the vibe.
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
        });

        return response.text?.trim() || `Perfect for ${context} vibes.`;
    } catch (error) {
        console.error("Gemini Explanation Error:", error);
        return `Recommended for your ${context} session.`;
    }
};
