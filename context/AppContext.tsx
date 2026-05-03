"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

// Robust Artist Extractor (Gaana Specific)
const extractArtistsText = (data: any) => {
  if (!data) return "Unknown Artist";
  if (typeof data === "string") return data;
  
  let names: string[] =[];
  if (Array.isArray(data.artist)) names = data.artist.map((a: any) => a.name || a);
  else if (Array.isArray(data.singers)) names = data.singers.map((a: any) => a.name || a);
  else if (Array.isArray(data.artists)) names = data.artists.map((a: any) => a.name || a);
  else if (data?.primaryArtists) names = typeof data.primaryArtists === 'string' ? data.primaryArtists.split(',') : data.primaryArtists.map((a:any)=>a.name);
  else return "Unknown Artist";
  
  return Array.from(new Set(names)).join(", ");
};

type AppContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  currentSong: any;
  setCurrentSong: (song: any) => void;
  isPlaying: boolean;
  setIsPlaying: (play: boolean) => void;
  queue: any[];
  setQueue: (queue: any[]) => void;
  upcomingQueue: any[];
  setUpcomingQueue: React.Dispatch<React.SetStateAction<any[]>>;
  historyQueue: any[];
  setHistoryQueue: React.Dispatch<React.SetStateAction<any[]>>;
  playContext: { type: string; name: string };
  setPlayContext: (context: { type: string; name: string }) => void;
  likedSongs: any[];
  toggleLikeSong: (song: any) => void;
  likedPlaylists: any[];
  toggleLikePlaylist: (playlist: any) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState("Bhojpuri");
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [queue, setQueue] = useState<any[]>([]);
  const [upcomingQueue, setUpcomingQueue] = useState<any[]>([]);
  const [historyQueue, setHistoryQueue] = useState<any[]>([]);
  
  const[playContext, setPlayContext] = useState({ type: "Home", name: "Gaana Selection" });

  const[likedSongs, setLikedSongs] = useState<any[]>([]);
  const[likedPlaylists, setLikedPlaylists] = useState<any[]>([]);

  useEffect(() => {
    try {
       const recent = JSON.parse(localStorage.getItem('recent_songs') || '[]').filter(Boolean);
       if (recent.length > 0) setHistoryQueue(recent);
       
       const storedLikedSongs = JSON.parse(localStorage.getItem('liked_songs') || '[]').filter(Boolean);
       if (storedLikedSongs.length > 0) setLikedSongs(storedLikedSongs);

       const storedLikedPlaylists = JSON.parse(localStorage.getItem('liked_playlists') || '[]').filter(Boolean);
       if (storedLikedPlaylists.length > 0) setLikedPlaylists(storedLikedPlaylists);
    } catch(e) {}
  },[]);

  // Deduplicate queue based on Gaana track_id / entity_id / id
  useEffect(() => {
    setUpcomingQueue(prev => prev.filter((v, i, a) => 
      a.findIndex(t => (t.track_id || t.id || t.entity_id) === (v.track_id || v.id || v.entity_id)) === i
    ));
  }, [upcomingQueue.length]);

  const toggleLikeSong = (song: any) => {
    if (!song || (!song.id && !song.track_id && !song.entity_id)) return;
    const artistStr = extractArtistsText(song);
    const normalizedSong = { ...song, artists: artistStr, primaryArtists: artistStr, singers: artistStr };

    setLikedSongs(prev => {
      const exists = prev.find(s => s && (s.id || s.track_id || s.entity_id) === (normalizedSong.id || normalizedSong.track_id || normalizedSong.entity_id));
      const newList = exists ? prev.filter(s => s && (s.id || s.track_id || s.entity_id) !== (normalizedSong.id || normalizedSong.track_id || normalizedSong.entity_id)) : [normalizedSong, ...prev];
      localStorage.setItem('liked_songs', JSON.stringify(newList));
      return newList;
    });
  };

  const toggleLikePlaylist = (playlist: any) => {
    if (!playlist || (!playlist.id && !playlist.entity_id)) return;
    setLikedPlaylists(prev => {
      const exists = prev.find(p => p && (p.id || p.entity_id) === (playlist.id || playlist.entity_id));
      const newList = exists ? prev.filter(p => p && (p.id || p.entity_id) !== (playlist.id || playlist.entity_id)) : [playlist, ...prev];
      localStorage.setItem('liked_playlists', JSON.stringify(newList));
      return newList;
    });
  };

  return (
    <AppContext.Provider value={{ 
      language, setLanguage, 
      currentSong, setCurrentSong, 
      isPlaying, setIsPlaying, 
      queue, setQueue,
      upcomingQueue, setUpcomingQueue,
      historyQueue, setHistoryQueue,
      playContext, setPlayContext,
      likedSongs, toggleLikeSong,
      likedPlaylists, toggleLikePlaylist
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
}
