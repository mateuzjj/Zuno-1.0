import React from 'react';
import { Play, Pause, MoreHorizontal } from 'lucide-react';
import { Track } from '../types';

interface TrackCardProps {
  track: Track;
  isPlaying: boolean;
  isCurrent: boolean;
  onPlay: (track: Track) => void;
  explanation?: string;
}

const TrackCard: React.FC<TrackCardProps> = ({ track, isPlaying, isCurrent, onPlay, explanation }) => {
  return (
    <div className="group relative bg-zinc-900/40 hover:bg-zinc-800/60 p-4 rounded-lg transition-all duration-300 w-48 flex-shrink-0 cursor-pointer">
      <div className="relative aspect-square mb-4 rounded-md overflow-hidden shadow-lg">
        <img 
          src={track.albumArt} 
          alt={track.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <button 
          onClick={(e) => { e.stopPropagation(); onPlay(track); }}
          className={`absolute bottom-2 right-2 w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center shadow-xl translate-y-4 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-indigo-400 hover:scale-105 ${isCurrent ? 'opacity-100 translate-y-0' : ''}`}
        >
          {isCurrent && isPlaying ? (
            <Pause size={20} className="text-black fill-black" />
          ) : (
            <Play size={20} className="text-black fill-black ml-1" />
          )}
        </button>
      </div>
      
      <div className="min-h-[60px]">
        <h3 className={`font-semibold truncate ${isCurrent ? 'text-indigo-400' : 'text-white'}`}>
            {track.title}
        </h3>
        <p className="text-sm text-zinc-400 truncate">{track.artist}</p>
      </div>

      {explanation && (
        <div className="mt-2 text-[10px] text-zinc-500 bg-zinc-900/50 p-2 rounded border border-zinc-800/50 leading-tight">
           ✨ {explanation}
        </div>
      )}
    </div>
  );
};

export default TrackCard;