import * as Engine from './recommendationEngine';
import * as AI from './geminiService';
import { Track, ContextType } from '../types';

/**
 * ZUNO INTELLIGENT AUDIO API
 * --------------------------
 * This module acts as the interface for the recommendation engine.
 * It combines rule-based filtering with AI-driven context awareness.
 */

export const ZunoAPI = {
  /**
   * Analyzes natural language input to determine the best listening context.
   */
  detectContext: async (input: string): Promise<ContextType> => {
    return await AI.identifyContextFromText(input);
  },

  /**
   * Retrieves tracks based on a specific context/vibe.
   */
  getRecommendations: (context: ContextType): Track[] => {
    return Engine.getTracksByContext(context);
  },

  /**
   * Retrieves similar tracks based on collaborative filtering logic.
   */
  getSimilarTracks: (trackId: string): Track[] => {
    return Engine.getCollaborativeRecommendations(trackId);
  },

  /**
   * Generates a natural language explanation for why a track was chosen.
   */
  getTrackInsight: async (track: Track, context: ContextType): Promise<string> => {
    // Mock user history count for this demo
    return await AI.generateRecommendationExplanation(track, context, 50);
  },

  /**
   * Calculates the user's audio profile vector.
   */
  getUserProfile: (history: Track[]) => {
    return Engine.calculateUserVector(history);
  }
};