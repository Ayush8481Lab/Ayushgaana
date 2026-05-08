/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/navigation";
import { 
  Search as SearchIcon, Mic, ChevronLeft, X, 
  Loader2, Music2, Disc, ListMusic, User, LayoutGrid, WifiOff, Play
} from "lucide-react";

// --- CONFIGURATION & CONSTANTS ---
const API_BASE = "https://gaanaayush.vercel.app/api/search";
const AUTOMATION_SECRET = "pR3nSUsTI9HQxb2RbdasB5mjKqUoSP8m";
const STORAGE_STATE_KEY = "music8481_search_state_v3";
const CACHE_PREFIX = "music8481_search_cache_";
const CACHE_DURATION = 72 * 60 * 60 * 1000; // 72 Hours

// --- UTILS ---
const getImageUrl = (item: any, size = "500x500") => {
  const url = item.artworkUrl || item.artwork || item.image || "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return url.replace(/size_[ms]/g, "size_l").replace("150x150", size).replace("50x50", size);
};

const decodeEntities = (text: string) => 
  text ? text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";

// --- PREMIUM COMPONENTS ---
const PingPongMarquee = ({ text, className }: { text: string; className: string }) => {
  const isLong = text.length > 15;
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

// --- ADVANCED INTERACTIVE CARD (Safe Zone + Buffering) ---
const InteractiveCard = ({ item, type, onClick, isBuffering }: any) => {
  const title = decodeEntities(item.title || item.name || "Unknown");
  const subtitle = item.artists || item.language || (type === 'artist' ? 'Artist' : '');
  const isCircle = type === 'artist';

  // Smart 70% Safe Click Logic
  const handleSafeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 15% edge boundary on all sides = 30% edges total. Center 70% is safe.
    const safeX = x > rect.width * 0.15 && x < rect.width * 0.85;
    const safeY = y > rect.height * 0.15 && y < rect.height * 0.85;

    if (safeX && safeY) {
      onClick(item, type);
    }
  };

  return (
    <div 
      onClick={handleSafeClick} 
      className="flex flex-col gap-1.5 cursor-pointer group active:scale-95 transition-transform duration-200 select-none pb-1"
    >
      <div className={`relative w-full aspect-square bg-[#131D30] border border-white/5 overflow-hidden shadow-lg ${isCircle ? 'rounded-full' : 'rounded-2xl'}`}>
        <img 
          src={getImageUrl(item, "500x500")} 
          alt={title} 
          loading="lazy" 
          draggable={false}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none" 
        />
        
        {/* Play Icon Hover Overlay for Songs */}
        {type === 'song' && !isBuffering && (
          <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
            <Play size={28} className="text-white fill-white shadow-xl" />
          </div>
        )}

        {/* Buffering Overlay on Click */}
        {isBuffering && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-10 transition-opacity duration-300">
             <Loader2 className="animate-spin text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" size={36} />
          </div>
        )}
      </div>
      
      <div className={`w-full px-1 mt-1 ${isCircle ? 'text-center' : 'text-left'}`}>
        <PingPongMarquee text={title} className="text-[13px] font-extrabold text-white/95 tracking-wide" />
        <p className="text-[11px] font-medium text-blue-200/50 truncate mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function SearchPage() {
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  const router = useRouter();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ongoingRequestRef = useRef<string | null>(null);
  
  const[query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const[activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState<any>(null);
  
  const [isListening, setIsListening] = useState(false);
  const[isOffline, setIsOffline] = useState(false);
  
  // Track which specific card is buffering
  const[loadingCardId, setLoadingCardId] = useState<string | null>(null);

  // --- NETWORK & HYDRATION ---
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setIsOffline(true);

    const saved = sessionStorage.getItem(STORAGE_STATE_KEY);
    if (saved) {
      try {
        const { query: q, results: r, tab, scrollY } = JSON.parse(saved);
        setQuery(q); setResults(r); setActiveTab(tab);
        setTimeout(() => window.scrollTo(0, scrollY), 50);
      } catch (e) { }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },[]);

  const saveState = (overrides = {}) => {
    sessionStorage.setItem(STORAGE_STATE_KEY, JSON.stringify({ 
      query, results, tab: activeTab, scrollY: window.scrollY, ...overrides 
    }));
  };

  // --- 72 HOUR CACHE MANAGER ---
  const getCachedData = (searchQuery: string) => {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${searchQuery.toLowerCase()}`);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) return data;
        localStorage.removeItem(`${CACHE_PREFIX}${searchQuery.toLowerCase()}`);
      }
    } catch (e) { }
    return null;
  };

  const setCachedData = (searchQuery: string, data: any) => {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${searchQuery.toLowerCase()}`, JSON.stringify({
        timestamp: Date.now(), data
      }));
    } catch (e) { }
  };

  // --- CORE SEARCH LOGIC ---
  const performSearch = async (val: string, blurKeyboard = false) => {
    const q = val.trim();
    if (!q) return;
    
    if (blurKeyboard) inputRef.current?.blur();
    if (isOffline) return;

    const cachedData = getCachedData(q);
    if (cachedData) {
      setResults(cachedData);
      saveState({ query: q, results: cachedData });
      setLoading(false);
      return;
    }

    if (ongoingRequestRef.current === q) return;
    ongoingRequestRef.current = q;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?q=${encodeURIComponent(q)}&limit=80`, {
        headers: { "x-vercel-protection-bypass": AUTOMATION_SECRET }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setResults(json.data);
          setCachedData(q, json.data);
          saveState({ query: q, results: json.data });
        }
      }
    } catch (e) {
    } finally {
      ongoingRequestRef.current = null;
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    
    if (val.trim()) {
      searchTimerRef.current = setTimeout(() => performSearch(val, false), 3000);
    } else {
      handleClear(); // Completely clear if user deletes input
    }
  };

  const handleManualSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    performSearch(query, true);
  };

  // --- CLEAR HISTORY FIX ---
  const handleClear = () => {
    setQuery("");
    setResults(null);
    setLoadingCardId(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    sessionStorage.removeItem(STORAGE_STATE_KEY);
    inputRef.current?.focus(); // Bring keyboard back
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      performSearch(transcript, true);
    };
    recognition.start();
  };

  // --- SAFE CARD CLICK HANDLER & BUFFERING ---
  const handleItemClick = async (item: any, type: string) => {
    const id = item.seokey || item.track_id;
    setLoadingCardId(id); // Trigger Buffering Overlay
    saveState();

    // Small delay to ensure the UI paints the spinner before JS blocks for routing
    await new Promise(r => setTimeout(r, 50));

    if (type === 'song') {
      const song = { ...item, track_id: item.track_id, track_title: item.title, album_title: item.album, artwork_large: item.artworkUrl, artist:[{ name: item.artists }] };
      setPlayContext({ type: "Search", name: query });
      setQueue([song]); setCurrentSong(song); setIsPlaying(true);
      
      // Remove loading after 500ms for songs since they don't redirect pages
      setTimeout(() => setLoadingCardId(null), 500); 
    } else {
      router.push(`/${type}/${item.seokey}`);
      // Loading spinner stays active until the new page mounts!
    }
  };

  // --- UI RENDERERS ---
  const tabs =[
    { id: "all", label: "All", icon: <LayoutGrid size={14} /> },
    { id: "songs", label: "Songs", icon: <Music2 size={14} /> },
    { id: "albums", label: "Albums", icon: <Disc size={14} /> },
    { id: "playlists", label: "Playlists", icon: <ListMusic size={14} /> },
    { id: "artists", label: "Artists", icon: <User size={14} /> },
  ];

  const renderSection = (title: string, data: any[], type: string) => {
    if (!data || data.length === 0) return null;
    const isFullView = activeTab !== "all";
    const displayData = isFullView ? data : data.slice(0, 6);

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between px-3 mb-3">
          <h2 className="text-[18px] font-black tracking-tight text-white/95">{title}</h2>
          {!isFullView && (
            <button onClick={() => handleTabChange(type + 's')} className="text-[11px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
              View All
            </button>
          )}
        </div>
        
        <div className={`px-3 ${isFullView ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-6' : 'flex gap-3 overflow-x-auto hide-scrollbar snap-x'}`}>
          {displayData.map((item: any, i: number) => {
            const id = item.seokey || item.track_id;
            return (
              <div key={i} className={isFullView ? "" : "w-[30vw] sm:w-[140px] flex-shrink-0 snap-start"}>
                <InteractiveCard 
                  item={item} 
                  type={type} 
                  onClick={handleItemClick} 
                  isBuffering={loadingCardId === id}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#0B1320] text-white selection:bg-blue-500/30">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .skeleton-wave { position: relative; overflow: hidden; background-color: #131D30; }
        .skeleton-wave::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.05), transparent); animation: wave 1.5s infinite; }
        @keyframes ping-pong { 0%, 20% { transform: translateX(0); } 80%, 100% { transform: translateX(calc(-100% + 140px)); } }
        .animate-ping-pong { animation-name: ping-pong; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        input[type="search"]::-webkit-search-cancel-button { display: none; }
      `}} />

      {/* COMPACT STICKY HEADER */}
      <div className="sticky top-0 z-50 bg-[#0B1320]/60 backdrop-blur-2xl border-b border-white/5 pt-3 px-3 pb-3 shadow-md">
        <div className="flex items-center gap-2 mb-3">
           <button onClick={() => router.back()} className="p-1.5 text-blue-400 active:scale-90 transition-transform"><ChevronLeft size={28} /></button>
           
           <form onSubmit={handleManualSearch} className="relative flex-1">
             <input 
               ref={inputRef}
               type="search"
               enterKeyHint="search"
               placeholder="Songs, artists, albums..."
               className="w-full bg-[#131D30]/80 border border-white/10 rounded-xl py-3 pl-10 pr-12 text-[15px] focus:bg-[#131D30] focus:border-blue-500/50 outline-none transition-all"
               value={query}
               onChange={handleInputChange}
             />
             <SearchIcon onClick={handleManualSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/50 cursor-pointer" size={18} />
             
             <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
               {query && <X onClick={handleClear} size={18} className="text-white/40 p-0.5 cursor-pointer hover:text-white transition-colors" />}
               <button type="button" onClick={startVoiceSearch} className={`p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-blue-400 bg-blue-500/10'}`}>
                 <Mic size={16} />
               </button>
             </div>
           </form>
        </div>

        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-all flex-shrink-0 ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-[#131D30] text-blue-200/40 border border-white/5"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="pb-32 pt-5">
        {isOffline ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-60">
            <WifiOff size={48} className="mb-4 text-red-400" />
            <p className="text-sm font-bold text-red-200 uppercase tracking-widest">No Internet</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-3 gap-4 px-4 mt-2">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="w-full aspect-square rounded-2xl skeleton-wave" />
                <div className="h-3 w-3/4 rounded skeleton-wave mx-auto" />
              </div>
            ))}
          </div>
        ) : !results ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-10">
            <SearchIcon size={80} className="mb-4 text-white" />
            <p className="text-[11px] font-black uppercase tracking-[0.3em]">Start Searching</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(activeTab === "all" || activeTab === "songs") && renderSection("Songs", results.songs, "song")}
            {(activeTab === "all" || activeTab === "albums") && renderSection("Albums", results.albums, "album")}
            {(activeTab === "all" || activeTab === "playlists") && renderSection("Playlists", results.playlists, "playlist")}
            {(activeTab === "all" || activeTab === "artists") && renderSection("Artists", results.artists, "artist")}
          </div>
        )}
      </div>

      {/* VOICE OVERLAY */}
      {isListening && (
        <div className="fixed inset-0 bg-[#0B1320]/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
           <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_50px_rgba(37,99,235,0.5)]">
             <Mic size={40} />
           </div>
           <h2 className="mt-8 text-2xl font-black tracking-tight">Listening...</h2>
           <button onClick={() => setIsListening(false)} className="mt-12 px-8 py-3 bg-white/10 rounded-full font-bold active:scale-95 transition-transform">Cancel</button>
        </div>
      )}
    </main>
  );
}
