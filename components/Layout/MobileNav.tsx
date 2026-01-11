import React, { useState } from 'react';
import { Home, Search, Library, Sliders, Menu as MenuIcon } from 'lucide-react';
import { View } from '../../types';
import { MobileMenu } from './MobileMenu';

interface MobileNavProps {
  currentView: View;
  setView: (view: View) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentView, setView }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[65px] bg-black/95 border-t border-white/10 flex items-center justify-around z-[40] backdrop-blur-xl pb-2 pt-2 shadow-2xl safe-bottom">
        <button
          onClick={() => setView('home')}
          className={`flex flex-col items-center gap-1 transition-colors w-16 ${currentView === 'home' ? 'text-white' : 'text-zuno-muted hover:text-white'}`}
        >
          <Home size={22} strokeWidth={currentView === 'home' ? 2.5 : 2} className={currentView === 'home' ? "text-zuno-accent" : ""} />
          <span className="text-[10px] font-medium">Início</span>
        </button>

        <button
          onClick={() => setView('search')}
          className={`flex flex-col items-center gap-1 transition-colors w-16 ${currentView === 'search' ? 'text-white' : 'text-zuno-muted hover:text-white'}`}
        >
          <Search size={22} strokeWidth={currentView === 'search' ? 2.5 : 2} className={currentView === 'search' ? "text-zuno-accent" : ""} />
          <span className="text-[10px] font-medium">Buscar</span>
        </button>

        {/* Highlighted Vibe Generator Action */}
        <button
          onClick={() => setView('generator')}
          className={`flex flex-col items-center gap-1 transition-colors w-16 ${currentView === 'generator' ? 'text-white' : 'text-zuno-muted hover:text-white'}`}
        >
          <div className={`p-1 rounded-full ${currentView === 'generator' ? 'bg-zuno-accent/20' : ''} transition-colors`}>
            <Sliders size={22} strokeWidth={currentView === 'generator' ? 2.5 : 2} className={currentView === 'generator' ? "text-zuno-accent" : ""} />
          </div>
          <span className="text-[10px] font-medium">Vibe</span>
        </button>

        <button
          onClick={() => setView('library')}
          className={`flex flex-col items-center gap-1 transition-colors w-16 ${currentView === 'library' ? 'text-white' : 'text-zuno-muted hover:text-white'}`}
        >
          <Library size={22} strokeWidth={currentView === 'library' ? 2.5 : 2} className={currentView === 'library' ? "text-zuno-accent" : ""} />
          <span className="text-[10px] font-medium">Biblio</span>
        </button>

        <button
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center gap-1 transition-colors w-16 text-zuno-muted hover:text-white`}
        >
          <MenuIcon size={22} />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </nav>

      {/* Slide-out Menu Drawer */}
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        setView={setView}
      />
    </>
  );
};