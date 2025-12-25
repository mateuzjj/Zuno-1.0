import React from 'react';
import { Home, Search, Library, Wand2 } from 'lucide-react';
import { View } from '../../types';

interface MobileNavProps {
  currentView: View;
  setView: (view: View) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentView, setView }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-zuno-card/95 border-t border-white/5 flex items-center justify-around z-50 backdrop-blur-xl pb-safe">
      <button
        onClick={() => setView('home')}
        className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'home' ? 'text-white' : 'text-zuno-muted hover:text-white'}`}
      >
        <Home size={24} strokeWidth={currentView === 'home' ? 2.5 : 2} className={currentView === 'home' ? "text-zuno-accent" : ""} />
        <span className="text-[10px] font-medium">Início</span>
      </button>

      <button
        onClick={() => setView('search')}
        className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'search' ? 'text-white' : 'text-zuno-muted hover:text-white'}`}
      >
        <Search size={24} strokeWidth={currentView === 'search' ? 2.5 : 2} className={currentView === 'search' ? "text-zuno-accent" : ""} />
        <span className="text-[10px] font-medium">Buscar</span>
      </button>



      <button
        onClick={() => setView('library')}
        className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'library' ? 'text-white' : 'text-zuno-muted hover:text-white'}`}
      >
        <Library size={24} strokeWidth={currentView === 'library' ? 2.5 : 2} className={currentView === 'library' ? "text-zuno-accent" : ""} />
        <span className="text-[10px] font-medium">Biblioteca</span>
      </button>
    </nav>
  );
};