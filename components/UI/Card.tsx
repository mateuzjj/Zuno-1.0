import React from 'react';
import { Play } from 'lucide-react';

interface CardProps {
  image: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
  onPlay?: (e: React.MouseEvent) => void;
  rounded?: boolean;
}

export const Card: React.FC<CardProps> = ({ image, title, subtitle, onClick, onPlay, rounded = false }) => {
  return (
    <div
      onClick={onClick}
      className="group relative p-4 rounded-card bg-zuno-card hover:bg-zuno-light transition-all duration-300 cursor-pointer w-full"
    >
      <div className="relative aspect-square mb-4 overflow-hidden shadow-lg rounded-2xl">
        <img
          src={image}
          alt={title}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${rounded ? 'rounded-full' : 'rounded-2xl'}`}
          loading="lazy"
        />
        {/* Play Button Overlay */}
        <button
          onClick={onPlay}
          className="absolute bottom-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 bg-zuno-accent text-black p-3.5 rounded-full shadow-xl hover:scale-105 hover:bg-zuno-accent/90"
        >
          <Play fill="currentColor" size={20} className="pl-0.5" />
        </button>
      </div>
      <div className="flex flex-col gap-1 px-1">
        <h3 className="font-bold text-white truncate">{title}</h3>
        <p className="text-sm text-zuno-muted truncate line-clamp-2">{subtitle}</p>
      </div>
    </div>
  );
};