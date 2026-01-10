import React, { useState } from 'react';
import { Track } from '../../types';
import { PlaylistService } from '../../services/playlistService';
import { Modal } from './Modal';
import { toast } from './Toast';
import { X } from 'lucide-react';

interface CreatePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: () => void;
    initialTrack?: Track; // Optional: add this track to the playlist when created
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
    isOpen,
    onClose,
    onCreated,
    initialTrack
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.show('Por favor, insira um nome para a playlist', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const playlist = await PlaylistService.createPlaylist(
                name.trim(),
                description.trim() || undefined
            );

            // If initial track provided, add it to the playlist
            if (initialTrack) {
                await PlaylistService.addTracksToPlaylist(playlist.id, [initialTrack]);
            }

            toast.show('Playlist criada com sucesso!', 'success');
            setName('');
            setDescription('');
            onCreated?.();
            onClose();
        } catch (error) {
            console.error('Failed to create playlist:', error);
            toast.show('Erro ao criar playlist', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setName('');
            setDescription('');
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Criar Nova Playlist">
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="playlist-name" className="block text-sm font-medium text-white mb-2">
                            Nome *
                        </label>
                        <input
                            id="playlist-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 bg-zuno-dark border border-white/10 rounded-lg text-white placeholder-zuno-muted focus:outline-none focus:border-zuno-accent transition-colors"
                            placeholder="Minha Playlist"
                            disabled={isSubmitting}
                            maxLength={100}
                        />
                    </div>

                    <div>
                        <label htmlFor="playlist-description" className="block text-sm font-medium text-white mb-2">
                            Descrição (opcional)
                        </label>
                        <textarea
                            id="playlist-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 bg-zuno-dark border border-white/10 rounded-lg text-white placeholder-zuno-muted focus:outline-none focus:border-zuno-accent resize-none transition-colors"
                            placeholder="Adicione uma descrição..."
                            rows={3}
                            disabled={isSubmitting}
                            maxLength={300}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 bg-zuno-dark text-white rounded-lg hover:bg-white/5 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-zuno-accent text-black font-semibold rounded-lg hover:bg-zuno-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Criando...' : 'Criar'}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};
