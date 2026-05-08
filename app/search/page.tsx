/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
// FIX: Going up two levels to reach the context folder from /app/search/
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/navigation";
import { 
  Search as SearchIcon, 
  Mic, 
  ChevronLeft, 
  Play, 
  Music2, 
  Disc, 
  ListMusic, 
  User, 
  X, 
  Loader2,
  AudioWaveform
} from "lucide-react";

// --- CONFIGURATION ---
const API_BASE = "https://gaanaayush.vercel.app/api/search";
const AUTOMATION_SECRET = "pR3nSUsTI9HQxb2RbdasB5mjKqUoSP8m";

// --- UTILS ---
const getImageUrl = (item: any) => {
  const url = item.artworkUrl || item.artwork || item.image || "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return url.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500").replace("50x50", "500x500");
};

const decodeEntities = (text: string) => 
  text ? text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";

// --- UI COMPONENTS ---

const PingPongMarquee = ({ text, className }: { text: string; className: string }) => {
  const isLong = text.length > 22;
  return (
    <div className="w-full overflow-hidden whitespace-nowrap">
      <span 
        className={`inline-block ${className} ${isLong ? "animate-ping-pong" : ""}`}
        style={isLong ? { animationDuration: `${Math.max(4, text.length * 0.15)}s` } : {}}
      >
        {text}
      </span>
    </div>
  );
};

const SkeletonItem = () => (
  <div className="flex items-center gap-4 px-4 py-3">
    <div className="w-14 h-14 rounded-xl skeleton-wave flex-shrink-0" />
    <div className="flex-1 flex flex-col gap-2">
      <div className="h-4 w-3/4 rounded skeleton-wave" />
      <div className="h-3 w-1/2 rounded skeleton-wave" />
    </div>
  </div>
);

export default function SearchPage() {
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState<any>(null);

  // --- API LOGIC ---
  const handleSearch = async (val: string) => {
    if (!val.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?q=${encodeURIComponent(val)}&limit=80`, {
        headers: { "x-vercel-protection-bypass": AUTOMATION_SECRET }
      });
      const json = await res.json();
      if (json.success) setResults(json.data);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) handleSearch(query);
      else setResults(null);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const onPlay = (item: any) => {
    const song = {
      ...item,
      track_id: item.track_id,
      track_title: item.title,
      album_title: item.album,
      artwork_large: item.artworkUrl,
      artist: [{ name: item.artists }]
    };
    setPlayContext({ type: "Search", name: query });
    setQueue([song]);
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const tabs = [
    { id: "all", label: "All", icon: <AudioWaveform size={14} /> },
    { id: "songs", label: "Songs", icon: <Music2 size={14} /> },
    { id: "albums", label: "Albums", icon: <Disc size={14} /> },
    { id: "playlists", label: "Playlists", icon: <ListMusic size={14} /> },
    { id: "artists", label: "Artists", icon: <User size={14} /> },
  ];

  const renderSection = (title: string, data: any[], type: string) => {
    if (!data || data.length === 0) return null;
    const list = activeTab === "all" ? data.slice(0, 5) : data;

    return (
      <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h2 className="px-4 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
          {title}
        </h2>
        <div className="flex flex-col">
          {list.map((item: any, i: number) => (
            <div 
              key={i} 
              onClick={() => type === 'song' ? onPlay(item) : router.push(`/${type}/${item.seokey}`)}
              className="flex items-center gap-4 px-4 py-3 active:bg-blue-500/10 transition-all cursor-pointer group"
            >
              <div className={`relative w-14 h-14 flex-shrink-0 overflow-hidden bg-[#131D30] border border-white/5 ${type === 'artist' ? 'rounded-full' : 'rounded-xl'}`}>
                <img src={getImageUrl(item)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                {type === 'song' && (
                  <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
                    <Play size={20} className="text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <PingPongMarquee text={decodeEntities(item.title || item.name)} className="text-[15px] font-bold text-white" />
                <p className="text-[12px] text-blue-200/40 mt-0.5 truncate font-medium">
                  {item.artists || item.language || (type === 'artist' ? 'Artist' : 'Collection')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#0B1320] text-white">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .skeleton-wave { position: relative; overflow: hidden; background-color: #131D30; }
        .skeleton-wave::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.06), transparent); animation: wave 1.5s infinite; }
        @keyframes ping-pong { 0%, 20% { transform: translateX(0); } 80%, 100% { transform: translateX(calc(-100% + 150px)); } }
        .animate-ping-pong { animation-name: ping-pong; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#0B1320]/80 backdrop-blur-xl border-b border-white/5 pt-10 px-4 pb-4">
        <div className="flex items-center gap-3 mb-5">
           <button onClick={() => router.back()} className="p-2 -ml-2 text-blue-400 active:scale-90 transition-transform"><ChevronLeft size={28} /></button>
           <h1 className="text-2xl font-black tracking-tighter">Search</h1>
        </div>
        
        <div className="relative group">
          <input 
            ref={inputRef}
            autoFocus
            type="text"
            placeholder="Search songs, albums..."
            className="w-full bg-[#131D30] border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-[16px] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-white/20"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/50" size={20} />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/20 hover:text-white"><X size={20} /></button>
          )}
        </div>

        {/* TABS */}
        <div className="flex gap-2 mt-5 overflow-x-auto hide-scrollbar pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all flex-shrink-0 ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-[#131D30] text-blue-200/40 border border-white/5"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="pb-32 pt-4">
        {loading ? (
          <div className="flex flex-col">
            {[...Array(8)].map((_, i) => <SkeletonItem key={i} />)}
          </div>
        ) : !results ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-10">
            <AudioWaveform size={80} className="mb-4 text-blue-500" />
            <p className="text-xs font-black uppercase tracking-[0.4em]">Search Gaana@8481</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {(activeTab === "all" || activeTab === "songs") && renderSection("Songs", results.songs, "song")}
            {(activeTab === "all" || activeTab === "albums") && renderSection("Albums", results.albums, "album")}
            {(activeTab === "all" || activeTab === "playlists") && renderSection("Playlists", results.playlists, "playlist")}
            {(activeTab === "all" || activeTab === "artists") && renderSection("Artists", results.artists, "artist")}
          </div>
        )}
      </div>

      {/* MINI LOADER */}
      {loading && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-blue-600 px-5 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-wider">Finding...</span>
        </div>
      )}
    </main>
  );
}
