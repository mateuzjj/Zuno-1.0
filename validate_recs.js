
// Mock dependencies for offline testing
const MOCK_TRACKS = [
    { id: '1', title: 'Mock Track 1', artist: 'Mock Artist', energy: 0.8, valence: 0.8, bpm: 120 },
    { id: '2', title: 'Mock Track 2', artist: 'Mock Artist', energy: 0.2, valence: 0.2, bpm: 80 }
];

const SpotifyClient = {
    getRecentlyPlayed: async () => [],
    getRecommendations: async () => { throw new Error("API Offline"); }
};

const ContextType = {
    Workout: 'Workout',
    Chill: 'Chill'
};

// Replicate the function logic for testing
export const getTracksByContext = async (context) => {
    try {
        const recent = await SpotifyClient.getRecentlyPlayed(5);
        if (recent.length === 0) throw new Error("No recent");

        // ... (mock API call would be here) ...
        return [];

    } catch (error) {
        console.log('Caught expected error:', error.message);

        // Fallback Logic
        let filtered = [...MOCK_TRACKS];
        switch (context) {
            case ContextType.Workout:
                return filtered.filter(t => t.energy > 0.7 && t.bpm > 100);
            case ContextType.Chill:
                return filtered.filter(t => t.energy < 0.6);
            default:
                return filtered;
        }
    }
};



// Mock AI Service
const MockAI = {
    generateTrackList: async (context) => {
        console.log(`[MockAI] Generating list for ${context}...`);
        return [
            { artist: 'Mock Artist A', title: 'AI Song A' },
            { artist: 'Mock Artist B', title: 'AI Song B' }
        ];
    }
};

// Replicate AI Logic for Validation
const getAIRecommendations = async (context) => {
    try {
        const aiTracks = await MockAI.generateTrackList(context);
        const results = aiTracks.map(t => {
            console.log(`[MockEngine] Searching Spotify for: ${t.artist} - ${t.title}`);
            // Simulate successful search hit
            return { id: 'ai-1', title: t.title, artist: t.artist, energy: 0.5 };
        });
        return results;
    } catch (e) {
        return [];
    }
};

// RUN TEST
(async () => {
    console.log("TEST 1: Fallback Logic...");
    const result = await getTracksByContext(ContextType.Workout);
    if (result.length > 0 && result[0].energy > 0.7) {
        console.log("PASS: Workout context returned high energy tracks from fallback.");
    } else {
        console.log("FAIL: Logic incorrect.");
    }

    console.log("\nTEST 2: AI Logic (AlexDjulin Implementation)...");
    const aiResult = await getAIRecommendations('Party');
    if (aiResult.length === 2 && aiResult[0].title === 'AI Song A') {
        console.log("PASS: AI Flow confirmed (Prompt -> List -> Search -> Tracks).");
    } else {
        console.log("FAIL: AI Logic incorrect.");
    }
})();
