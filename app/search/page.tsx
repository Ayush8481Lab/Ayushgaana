/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, Mic, ChevronLeft, Play, Music2, Disc, ListMusic, User, X, Loader2 } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { useRouter } from "next/navigation";

// --- API CONSTANTS ---
const API_BASE = "https://gaanaayush.vercel.app/api/search";
const AUTOMATION_SECRET = "pR3nSUsTI9HQxb2RbdasB5mjKqUoSP8m";

// --- UTILS ---
const getImageUrl = (item: any) => {
  const url = item.artworkUrl || item.artwork || item.image || "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return url.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500").replace("50x50", "500x500");
};

const decodeEntities = (text: string) => text ? text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";

// --- PING-PONG MARQUEE ---
const MarqueeText = ({ text, className }: { text: string; className: string }) => {
  const isLong = text.length > 20;
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

// --- SKELETON COMPONENT ---
const SearchSkeleton = () => (
  <div className="flex flex-col gap-4 mt-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4">
        <div className="w-14 h-14 rounded-xl skeleton-wave flex-shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-4 w-3/4 rounded skeleton-wave" />
          <div className="h-3 w-1/2 rounded skeleton-wave" />
        </div>
      </div>
    ))}
  </div>
);

export default function Search() {
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState<any>(null);

  // Handle Search Logic
  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?q=${encodeURIComponent(searchTerm)}&limit=80`, {
        headers: { "x-vercel-protection-bypass": AUTOMATION_SECRET }
      });
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
      }
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setLoading(false);
    }
  };

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) handleSearch(query);
      else setResults(null);
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  const handleItemClick = (item: any, type: string) => {
    if (type === "song") {
      const songObj = {
         ...item,
         track_id: item.track_id,
         track_title: item.title,
         album_title: item.album,
         artwork_large: item.artworkUrl,
         artist: [{ name: item.artists }]
      };
      setPlayContext({ type: "Search", name: query });
      setQueue([songObj]);
      setCurrentSong(songObj);
      setIsPlaying(true);
    } else {
      router.push(`/${type}/${item.seokey}`);
    }
  };

  const tabs = [
    { id: "all", label: "All", icon: <SearchIcon size={14} /> },
    { id: "songs", label: "Songs", icon: <Music2 size={14} /> },
    { id: "albums", label: "Albums", icon: <Disc size={14} /> },
    { id: "playlists", label: "Playlists", icon: <ListMusic size={14} /> },
    { id: "artists", label: "Artists", icon: <User size={14} /> },
  ];

  const renderSection = (title: string, data: any[], type: string) => {
    if (!data || data.length === 0) return null;
    const items = activeTab === "all" ? data.slice(0, 5) : data;

    return (
      <div className="mb-8">
        <h2 className="px-4 text-blue-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center justify-between">
          {title}
          {activeTab === "all" && <span className="text-[10px] bg-blue-500/10 px-2 py-0.5 rounded text-blue-300">Top Results</span>}
        </h2>
        <div className="flex flex-col gap-1">
          {items.map((item: any, i: number) => (
            <div 
              key={i} 
              onClick={() => handleItemClick(item, type)}
              className="flex items-center gap-4 px-4 py-3 active:bg-blue-500/10 transition-colors cursor-pointer group"
            >
              <div className={`relative w-14 h-14 flex-shrink-0 overflow-hidden shadow-lg ${type === 'artist' ? 'rounded-full' : 'rounded-xl'} border border-white/5 bg-[#131D30]`}>
                <img src={getImageUrl(item)} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                {type === 'song' && (
                  <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
                    <Play size={20} className="text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <MarqueeText text={decodeEntities(item.title || item.name)} className="text-[15px] font-bold text-white leading-none" />
                <p className="text-[12px] text-blue-200/50 font-medium mt-1 truncate">
                  {type === 'song' ? item.artists : type === 'album' ? `${item.language} • ${item.artists}` : item.language || 'Artist'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#0B1320] text-white pt-6 pb-28">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .skeleton-wave { position: relative; overflow: hidden; background-color: #131D30; }
        .skeleton-wave::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent); animation: wave 1.5s infinite; }
        @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(calc(-100% + 140px)); } }
        .animate-ping-pong { animation-name: ping-pong; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}} />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0B1320]/80 backdrop-blur-xl px-4 pt-4 pb-2 border-b border-white/5">
        <div className="flex items-center gap-3 mb-4">
           <button onClick={() => router.back()} className="p-2 -ml-2 text-blue-400"><ChevronLeft size={28} /></button>
           <h1 className="text-2xl font-black tracking-tight">Search</h1>
        </div>
        
        <div className="relative group">
          <input 
            ref={inputRef}
            autoFocus
            type="text"
            placeholder="Search songs, albums, artists..."
            className="w-full bg-[#131D30] border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-[15px] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/50" size={20} />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-white/30"><X size={18} /></button>
          )}
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 p-1.5 bg-blue-500/10 rounded-full"><Mic size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition-all flex-shrink-0 ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-[#131D30] text-blue-200/50 border border-white/5"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        {loading ? (
          <SearchSkeleton />
        ) : !results ? (
          <div className="flex flex-col items-center justify-center py-20 text-blue-200/20">
            <SearchIcon size={64} className="mb-4 opacity-10" />
            <p className="text-sm font-bold tracking-widest uppercase">Start typing to search</p>
          </div>
        ) : (
          <>
            {(activeTab === "all" || activeTab === "songs") && renderSection("Songs", results.songs, "song")}
            {(activeTab === "all" || activeTab === "albums") && renderSection("Albums", results.albums, "album")}
            {(activeTab === "all" || activeTab === "playlists") && renderSection("Playlists", results.playlists, "playlist")}
            {(activeTab === "all" || activeTab === "artists") && renderSection("Artists", results.artists, "artist")}
          </>
        )}
      </div>

      {/* Footer Buffer */}
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-blue-500" size={24} />
        </div>
      )}
    </main>
  );
}
