import { Album } from '../types';

const STORAGE_KEY = 'zuno_liked_albums';

interface LikedAlbumEntry {
    album: Album;
    likedAt: number;
}

function getEntries(): LikedAlbumEntry[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveEntries(entries: LikedAlbumEntry[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function likeAlbum(album: Album): void {
    const entries = getEntries().filter(e => e.album.id !== album.id);
    entries.unshift({ album, likedAt: Date.now() });
    saveEntries(entries);
}

function unlikeAlbum(albumId: string): void {
    saveEntries(getEntries().filter(e => e.album.id !== albumId));
}

function isAlbumLiked(albumId: string): boolean {
    return getEntries().some(e => e.album.id === albumId);
}

function toggleAlbumLike(album: Album): boolean {
    if (isAlbumLiked(album.id)) {
        unlikeAlbum(album.id);
        return false;
    } else {
        likeAlbum(album);
        return true;
    }
}

function getLikedAlbums(): Album[] {
    return getEntries().map(e => e.album);
}

function getLikedAlbumsCount(): number {
    return getEntries().length;
}

export const LikedAlbumsService = {
    likeAlbum,
    unlikeAlbum,
    isAlbumLiked,
    toggleAlbumLike,
    getLikedAlbums,
    getLikedAlbumsCount,
};
