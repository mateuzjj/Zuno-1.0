import { Track } from "../types";
import { ContextType } from "../types";

// Local "AI" using pattern matching and rules (no external API needed)

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

// Keyword-based context detection
const contextKeywords: Record<ContextType, string[]> = {
    Morning: ['morning', 'manhã', 'acordar', 'café', 'wake up', 'sunrise', 'breakfast'],
    Focus: ['focus', 'foco', 'study', 'estudar', 'work', 'trabalho', 'concentrate', 'concentração', 'deep'],
    Workout: ['workout', 'treino', 'gym', 'academia', 'exercise', 'run', 'correr', 'energy', 'energia'],
    Party: ['party', 'festa', 'dance', 'dançar', 'badalar', 'night', 'noite', 'club', 'balada'],
    Chill: ['chill', 'relax', 'relaxar', 'calm', 'calma', 'peace', 'paz', 'quiet', 'tranquilo'],
    Rainy: ['rain', 'chuva', 'rainy', 'chuvoso', 'cozy', 'aconchegante', 'melancholy', 'melancolia']
};

const moodToParams: Record<ContextType, { energy: 'high' | 'medium' | 'low', valence: 'positive' | 'neutral' | 'negative', danceability: 'high' | 'low' }> = {
    Morning: { energy: 'medium', valence: 'positive', danceability: 'low' },
    Focus: { energy: 'low', valence: 'neutral', danceability: 'low' },
    Workout: { energy: 'high', valence: 'positive', danceability: 'high' },
    Party: { energy: 'high', valence: 'positive', danceability: 'high' },
    Chill: { energy: 'low', valence: 'neutral', danceability: 'low' },
    Rainy: { energy: 'low', valence: 'negative', danceability: 'low' }
};

export const analyzeRequest = async (text: string): Promise<AnalysisResult> => {
    const lowerText = text.toLowerCase();

    // Detect context based on keywords
    let detectedContext: ContextType = 'Chill';
    let maxMatches = 0;

    for (const [context, keywords] of Object.entries(contextKeywords)) {
        const matches = keywords.filter(kw => lowerText.includes(kw)).length;
        if (matches > maxMatches) {
            maxMatches = matches;
            detectedContext = context as ContextType;
        }
    }

    // Detect intent
    let intent: 'artist' | 'song' | 'mood' | 'general' = 'mood';
    if (lowerText.includes('artist') || lowerText.includes('artista')) {
        intent = 'artist';
    } else if (lowerText.includes('song') || lowerText.includes('música') || lowerText.includes('track')) {
        intent = 'song';
    }

    return {
        intent,
        similarEntities: [],
        context: detectedContext,
        vibeParams: moodToParams[detectedContext]
    };
};

export const identifyContextFromText = async (text: string): Promise<ContextType> => {
    const result = await analyzeRequest(text);
    return result.context;
};

export const generateRecommendationExplanation = async (
    track: Track,
    context: ContextType,
    userHistoryCount: number
): Promise<string> => {
    const explanations: Record<ContextType, string[]> = {
        Morning: [
            `Perfect morning energy to start your day right.`,
            `This track's uplifting vibe matches your morning mood.`,
            `Great choice to kickstart your morning routine.`
        ],
        Focus: [
            `Ideal background music for deep concentration.`,
            `This track won't distract you from your work.`,
            `Perfect for maintaining your focus flow.`
        ],
        Workout: [
            `High energy to power through your workout.`,
            `This beat will keep you motivated during exercise.`,
            `Perfect tempo for your training session.`
        ],
        Party: [
            `This track will get everyone on the dance floor.`,
            `Perfect party vibe to keep the energy high.`,
            `Guaranteed to make your night unforgettable.`
        ],
        Chill: [
            `Relaxing vibes for your chill session.`,
            `This track creates the perfect calm atmosphere.`,
            `Ideal for unwinding and relaxing.`
        ],
        Rainy: [
            `Perfect soundtrack for a rainy day.`,
            `This melancholic vibe matches the weather.`,
            `Cozy vibes for staying indoors.`
        ]
    };

    const options = explanations[context];
    return options[Math.floor(Math.random() * options.length)];
};

// Generate track suggestions based on context (using popular tracks database)
export const generateTrackList = async (context: string): Promise<{ artist: string, title: string }[]> => {
    // Curated track lists for each mood (these are popular tracks that work well)
    const trackDatabase: Record<string, { artist: string, title: string }[]> = {
        Workout: [
            { artist: 'The Weeknd', title: 'Blinding Lights' },
            { artist: 'Dua Lipa', title: 'Physical' },
            { artist: 'Calvin Harris', title: 'Summer' },
            { artist: 'David Guetta', title: 'Titanium' },
            { artist: 'Avicii', title: 'Wake Me Up' },
            { artist: 'Martin Garrix', title: 'Animals' },
            { artist: 'Zedd', title: 'Clarity' },
            { artist: 'Marshmello', title: 'Alone' },
            { artist: 'Tiësto', title: 'Red Lights' },
            { artist: 'Swedish House Mafia', title: "Don't You Worry Child" }
        ],
        Focus: [
            { artist: 'Ludovico Einaudi', title: 'Nuvole Bianche' },
            { artist: 'Ólafur Arnalds', title: 'Near Light' },
            { artist: 'Max Richter', title: 'On the Nature of Daylight' },
            { artist: 'Nils Frahm', title: 'Says' },
            { artist: 'Kiasmos', title: 'Looped' },
            { artist: 'Jon Hopkins', title: 'Open Eye Signal' },
            { artist: 'Bonobo', title: 'Kerala' },
            { artist: 'Tycho', title: 'Awake' },
            { artist: 'ODESZA', title: 'A Moment Apart' },
            { artist: 'Explosions in the Sky', title: 'Your Hand in Mine' }
        ],
        Party: [
            { artist: 'Drake', title: 'One Dance' },
            { artist: 'Bad Bunny', title: 'Tití Me Preguntó' },
            { artist: 'Dua Lipa', title: "Don't Start Now" },
            { artist: 'The Weeknd', title: 'Starboy' },
            { artist: 'Post Malone', title: 'Circles' },
            { artist: 'Travis Scott', title: 'SICKO MODE' },
            { artist: 'Cardi B', title: 'I Like It' },
            { artist: 'Bruno Mars', title: 'Uptown Funk' },
            { artist: 'Mark Ronson', title: 'Uptown Funk' },
            { artist: 'Pharrell Williams', title: 'Happy' }
        ],
        Chill: [
            { artist: 'Billie Eilish', title: 'ocean eyes' },
            { artist: 'Lana Del Rey', title: 'Video Games' },
            { artist: 'The xx', title: 'Intro' },
            { artist: 'Cigarettes After Sex', title: 'Apocalypse' },
            { artist: 'Bon Iver', title: 'Holocene' },
            { artist: 'Daughter', title: 'Youth' },
            { artist: 'Novo Amor', title: 'Anchor' },
            { artist: 'Phoebe Bridgers', title: 'Motion Sickness' },
            { artist: 'Clairo', title: 'Sofia' },
            { artist: 'Rex Orange County', title: 'Loving Is Easy' }
        ],
        Morning: [
            { artist: 'Coldplay', title: 'Viva La Vida' },
            { artist: 'Ed Sheeran', title: 'Shape of You' },
            { artist: 'Maroon 5', title: 'Sugar' },
            { artist: 'OneRepublic', title: 'Counting Stars' },
            { artist: 'Imagine Dragons', title: 'Believer' },
            { artist: 'Bastille', title: 'Pompeii' },
            { artist: 'Walk the Moon', title: 'Shut Up and Dance' },
            { artist: 'Foster the People', title: 'Pumped Up Kicks' },
            { artist: 'MGMT', title: 'Electric Feel' },
            { artist: 'Phoenix', title: '1901' }
        ],
        Rainy: [
            { artist: 'Radiohead', title: 'No Surprises' },
            { artist: 'Mazzy Star', title: 'Fade Into You' },
            { artist: 'The Smiths', title: 'There Is a Light That Never Goes Out' },
            { artist: 'Portishead', title: 'Glory Box' },
            { artist: 'Massive Attack', title: 'Teardrop' },
            { artist: 'Slowdive', title: 'Alison' },
            { artist: 'Beach House', title: 'Space Song' },
            { artist: 'Cocteau Twins', title: 'Heaven or Las Vegas' },
            { artist: 'Mazzy Star', title: 'Into Dust' },
            { artist: 'The National', title: 'Bloodbuzz Ohio' }
        ]
    };

    // Find matching context or use Chill as default
    const contextKey = Object.keys(trackDatabase).find(key =>
        context.toLowerCase().includes(key.toLowerCase())
    ) || 'Chill';

    const tracks = trackDatabase[contextKey] || trackDatabase.Chill;

    // Shuffle and return 10 random tracks
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
};
