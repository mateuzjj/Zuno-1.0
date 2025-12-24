import React, { useEffect, useState } from 'react';
import { ContextType, Track } from '../types';
import TrackCard from '../components/TrackCard';
import ContextSelector from '../components/ContextSelector';
import SmartBar from '../components/SmartBar';
import { ZunoAPI } from '../services/api';

interface HomeProps {
  isPlaying: boolean;
  currentTrack: Track | null;
  onPlay: (track: Track) => void;
  context: ContextType;
  setContext: (c: ContextType) => void;
  logEvent: (track: Track, event: 'play' | 'like') => void;
}

const Home: React.FC<HomeProps> = ({ isPlaying, currentTrack, onPlay, context, setContext, logEvent }) => {
  const [contextTracks, setContextTracks] = useState<Track[]>([]);
  const [collabTracks, setCollabTracks] = useState<Track[]>([]);
  const [aiReason, setAiReason] = useState<Record<string, string>>({});
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
    // 1. Get Contextual Recommendations via API
    const tracks = ZunoAPI.getRecommendations(context);
    setContextTracks(tracks);

    // 2. Get Collaborative/Similar (based on first track of context for demo)
    if (tracks.length > 0) {
      const similar = ZunoAPI.getSimilarTracks(tracks[0].id);
      setCollabTracks(similar);
    }
  }, [context]);

  const handleSmartSearch = async (text: string) => {
    setIsAiThinking(true);
    try {
        const detectedContext = await ZunoAPI.detectContext(text);
        setContext(detectedContext);
    } catch (e) {
        console.error(e);
    } finally {
        setIsAiThinking(false);
    }
  };

  const handlePlay = (track: Track) => {
    onPlay(track);
    logEvent(track, 'play');
    
    // Trigger AI Explanation for the played track if not exists
    if (!aiReason[track.id]) {
      ZunoAPI.getTrackInsight(track, context).then(reason => {
        setAiReason(prev => ({ ...prev, [track.id]: reason }));
      });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="p-8 pb-32">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{getGreeting()}</h1>
            <p className="text-zinc-400">What's the vibe right now?</p>
        </div>
        <div className="w-full md:w-auto">
            <SmartBar onSearch={handleSmartSearch} isProcessing={isAiThinking} />
        </div>
      </div>
      
      <div className="mb-8">
        <ContextSelector currentContext={context} onContextChange={setContext} />
      </div>

      {/* Section 1: Contextual */}
      <section className="mb-12">
        <div className="flex items-end justify-between mb-4">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {context} Mode
                    {isAiThinking && <span className="text-xs text-indigo-400 animate-pulse">Updating...</span>}
                </h2>
                <p className="text-sm text-zinc-400">Curated by ZUNO Engine based on energy & vibe</p>
            </div>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
          {contextTracks.map(track => (
            <TrackCard 
              key={track.id} 
              track={track} 
              isPlaying={isPlaying} 
              isCurrent={currentTrack?.id === track.id} 
              onPlay={handlePlay}
              explanation={currentTrack?.id === track.id ? aiReason[track.id] : undefined}
            />
          ))}
        </div>
      </section>

      {/* Section 2: Collaborative / Discovery */}
      <section>
        <h2 className="text-xl font-bold text-white mb-2">Because you listen to similar artists</h2>
        <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
          {collabTracks.map(track => (
            <TrackCard 
              key={`collab-${track.id}`} 
              track={track} 
              isPlaying={isPlaying} 
              isCurrent={currentTrack?.id === track.id} 
              onPlay={handlePlay}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;