/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
// FIX: Correct depth to reach context from /app/search/
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/navigation";
import { 
  Search as SearchIcon, Mic, ChevronLeft, X, 
  Loader2, Music2, Disc, ListMusic, User, LayoutGrid
} from "lucide-react";

const API_BASE = "https://gaanaayush.vercel.app/api/search";
const AUTOMATION_SECRET = "pR3nSUsTI9HQxb2RbdasB5mjKqUoSP8m";
const STORAGE_KEY = "music8481_search_cache";

// --- UTILS ---
const getImageUrl = (item: any) => {
  const url = item.artworkUrl || item.artwork || item.image || "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return url.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500").replace("50x50", "500x500");
};

const decodeEntities = (text: string) => 
  text ? text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";

// --- PREMIUM COMPONENTS (MATCHING HOME) ---

const LazyImage = ({ src, alt, className }: any) => {
  const [loaded, setLoaded] = useState(false);
  const placeholder = "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundImage: `url(${placeholder})`, backgroundSize: 'cover' }}>
      <img 
        src={src || placeholder} 
        alt={alt} 
        loading="lazy" 
        onLoad={() => setLoaded(true)} 
        className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`} 
      />
    </div>
  );
};

const PremiumCard = ({ item, onClick, type }: any) => {
  const title = decodeEntities(item.title || item.name || "Unknown");
  const subtitle = item.artists || item.language || (type === 'artist' ? 'Artist' : '');
  const isLong = title.length > 13;

  return (
    <div onClick={() => onClick(item)} className="w-[30vw] sm:w-[160px] md:w-[180px] flex-shrink-0 cursor-pointer group pb-2">
      <div className="relative overflow-hidden bg-[#131D30] border border-white/5 rounded-2xl mb-2 transition-transform duration-200 active:scale-95 shadow-lg">
        <LazyImage src={getImageUrl(item)} alt={title} className="w-full aspect-square group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="w-full overflow-hidden whitespace-nowrap text-center px-1">
        <span className={`inline-block text-[13px] font-extrabold text-white ${isLong ? "animate-ping-pong" : ""}`} style={isLong ? { animationDuration: `${Math.max(4, title.length * 0.15)}s` } : {}}>{title}</span>
      </div>
      <div className="w-full overflow-hidden whitespace-nowrap text-center mt-0.5 px-1">
        <span className="inline-block text-[11px] font-medium text-blue-200/40 truncate w-full">{subtitle}</span>
      </div>
    </div>
  );
};

const SkeletonLoader = () => (
  <div className="grid grid-cols-3 gap-4 px-4 mt-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex flex-col gap-2">
        <div className="w-full aspect-square rounded-2xl skeleton-wave" />
        <div className="h-3 w-3/4 rounded skeleton-wave mx-auto" />
      </div>
    ))}
  </div>
);

// --- MAIN PAGE ---

export default function SearchPage() {
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  const router = useRouter();
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);

  // --- STATE RESTORATION ---
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { query: q, results: r, tab, scrollY } = JSON.parse(saved);
      setQuery(q);
      setResults(r);
      setActiveTab(tab);
      setTimeout(() => window.scrollTo(0, scrollY), 100);
    }
  }, []);

  const saveState = (overrides = {}) => {
    const state = { query, results, tab: activeTab, scrollY: window.scrollY, ...overrides };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  // --- SEARCH LOGIC ---
  const performSearch = async (val: string) => {
    if (!val.trim()) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?q=${encodeURIComponent(val)}&limit=80`, {
        headers: { "x-vercel-protection-bypass": AUTOMATION_SECRET }
      });
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
        saveState({ query: val, results: json.data });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    
    if (val.trim()) {
      // WAIT 3 SECONDS FOR AUTO SEARCH
      searchTimerRef.current = setTimeout(() => performSearch(val), 3000);
    } else {
      setResults(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleManualSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    performSearch(query);
  };

  // --- VOICE SEARCH ---
  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voice Search not supported in this browser.");

    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      performSearch(transcript);
    };
    recognition.start();
  };

  const handleItemClick = (item: any, type: string) => {
    saveState();
    if (type === 'song') {
      const song = { ...item, track_id: item.track_id, track_title: item.title, album_title: item.album, artwork_large: item.artworkUrl, artist: [{ name: item.artists }] };
      setPlayContext({ type: "Search", name: query });
      setQueue([song]); setCurrentSong(song); setIsPlaying(true);
    } else {
      router.push(`/${type}/${item.seokey}`);
    }
  };

  const tabs = [
    { id: "all", label: "All", icon: <LayoutGrid size={14} /> },
    { id: "songs", label: "Songs", icon: <Music2 size={14} /> },
    { id: "albums", label: "Albums", icon: <Disc size={14} /> },
    { id: "playlists", label: "Playlists", icon: <ListMusic size={14} /> },
    { id: "artists", label: "Artists", icon: <User size={14} /> },
  ];

  const renderSection = (title: string, data: any[], type: string) => {
    if (!data || data.length === 0) return null;
    const isFullView = activeTab !== "all";
    const displayData = isFullView ? data : data.slice(0, 8);

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-[18px] font-black tracking-tight text-white">{title}</h2>
          {!isFullView && (
            <button onClick={() => setActiveTab(type + 's')} className="text-[11px] font-bold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">View All</button>
          )}
        </div>
        <div className={`${isFullView ? 'grid grid-cols-3 gap-y-6' : 'flex gap-4 overflow-x-auto hide-scrollbar px-4'} w-full`}>
          {displayData.map((item: any, i: number) => (
            <div key={i} className={isFullView ? "flex justify-center" : ""}>
               <PremiumCard item={item} type={type} onClick={() => handleItemClick(item, type)} />
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
        @keyframes ping-pong { 0%, 20% { transform: translateX(0); } 80%, 100% { transform: translateX(calc(-100% + 140px)); } }
        .animate-ping-pong { animation-name: ping-pong; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}} />

      {/* HEADER - FIXED TOP SPACING */}
      <div className="sticky top-0 z-50 bg-[#0B1320]/90 backdrop-blur-xl border-b border-white/5 pt-4 px-4 pb-4">
        <div className="flex items-center gap-3 mb-4">
           <button onClick={() => router.back()} className="p-2 -ml-2 text-blue-400"><ChevronLeft size={28} /></button>
           <h1 className="text-xl font-black">Search</h1>
        </div>
        
        <form onSubmit={handleManualSearch} className="relative group">
          <input 
            type="text"
            placeholder="Search music..."
            className="w-full bg-[#131D30] border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-[15px] focus:border-blue-500/50 outline-none transition-all"
            value={query}
            onChange={handleInputChange}
          />
          <SearchIcon onClick={() => handleManualSearch()} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/50 cursor-pointer" size={20} />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && <X onClick={() => setQuery("")} size={18} className="text-white/20" />}
            <button type="button" onClick={startVoiceSearch} className={`p-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500/10 text-blue-400'}`}>
              <Mic size={18} />
            </button>
          </div>
        </form>

        {/* TABS - REFINED UI */}
        <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-bold transition-all flex-shrink-0 ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow-lg" : "bg-[#131D30] text-blue-200/30 border border-white/5"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* RESULTS */}
      <div className="pb-32 pt-4">
        {loading ? (
          <SkeletonLoader />
        ) : !results ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-10">
            <SearchIcon size={80} className="mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Gaana@8481</p>
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

      {isListening && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
           <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_50px_rgba(37,99,235,0.5)]">
             <Mic size={40} />
           </div>
           <h2 className="mt-8 text-2xl font-black">Listening...</h2>
           <button onClick={() => setIsListening(false)} className="mt-12 px-8 py-3 bg-white/10 rounded-full font-bold">Cancel</button>
        </div>
      )}
    </main>
  );
}
