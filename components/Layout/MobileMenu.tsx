import React from 'react';
import { X, User, Wand2, Heart, PlusSquare, Sliders, LogOut } from 'lucide-react';
import { View } from '../../types';
import { Logo } from '../UI/Logo';
import { SpotifyAuth } from '../../services/spotifyAuth';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    setView: (view: View) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, setView }) => {
    const handleNavigation = (view: View) => {
        setView(view);
        onClose();
    };

    const handleLogout = () => {
        SpotifyAuth.logout();
        window.location.reload();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="absolute top-0 bottom-0 right-0 w-[80%] max-w-sm bg-zuno-card border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 p-6 flex flex-col gap-8 safe-top safe-bottom">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Logo className="h-6 text-white" />
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* User Profile Section (Simplified) */}
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-12 h-12 rounded-full bg-zuno-light flex items-center justify-center border border-white/10">
                        <User size={24} className="text-white/70" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Meu Perfil</h3>
                        <p className="text-xs text-zuno-accent cursor-pointer hover:underline" onClick={handleLogout}>Sair da conta</p>
                    </div>
                </div>

                {/* Navigation Links */}
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-bold text-zuno-muted uppercase tracking-wider mb-2 px-2">Menu Principal</p>

                    <button onClick={() => handleNavigation('generator')} className="flex items-center gap-4 text-white p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <Sliders size={20} className="text-zuno-accent" />
                        <span className="font-medium">Vibe Generator</span>
                    </button>

                    <button onClick={() => handleNavigation('editor')} className="flex items-center gap-4 text-white p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <Wand2 size={20} className="text-purple-400" />
                        <span className="font-medium">Magic Studio</span>
                    </button>
                </div>

                {/* Library Actions */}
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-bold text-zuno-muted uppercase tracking-wider mb-2 px-2">Sua Biblioteca</p>

                    <button onClick={() => handleNavigation('likedSongs')} className="flex items-center gap-4 text-white p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                            <Heart size={12} fill="white" className="text-white" />
                        </div>
                        <span className="font-medium">Músicas Curtidas</span>
                    </button>

                    <button className="flex items-center gap-4 text-white p-3 rounded-xl hover:bg-white/5 transition-colors opacity-70 cursor-not-allowed">
                        <PlusSquare size={20} className="text-white/70" />
                        <span className="font-medium">Criar Playlist (Em breve)</span>
                    </button>
                </div>

                {/* Footer */}
                <div className="mt-auto">
                    <p className="text-xs text-center text-white/30 italic">
                        "A música não é fundo.<br />É presença."
                    </p>
                </div>

            </div>
        </div>
    );
};
