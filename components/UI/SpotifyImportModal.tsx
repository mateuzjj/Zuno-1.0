import React, { useState } from 'react';
import { Modal } from './Modal';
import { SpotifyAuth } from '../../services/spotifyAuth';
import { SpotifyImportService, ImportProgress } from '../../services/spotifyImportService';
import { Music, Users, Loader, CheckCircle, XCircle, Download } from 'lucide-react';
import { toast } from './Toast';

interface SpotifyImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ImportStep = 'auth' | 'select' | 'importing' | 'complete';

export const SpotifyImportModal: React.FC<SpotifyImportModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<ImportStep>('auth');
    const [selectedItems, setSelectedItems] = useState({
        likedSongs: true,
        followedArtists: true,
    });
    const [progress, setProgress] = useState<ImportProgress | null>(null);
    const [results, setResults] = useState<any>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleConnect = async () => {
        try {
            await SpotifyAuth.login();
        } catch (error) {
            console.error('Failed to connect to Spotify:', error);
            toast.show('Erro ao conectar com Spotify', 'error');
        }
    };

    const handleStartImport = async () => {
        setIsImporting(true);
        setStep('importing');

        try {
            const importResults: any = {
                likedSongs: { total: 0, imported: 0, failed: [] },
                followedArtists: { total: 0, imported: 0, failed: [] },
            };

            if (selectedItems.likedSongs) {
                importResults.likedSongs = await SpotifyImportService.importLikedSongs(setProgress);
            }

            if (selectedItems.followedArtists) {
                importResults.followedArtists = await SpotifyImportService.importFollowedArtists(setProgress);
            }

            setResults(importResults);
            setStep('complete');
            toast.show('Importação concluída!', 'success');
        } catch (error) {
            console.error('Import failed:', error);
            toast.show('Erro durante a importação', 'error');
            setStep('select');
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        if (!isImporting) {
            setStep('auth');
            setProgress(null);
            setResults(null);
            onClose();
        }
    };

    const downloadFailedItems = () => {
        if (!results) return;

        const allFailed: string[] = [
            ...results.likedSongs.failed.map((item: string) => `[Música] ${item}`),
            ...results.followedArtists.failed.map((item: string) => `[Artista] ${item}`),
        ];

        const text = allFailed.join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'spotify-import-failed.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    React.useEffect(() => {
        if (isOpen && SpotifyAuth.isAuthenticated()) {
            setStep('select');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <div className="bg-zuno-card rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Importar do Spotify</h2>
                        <p className="text-zuno-muted text-sm">Migre suas músicas e artistas favoritos</p>
                    </div>
                </div>

                {/* Auth Step */}
                {step === 'auth' && (
                    <div className="text-center py-8">
                        <p className="text-zuno-muted mb-6">
                            Conecte-se com sua conta Spotify para começar a importação
                        </p>
                        <button
                            onClick={handleConnect}
                            className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full font-bold transition-colors flex items-center gap-2 mx-auto"
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            Conectar com Spotify
                        </button>
                    </div>
                )}

                {/* Select Step */}
                {step === 'select' && (
                    <div className="space-y-4">
                        <p className="text-zuno-muted mb-4">Selecione o que deseja importar:</p>

                        <label className="flex items-center gap-4 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                            <input
                                type="checkbox"
                                checked={selectedItems.likedSongs}
                                onChange={(e) => setSelectedItems({ ...selectedItems, likedSongs: e.target.checked })}
                                className="w-5 h-5"
                            />
                            <Music className="text-zuno-accent" size={24} />
                            <div className="flex-1">
                                <div className="text-white font-semibold">Músicas Curtidas</div>
                                <div className="text-sm text-zuno-muted">Importar todas as suas músicas favoritas</div>
                            </div>
                        </label>

                        <label className="flex items-center gap-4 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                            <input
                                type="checkbox"
                                checked={selectedItems.followedArtists}
                                onChange={(e) => setSelectedItems({ ...selectedItems, followedArtists: e.target.checked })}
                                className="w-5 h-5"
                            />
                            <Users className="text-zuno-accent" size={24} />
                            <div className="flex-1">
                                <div className="text-white font-semibold">Artistas Seguidos</div>
                                <div className="text-sm text-zuno-muted">Importar artistas que você segue</div>
                            </div>
                        </label>

                        <button
                            onClick={handleStartImport}
                            disabled={!selectedItems.likedSongs && !selectedItems.followedArtists}
                            className="w-full bg-zuno-accent hover:bg-zuno-accent/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-4 rounded-full mt-6 transition-colors"
                        >
                            Iniciar Importação
                        </button>
                    </div>
                )}

                {/* Importing Step */}
                {step === 'importing' && progress && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zuno-muted capitalize">{progress.phase}</span>
                            <span className="text-white">{progress.processed} / {progress.total}</span>
                        </div>

                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-zuno-accent h-full transition-all duration-300"
                                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                            />
                        </div>

                        <div className="flex items-center gap-3 text-white">
                            <Loader className="animate-spin" size={20} />
                            <span className="text-sm">{progress.currentItem}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="text-2xl font-bold text-green-500">{progress.matched}</div>
                                <div className="text-xs text-zuno-muted mt-1">Importadas</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="text-2xl font-bold text-white">{progress.processed}</div>
                                <div className="text-xs text-zuno-muted mt-1">Processadas</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="text-2xl font-bold text-red-500">{progress.failed}</div>
                                <div className="text-xs text-zuno-muted mt-1">Falhas</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Complete Step */}
                {step === 'complete' && results && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-center">
                            <CheckCircle className="text-green-500" size={64} />
                        </div>

                        <h3 className="text-xl font-bold text-white text-center">Importação Concluída!</h3>

                        <div className="space-y-3">
                            {selectedItems.likedSongs && (
                                <div className="bg-white/5 rounded-xl p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Music className="text-zuno-accent" size={20} />
                                        <span className="font-semibold text-white">Músicas Curtidas</span>
                                    </div>
                                    <div className="text-sm text-zuno-muted">
                                        {results.likedSongs.imported} de {results.likedSongs.total} importadas
                                        {results.likedSongs.failed.length > 0 && (
                                            <span className="text-red-400"> • {results.likedSongs.failed.length} falhas</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedItems.followedArtists && (
                                <div className="bg-white/5 rounded-xl p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Users className="text-zuno-accent" size={20} />
                                        <span className="font-semibold text-white">Artistas Seguidos</span>
                                    </div>
                                    <div className="text-sm text-zuno-muted">
                                        {results.followedArtists.imported} de {results.followedArtists.total} importados
                                        {results.followedArtists.failed.length > 0 && (
                                            <span className="text-red-400"> • {results.followedArtists.failed.length} falhas</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {(results.likedSongs.failed.length > 0 || results.followedArtists.failed.length > 0) && (
                            <button
                                onClick={downloadFailedItems}
                                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2 transition-colors"
                            >
                                <Download size={18} />
                                Baixar Lista de Falhas
                            </button>
                        )}

                        <button
                            onClick={handleClose}
                            className="w-full bg-zuno-accent hover:bg-zuno-accent/80 text-black font-bold py-4 rounded-full transition-colors"
                        >
                            Concluir
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
