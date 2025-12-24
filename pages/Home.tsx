import { useState, useEffect, useRef } from 'react';
import { Heart, MoreVertical, Mic, Search as SearchIcon, Sparkles, Play } from 'lucide-react';
import { usePlayer } from '../store/PlayerContext';
import { ZunoAPI } from '../services/zunoApi';
import { Track, ContextType } from '../types';

export const Home = () => {
  const { playTrack } = usePlayer();
  const [context, setContext] = useState<ContextType>(ContextType.Chill);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [insight, setInsight] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Feed State
  const [feedSections, setFeedSections] = useState<Array<{ title: string, subtitle: string, tracks: Track[] }>>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Infinite Scroll Observer
    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && !isLoadingFeed) {
        loadMoreFeed();
      }
    }, { root: null, rootMargin: '200px', threshold: 0 });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [isLoadingFeed, feedSections]); // Re-attach when state changes to ensure fresh closure if needed

  const loadMoreFeed = async () => {
    setIsLoadingFeed(true);
    try {
      // Use current length as offset
      const newSection = await ZunoAPI.getNextFeedSection(feedSections.length);
      setFeedSections(prev => [...prev, newSection]);
    } catch (err) {
      console.error("Feed Error", err);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  useEffect(() => {
    // Initial load - recommend based on time of day (mock logic or simple defaults)
    const hour = new Date().getHours();
    let initialContext = ContextType.Chill;
    if (hour >= 5 && hour < 12) initialContext = ContextType.Morning;
    else if (hour >= 12 && hour < 18) initialContext = ContextType.Focus;
    else if (hour >= 18 && hour < 22) initialContext = ContextType.Party; // or Workout
    else initialContext = ContextType.Rest; // Fallback or Chill

    // Force Chill for now as safe default or use the logic
    loadRecommendations(initialContext);
  }, []);

  const loadRecommendations = async (ctx: ContextType) => {
    setContext(ctx);
    const tracks = ZunoAPI.getRecommendations(ctx);
    setRecommendations(tracks);

    // Get insight for the first track
    if (tracks.length > 0) {
      const text = await ZunoAPI.getTrackInsight(tracks[0], ctx);
      setInsight(text);
    }
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setIsAnalyzing(true);
    try {
      // Perform Hybrid Search (AI + Real Catalog)
      const { context: detectedContext, catalogResults, similarResults, aiResults, analysis } = await ZunoAPI.searchHybrid(searchInput);

      setContext(detectedContext);

      let finalTracks: Track[] = [];
      let message = '';

      // Priority 1: Exact Catalog Matches
      if (catalogResults.length > 0) {
        finalTracks = [...catalogResults];
        message = `Found ${catalogResults.length} tracks.`;
      }

      // Priority 2: Smart Expansion (Similar Artists)
      if (similarResults.length > 0) {
        // Append similar tracks
        finalTracks = [...finalTracks, ...similarResults];
        if (analysis.intent === 'artist' && analysis.primaryEntity) {
          message += ` Plus similar vibes to ${analysis.primaryEntity} we picked for you.`;
        } else {
          message += ` Plus some similar picks.`;
        }
      }

      // Priority 3: Fallback to Mood if nothing else
      if (finalTracks.length === 0) {
        finalTracks = aiResults;
        message = `Thinking... sounds like you're in a ${detectedContext} mood.`;
      }

      setRecommendations(finalTracks);
      setInsight(message);

    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const CATEGORIES = [
    { name: "Music", color: "bg-gradient-to-br from-orange-400 to-orange-600", img: "🎸" },
    { name: "Live Events", color: "bg-gradient-to-br from-purple-500 to-purple-800", img: "🎤" },
    { name: "Made for you", color: "bg-gradient-to-br from-red-500 to-red-800", img: "❤️" },
    { name: "Upcoming releases", color: "bg-gradient-to-br from-green-400 to-green-700", img: "📅" },
    { name: "New releases", color: "bg-gradient-to-br from-yellow-500 to-yellow-700", img: "🌟" },
    { name: "Desi", color: "bg-gradient-to-br from-orange-700 to-yellow-600", img: "🕌" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#064e3b] via-[#022c22] to-black pb-32 font-sans md:ml-64 transition-all duration-300">

      {/* Background Glows for "Forest" Vibe */}
      <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-green-500/20 to-transparent pointer-events-none mix-blend-overlay" />

      {/* Header - Fixed & Transparent */}
      <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 md:py-6 flex items-center justify-between pointer-events-none md:ml-64">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex flex-col items-center gap-1 group cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-white/20 p-0.5 border border-white/10 hover:border-zuno-accent transition-colors">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            {/* Zuno Logo Text - Floating */}
            <img
              src="/logo.png"
              alt="ZUNO"
              className="h-4 w-auto opacity-90 group-hover:opacity-100 transition-opacity mix-blend-screen object-contain mt-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 pointer-events-auto">
          <button className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
            <Heart size={20} />
          </button>
          <button className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Spacer for Fixed Header */}
      <div className="h-24 md:h-28" />

      {/* Search Bar - Now AI Powered */}
      <div className="px-6 mb-8 relative z-20">
        <div className={`bg-[#1a3828] rounded-full h-14 flex items-center px-5 shadow-lg shadow-black/20 ring-1 ring-white/5 transition-all duration-500 ${isAnalyzing ? 'ring-zuno-accent shadow-zuno-accent/20' : ''}`}>
          <SearchIcon size={20} className="text-white/50 mr-3" />
          <input
            type="text"
            placeholder="How are you feeling today?"
            className="bg-transparent flex-1 text-white placeholder-white/50 outline-none text-lg"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="w-10 h-10 rounded-full bg-[#1ED760] flex items-center justify-center text-black hover:scale-105 transition-transform shadow-md shadow-green-900/50"
          >
            {isAnalyzing ? <Sparkles size={20} className="animate-spin" /> : <Mic size={20} />}
          </button>
        </div>
        {insight && (
          <div className="mt-3 ml-4 flex items-center gap-2 text-xs text-zuno-accent font-medium animate-in fade-in slide-in-from-top-2">
            <Sparkles size={12} />
            {insight}
          </div>
        )}
      </div>

      {/* Dynamic AI Recommendations Section */}
      <div className="mb-8 pl-6">
        <div className="flex justify-between items-end pr-6 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Recommended for {context}
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/60 font-normal border border-white/5">AI Powered</span>
            </h2>
          </div>
          <span className="text-xs font-medium text-gray-400 hover:text-white cursor-pointer">See all</span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 pr-6 hide-scrollbar snap-x">
          {recommendations.map((track, idx) => (
            <div
              key={track.id}
              onClick={() => playTrack(track)}
              className="relative flex-shrink-0 w-72 md:w-80 aspect-[4/3] rounded-[2rem] overflow-hidden snap-center group shadow-xl shadow-black/40 cursor-pointer"
            >
              <img src={track.coverUrl || track.albumArt} alt={track.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />

              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-2xl font-bold text-white mb-1 line-clamp-1">{track.title}</h3>
                <p className="text-sm text-white/70 line-clamp-1 mb-2">{track.artist}</p>
                <div className="flex gap-2">
                  <span className="text-[10px] bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-white/90 border border-white/10">
                    {(track.energy * 100).toFixed(0)}% Energy
                  </span>
                  <span className="text-[10px] bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-white/90 border border-white/10">
                    {track.bpm} BPM
                  </span>
                </div>
              </div>

              <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-zuno-accent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg text-black">
                <Play size={20} fill="currentColor" />
              </div>
            </div>
          ))}
          {recommendations.length === 0 && (
            <div className="text-white/50 text-sm ml-2">Searching for the perfect tracks for you...</div>
          )}
        </div>
      </div>

      {/* "Recommended for today" Section */}
      <div className="px-6 pb-8">
        <h2 className="text-xl font-bold text-white mb-4">Recommended for today</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIES.map((cat, idx) => (
            <div key={idx} className={`relative h-24 md:h-32 rounded-2xl overflow-hidden ${cat.color} p-4 shadow-lg group cursor-pointer hover:brightness-110 transition-all`}>
              <span className="relative z-10 text-white font-bold text-lg md:text-xl">{cat.name}</span>
              <div className="absolute -bottom-2 -right-2 text-6xl md:text-7xl opacity-30 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-transform duration-300 grayscale grayscale-0">
                {cat.img}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Infinite AI Feed */}
      <div className="px-6 pb-32">
        {feedSections.map((section, idx) => (
          <div key={idx} className="mb-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {section.title}
                <Sparkles size={14} className="text-zuno-accent" />
              </h2>
              <p className="text-sm text-gray-400">{section.subtitle}</p>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
              {section.tracks.map((track) => (
                <div
                  key={track.id + idx} // Unique key
                  onClick={() => playTrack(track)}
                  className="relative flex-shrink-0 w-64 aspect-square rounded-2xl overflow-hidden snap-center group shadow-md shadow-black/40 cursor-pointer"
                >
                  <img src={track.coverUrl || track.albumArt} alt={track.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold text-white line-clamp-1">{track.title}</h3>
                    <p className="text-xs text-white/70 line-clamp-1">{track.artist}</p>
                  </div>

                  <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-zuno-accent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg text-black">
                    <Play size={14} fill="currentColor" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Loading Indicator / Trigger */}
        <div ref={loaderRef} className="flex justify-center py-8">
          {isLoadingFeed && (
            <div className="flex items-center gap-2 text-zuno-accent animate-pulse">
              <Sparkles size={20} className="animate-spin" />
              <span className="text-sm font-medium">Zuno AI is curating more...</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};