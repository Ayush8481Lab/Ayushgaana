/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { useAppContext } from "../context/AppContext";
import { useRouter } from "next/navigation";

// --- CONFIGURATION ---
const API_BASE = "https://gaanaayush.vercel.app/api/search";
const AUTOMATION_SECRET = "pR3nSUsTI9HQxb2RbdasB5mjKqUoSP8m";

// --- UTILITIES ---
const getImageUrl = (item: any) => {
  const url = item.artworkUrl || item.artwork || item.image || "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return url.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500").replace("50x50", "500x500");
};

const decodeEntities = (text: string) => 
  text ? text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";

// --- ANIMATED COMPONENTS ---

const PingPongMarquee = ({ text, className }: { text: string; className: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      setShouldAnimate(textRef.current.offsetWidth > containerRef.current.offsetWidth);
    }
  }, [text]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden whitespace-nowrap">
      <span 
        ref={textRef}
        className={`inline-block ${className} ${shouldAnimate ? "animate-ping-pong" : ""}`}
        style={shouldAnimate ? { animationDuration: `${Math.max(4, text.length * 0.2)}s` } : {}}
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

// --- MAIN COMPONENT ---

export default function SearchPage() {
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState<any>(null);

  // --- API CALL ---
  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?q=${encodeURIComponent(searchTerm)}&limit=80`, {
        headers: { "x-vercel-protection-bypass": AUTOMATION_SECRET }
      });
      const json = await res.json();
      if (json.success) setResults(json.data);
    } catch (e) {
      console.error("Search Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Debounce Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) performSearch(query);
      else setResults(null);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Player Integration
  const handlePlay = (item: any) => {
    const songObj = {
      ...item,
      track_id: item.track_id,
      track_title: item.title,
      album_title: item.album,
      artwork_large: item.artworkUrl,
      artist: [{ name: item.artists || "Various Artists" }]
    };
    setPlayContext({ type: "Search", name: `Results for ${query}` });
    setQueue([songObj]);
    setCurrentSong(songObj);
    setIsPlaying(true);
  };

  const tabs = [
    { id: "all", label: "All", icon: <AudioWaveform size={14} /> },
    { id: "songs", label: "Songs", icon: <Music2 size={14} /> },
    { id: "albums", label: "Albums", icon: <Disc size={14} /> },
    { id: "playlists", label: "Playlists", icon: <ListMusic size={14} /> },
    { id: "artists", label: "Artists", icon: <User size={14} /> },
  ];

  const renderList = (data: any[], type: 'song' | 'album' | 'playlist' | 'artist') => {
    if (!data || data.length === 0) return null;
    const displayData = activeTab === "all" ? data.slice(0, 4) : data;

    return (
      <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-blue-400 text-[11px] font-black uppercase tracking-[0.2em]">
            {type}s
          </h2>
          {activeTab === "all" && data.length > 4 && (
            <button onClick={() => setActiveTab(`${type}s`)} className="text-[10px] font-bold text-blue-200/40">VIEW MORE</button>
          )}
        </div>
        
        <div className="flex flex-col">
          {displayData.map((item: any, idx: number) => (
            <div 
              key={idx}
              onClick={() => type === 'song' ? handlePlay(item) : router.push(`/${type}/${item.seokey}`)}
              className="flex items-center gap-4 px-4 py-3 active:bg-blue-500/10 transition-all cursor-pointer group"
            >
              <div className={`relative w-14 h-14 flex-shrink-0 overflow-hidden bg-[#131D30] border border-white/5 ${type === 'artist' ? 'rounded-full' : 'rounded-xl'}`}>
                <img src={getImageUrl(item)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                {type === 'song' && (
                  <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
                    <Play size={20} className="text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <PingPongMarquee text={decodeEntities(item.title || item.name)} className="text-[15px] font-bold text-white" />
                <p className="text-[12px] text-blue-200/50 mt-1 truncate font-medium">
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
    <main className="min-h-screen bg-[#0B1320] text-white selection:bg-blue-500/30">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .skeleton-wave { position: relative; overflow: hidden; background-color: #131D30; }
        .skeleton-wave::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.08), transparent); animation: wave 1.5s infinite; }
        @keyframes ping-pong { 0%, 20% { transform: translateX(0); } 80%, 100% { transform: translateX(calc(-100% + 160px)); } }
        .animate-ping-pong { animation-name: ping-pong; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* STICKY HEADER */}
      <div className="sticky top-0 z-50 bg-[#0B1320]/80 backdrop-blur-2xl border-b border-white/5 pt-10 px-4 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-blue-400 active:scale-90 transition-transform">
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-2xl font-black tracking-tighter">Search</h1>
        </div>

        <div className="relative">
          <input 
            ref={inputRef}
            type="text"
            placeholder="Songs, artists, or albums"
            className="w-full bg-[#131D30] border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-[16px] font-medium placeholder:text-white/20 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>

        {/* TABS */}
        <div className="flex gap-2 mt-5 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-extrabold transition-all flex-shrink-0 ${
                activeTab === tab.id 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105" 
                : "bg-[#131D30] text-blue-200/40 border border-white/5 hover:border-blue-500/30"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="pb-32 pt-4">
        {loading ? (
          <div className="flex flex-col">
            {[...Array(8)].map((_, i) => <SkeletonItem key={i} />)}
          </div>
        ) : !results ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-20">
            <AudioWaveform size={80} className="mb-4 text-blue-500 animate-pulse" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">Search Music@8481</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {(activeTab === "all" || activeTab === "songs") && renderList(results.songs, 'song')}
            {(activeTab === "all" || activeTab === "albums") && renderList(results.albums, 'album')}
            {(activeTab === "all" || activeTab === "playlists") && renderList(results.playlists, 'playlist')}
            {(activeTab === "all" || activeTab === "artists") && renderList(results.artists, 'artist')}
          </div>
        )}
      </div>

      {/* LOADING INDICATOR FOR SLOW NETWORKS */}
      {loading && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-blue-600 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[10px] font-black uppercase">Searching...</span>
        </div>
      )}
    </main>
  );
}
