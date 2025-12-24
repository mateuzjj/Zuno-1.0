import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, Repeat, Shuffle } from 'lucide-react';
import { Track } from '../types';

interface PlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  togglePlay: () => void;
}

const Player: React.FC<PlayerProps> = ({ currentTrack, isPlaying, togglePlay }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isPlaying && currentTrack) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 0.5)); // Simulated progress
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  if (!currentTrack) {
    return (
        <div className="h-24 bg-zinc-950 border-t border-zinc-800 flex items-center justify-center text-zinc-500">
            Select a track to start the engine
        </div>
    )
  }

  return (
    <div className="h-24 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between px-6 z-50">
      {/* Left: Track Info */}
      <div className="flex items-center gap-4 w-1/3">
        <img src={currentTrack.albumArt} alt="Album Art" className="w-14 h-14 rounded shadow-md" />
        <div className="overflow-hidden">
          <h4 className="text-white text-sm font-medium hover:underline cursor-pointer truncate">{currentTrack.title}</h4>
          <p className="text-zinc-400 text-xs hover:underline cursor-pointer truncate">{currentTrack.artist}</p>
        </div>
        <button className="text-zinc-400 hover:text-indigo-500 ml-2">
            <Heart size={18} />
        </button>
      </div>

      {/* Center: Controls */}
      <div className="flex flex-col items-center w-1/3 gap-2">
        <div className="flex items-center gap-6">
          <button className="text-zinc-400 hover:text-white"><Shuffle size={18} /></button>
          <button className="text-zinc-200 hover:text-white"><SkipBack size={24} fill="currentColor" /></button>
          
          <button 
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition shadow-glow"
          >
            {isPlaying ? <Pause size={18} className="text-black fill-black" /> : <Play size={18} className="text-black fill-black ml-1" />}
          </button>
          
          <button className="text-zinc-200 hover:text-white"><SkipForward size={24} fill="currentColor" /></button>
          <button className="text-zinc-400 hover:text-white"><Repeat size={18} /></button>
        </div>
        
        <div className="w-full max-w-md flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <span>0:{(progress * (currentTrack.duration / 100) / 10).toFixed(0).padStart(2, '0')}</span>
          <div className="flex-1 h-1 bg-zinc-800 rounded-full relative group cursor-pointer">
            <div 
                className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full group-hover:bg-indigo-400" 
                style={{ width: `${progress}%` }}
            ></div>
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100" style={{ left: `${progress}%` }}></div>
          </div>
          <span>{(currentTrack.duration / 60).toFixed(0)}:{ (currentTrack.duration % 60).toFixed(0).padStart(2,'0') }</span>
        </div>
      </div>

      {/* Right: Volume */}
      <div className="flex items-center justify-end gap-2 w-1/3">
        <Volume2 size={20} className="text-zinc-400" />
        <div className="w-24 h-1 bg-zinc-800 rounded-full relative cursor-pointer group">
             <div className="absolute top-0 left-0 h-full bg-zinc-200 rounded-full w-2/3 group-hover:bg-indigo-500"></div>
        </div>
      </div>
    </div>
  );
};

export default Player;