import React, { useState, useEffect, useRef } from 'react';
import { Home, Search, Library, Menu as MenuIcon } from 'lucide-react';
import { View } from '../../types';
import { MobileMenu } from './MobileMenu';

interface MobileNavProps {
  currentView: View;
  setView: (view: View) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentView, setView }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    const handleScroll = () => {
      const currentScrollY = mainElement.scrollTop;

      // Determine direction
      // Threshold of 50px to avoid jitter
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home' as View, icon: Home, label: 'Início' },
    { id: 'search' as View, icon: Search, label: 'Buscar' },
    { id: 'library' as View, icon: Library, label: 'Biblio' },
  ];

  return (
    <>
      <nav
        className={`md:hidden fixed bottom-4 left-4 right-4 z-[40] transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-[200%]'}`}
        style={{
          bottom: 'calc(0.5rem + env(safe-area-inset-bottom))',
          left: 'calc(1rem + env(safe-area-inset-left))',
          right: 'calc(1rem + env(safe-area-inset-right))'
        }}
      >
        <div className="bg-zuno-card/98 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 px-2 py-2.5 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className="relative flex flex-col items-center transition-all duration-300 active:scale-95 group"
                aria-label={item.label}
              >
                {/* Circular background for active state - larger glow effect */}
                <div
                  className={`absolute -top-2 -left-2 -right-2 -bottom-2 rounded-full transition-all duration-300 ${isActive
                    ? 'bg-zuno-accent/30 scale-125 shadow-lg shadow-zuno-accent/40 blur-sm'
                    : 'bg-transparent scale-100 opacity-0 group-hover:opacity-100 group-hover:bg-white/5'
                    }`}
                />

                {/* Icon container */}
                <div
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isActive
                    ? 'bg-zuno-accent text-black scale-105 shadow-lg shadow-zuno-accent/30'
                    : 'bg-transparent text-zuno-muted group-hover:text-white'
                    }`}
                >
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? 'text-black' : 'transition-colors'}
                  />
                </div>
              </button>
            );
          })}

          {/* Menu button with special styling */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="relative flex flex-col items-center transition-all duration-300 active:scale-95 group"
            aria-label="Menu"
          >
            <div className="relative w-14 h-14 rounded-full flex items-center justify-center bg-transparent text-zuno-muted group-hover:text-white group-hover:bg-white/5 transition-all duration-300">
              <MenuIcon size={24} strokeWidth={2} />
            </div>
          </button>
        </div>
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