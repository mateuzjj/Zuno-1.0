import React from 'react';
import { Home, Search, Library, PlusSquare, Heart, Wand2 } from 'lucide-react';
import { View } from '../../types';
import { Logo } from '../UI/Logo';
import { UserProfile } from '../User/UserProfile';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'library', label: 'Sua Biblioteca', icon: Library },
    { id: 'editor', label: 'Magic Studio', icon: Wand2 },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-zuno-main h-screen p-6 gap-8 fixed left-0 top-0 z-40 border-r border-white/5">
      {/* Brand */}
      <div className="mb-4 pl-1 cursor-pointer group" onClick={() => setView('home')}>
        <Logo className="h-8 text-white group-hover:text-zuno-accent transition-colors duration-500" />
        <p className="text-[10px] tracking-[0.3em] text-zuno-muted uppercase mt-3 font-medium opacity-60 group-hover:opacity-100 transition-opacity pl-0.5">Escute Diferente</p>
      </div>

      <UserProfile />

      {/* Main Nav */}
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`flex items-center gap-4 text-sm font-semibold px-4 py-3 rounded-card transition-all duration-200 group ${currentView === item.id
              ? 'bg-zuno-light text-white'
              : 'text-zuno-muted hover:text-white hover:bg-white/5'
              }`}
          >
            <item.icon
              size={24}
              strokeWidth={currentView === item.id ? 2.5 : 2}
              className={`transition-transform duration-300 ${currentView === item.id ? 'text-zuno-accent scale-105' : 'group-hover:scale-105'}`}
            />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full my-2" />

      {/* Library Actions */}
      <div className="flex flex-col gap-4 px-2">
        <button className="flex items-center gap-4 text-sm font-semibold text-zuno-muted hover:text-white transition-colors group">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <PlusSquare size={18} />
          </div>
          Criar playlist
        </button>
        <button
          onClick={() => setView('likedSongs')}
          className="flex items-center gap-4 text-sm font-semibold text-zuno-muted hover:text-white transition-colors group"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity shadow-lg shadow-purple-900/20">
            <Heart size={16} fill="white" className="text-white" />
          </div>
          Músicas Curtidas
        </button>
      </div>

      {/* Manifesto Snippet */}
      <div className="mt-auto p-5 bg-gradient-to-br from-zuno-light/50 to-transparent rounded-card border border-white/5">
        <p className="text-xs text-zuno-muted leading-relaxed italic font-light">
          "A música não é fundo.<br />É presença."
        </p>
      </div>
    </aside>
  );
};