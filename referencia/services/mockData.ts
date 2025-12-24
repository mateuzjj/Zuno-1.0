import { Track } from '../types';

export const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Midnight City',
    artist: 'M83',
    albumArt: 'https://picsum.photos/id/10/300/300',
    duration: 243,
    genre: ['Electronic', 'Synthpop'],
    bpm: 105,
    energy: 0.8,
    valence: 0.6,
    popularity: 90
  },
  {
    id: '2',
    title: 'Weightless',
    artist: 'Marconi Union',
    albumArt: 'https://picsum.photos/id/11/300/300',
    duration: 480,
    genre: ['Ambient', 'Chill'],
    bpm: 60,
    energy: 0.2,
    valence: 0.4,
    popularity: 75
  },
  {
    id: '3',
    title: 'Stronger',
    artist: 'Kanye West',
    albumArt: 'https://picsum.photos/id/12/300/300',
    duration: 311,
    genre: ['Hip Hop', 'Rap'],
    bpm: 104,
    energy: 0.95,
    valence: 0.7,
    popularity: 95
  },
  {
    id: '4',
    title: 'Lo-Fi Study Beats',
    artist: 'Chill Cow',
    albumArt: 'https://picsum.photos/id/13/300/300',
    duration: 180,
    genre: ['Lo-Fi', 'Instrumental'],
    bpm: 80,
    energy: 0.4,
    valence: 0.5,
    popularity: 85
  },
  {
    id: '5',
    title: 'Mr. Brightside',
    artist: 'The Killers',
    albumArt: 'https://picsum.photos/id/14/300/300',
    duration: 222,
    genre: ['Rock', 'Indie'],
    bpm: 148,
    energy: 0.9,
    valence: 0.3, // Sad lyrics, high energy
    popularity: 98
  },
  {
    id: '6',
    title: 'Clair de Lune',
    artist: 'Claude Debussy',
    albumArt: 'https://picsum.photos/id/15/300/300',
    duration: 300,
    genre: ['Classical'],
    bpm: 50,
    energy: 0.1,
    valence: 0.3,
    popularity: 88
  },
  {
    id: '7',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    albumArt: 'https://picsum.photos/id/16/300/300',
    duration: 200,
    genre: ['Pop', 'Synthwave'],
    bpm: 171,
    energy: 0.9,
    valence: 0.8,
    popularity: 99
  },
  {
    id: '8',
    title: 'Thunderstruck',
    artist: 'AC/DC',
    albumArt: 'https://picsum.photos/id/17/300/300',
    duration: 292,
    genre: ['Rock', 'Hard Rock'],
    bpm: 134,
    energy: 0.98,
    valence: 0.7,
    popularity: 92
  },
   {
    id: '9',
    title: 'Rain on the Roof',
    artist: 'Nature Sounds',
    albumArt: 'https://picsum.photos/id/18/300/300',
    duration: 600,
    genre: ['Nature', 'Sleep'],
    bpm: 0,
    energy: 0.05,
    valence: 0.5,
    popularity: 60
  }
];