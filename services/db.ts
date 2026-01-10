import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Playlist, Track, Artist } from '../types';

// Database Schema
interface ZunoDB extends DBSchema {
    playlists: {
        key: string;
        value: Playlist;
        indexes: { 'by-updatedAt': number };
    };
    likedTracks: {
        key: string;
        value: { track: Track; likedAt: number };
        indexes: { 'by-likedAt': number };
    };
    followedArtists: {
        key: string;
        value: { artist: Artist; followedAt: number };
        indexes: { 'by-followedAt': number };
    };
    lyricsCache: {
        key: string;
        value: {
            trackId: string;
            lyrics: any | null;
            timestamp: number;
            trackName: string;
            artistName: string;
        };
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'ZunoMusicDB';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<ZunoDB> | null = null;

/**
 * Initialize and get the IndexedDB instance
 */
export async function getDB(): Promise<IDBPDatabase<ZunoDB>> {
    if (dbInstance) {
        return dbInstance;
    }

    dbInstance = await openDB<ZunoDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Create playlists store
            if (!db.objectStoreNames.contains('playlists')) {
                const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
                playlistStore.createIndex('by-updatedAt', 'updatedAt');
            }

            // Create likedTracks store
            if (!db.objectStoreNames.contains('likedTracks')) {
                const likedStore = db.createObjectStore('likedTracks', { keyPath: 'track.id' });
                likedStore.createIndex('by-likedAt', 'likedAt');
            }

            // Create followedArtists store
            if (!db.objectStoreNames.contains('followedArtists')) {
                const followStore = db.createObjectStore('followedArtists', { keyPath: 'artist.id' });
                followStore.createIndex('by-followedAt', 'followedAt');
            }

            // Create lyricsCache store
            if (!db.objectStoreNames.contains('lyricsCache')) {
                const lyricsStore = db.createObjectStore('lyricsCache', { keyPath: 'trackId' });
                lyricsStore.createIndex('by-timestamp', 'timestamp');
            }
        },
    });

    return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDB(): void {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
