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
const STORAGE_STATE_KEY = "music8481_search_state_v2";
const CACHE_PREFIX = "music8481_search_cache_";
const CACHE_DURATION = 72 * 60 * 60 * 1000; // 72 Hours

// --- UTILS ---
const getImageUrl = (item: any, size = "500x500") => {
  const url = item.artworkUrl || item.artwork || item.image || "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return url.replace(/size_[ms]/g, "size_l").replace("150x150", size).replace("50x50", size);
};

const decodeEntities = (text: string) => 
  text ? text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";

// --- PREMIUM COMPACT COMPONENTS ---
const PingPongMarquee = ({ text, className }: { text: string; className: string }) => {
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

// Compact Row for Songs
const CompactRow = ({ item, onClick }: any) => {
  const title = decodeEntities(item.title || item.name || "Unknown");
  return (
    <div onClick={() => onClick(item, 'song')} className="flex items-center gap-3 px-3 py-1.5 active:bg-blue-500/10 transition-colors cursor-pointer group">
      <div className="relative w-12 h-12 flex-shrink-0 bg-[#131D30] rounded-lg overflow-hidden border border-white/5">
        <img src={getImageUrl(item, "150x150")} alt={title} loading="lazy" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
          <Play size={16} className="text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0 border-b border-white/5 pb-1">
        <PingPongMarquee text={title} className="text-[14px] font-bold text-white/90" />
        <p className="text-[11px] text-blue-200/40 mt-0.5 truncate">{item.artists}</p>
      </div>
    </div>
  );
};

// Compact Grid Card for Albums/Artists/Playlists
const CompactGridCard = ({ item, type, onClick }: any) => {
  const title = decodeEntities(item.title || item.name || "Unknown");
  const subtitle = item.artists || item.language || (type === 'artist' ? 'Artist' : '');
  const isCircle = type === 'artist';

  return (
    <div onClick={() => onClick(item, type)} className="flex flex-col gap-1.5 cursor-pointer group active:scale-95 transition-transform">
      <div className={`w-full aspect-square bg-[#131D30] border border-white/5 overflow-hidden shadow-md ${isCircle ? 'rounded-full' : 'rounded-xl'}`}>
        <img src={getImageUrl(item, "150x150")} alt={title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className={`w-full px-1 ${isCircle ? 'text-center' : 'text-left'}`}>
        <PingPongMarquee text={title} className="text-[12px] font-bold text-white/90" />
        <p className="text-[10px] font-medium text-blue-200/40 truncate">{subtitle}</p>
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
  
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState<any>(null);
  const[isListening, setIsListening] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // --- NETWORK & STATE HYDRATION ---
  useEffect(() => {
    // Network Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setIsOffline(true);

    // Restore State
    const saved = sessionStorage.getItem(STORAGE_STATE_KEY);
    if (saved) {
      try {
        const { query: q, results: r, tab, scrollY } = JSON.parse(saved);
        setQuery(q); setResults(r); setActiveTab(tab);
        setTimeout(() => window.scrollTo(0, scrollY), 50);
      } catch (e) { /* Silent */ }
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
    } catch (e) { /* Silent */ }
    return null;
  };

  const setCachedData = (searchQuery: string, data: any) => {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${searchQuery.toLowerCase()}`, JSON.stringify({
        timestamp: Date.now(), data
      }));
    } catch (e) { /* Handle QuotaExceeded silently */ }
  };

  // --- CORE SEARCH LOGIC ---
  const performSearch = async (val: string, blurKeyboard = false) => {
    const q = val.trim();
    if (!q) return;
    
    if (blurKeyboard) inputRef.current?.blur(); // Hide keyboard explicitly
    
    if (isOffline) return; // Prevent call if offline

    // Check Cache First
    const cachedData = getCachedData(q);
    if (cachedData) {
      setResults(cachedData);
      saveState({ query: q, results: cachedData });
      setLoading(false);
      return;
    }

    // Prevent duplicate parallel requests
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
      /* Silent drop to prevent Vercel logs spam */
    } finally {
      ongoingRequestRef.current = null;
      setLoading(false);
    }
  };

  // Auto-search after 3s typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    
    if (val.trim()) {
      searchTimerRef.current = setTimeout(() => performSearch(val, false), 3000);
    } else {
      setResults(null);
      sessionStorage.removeItem(STORAGE_STATE_KEY);
    }
  };

  // Instant Search on Submit/Enter
  const handleManualSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    performSearch(query, true); // True to blur keyboard
  };

  // --- TAB MANAGEMENT (Scroll Reset) ---
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Reset scroll strictly on tab change
  };

  // --- VOICE SEARCH ---
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

  // --- CLICK HANDLERS ---
  const handleItemClick = (item: any, type: string) => {
    saveState();
    if (type === 'song') {
      const song = { ...item, track_id: item.track_id, track_title: item.title, album_title: item.album, artwork_large: item.artworkUrl, artist:[{ name: item.artists }] };
      setPlayContext({ type: "Search", name: query });
      setQueue([song]); setCurrentSong(song); setIsPlaying(true);
    } else {
      router.push(`/${type}/${item.seokey}`);
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
    const displayData = isFullView ? data : data.slice(0, type === 'song' ? 4 : 6);

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between px-3 mb-2">
          <h2 className="text-[16px] font-black tracking-tight text-white/90">{title}</h2>
          {!isFullView && (
            <button onClick={() => handleTabChange(type + 's')} className="text-[10px] font-bold uppercase tracking-wider text-blue-400 p-1">More</button>
          )}
        </div>
        
        {type === 'song' ? (
           <div className="flex flex-col">
             {displayData.map((item: any, i: number) => <CompactRow key={i} item={item} onClick={handleItemClick} />)}
           </div>
        ) : (
           <div className={`px-3 ${isFullView ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-5' : 'flex gap-3 overflow-x-auto hide-scrollbar snap-x'}`}>
             {displayData.map((item: any, i: number) => (
               <div key={i} className={isFullView ? "" : "w-[28vw] sm:w-[120px] flex-shrink-0 snap-start"}>
                 <CompactGridCard item={item} type={type} onClick={handleItemClick} />
               </div>
             ))}
           </div>
        )}
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

      {/* COMPACT & HIGHLY TRANSPARENT HEADER */}
      <div className="sticky top-0 z-50 bg-[#0B1320]/60 backdrop-blur-2xl border-b border-white/5 pt-2 px-2 pb-2 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
           <button onClick={() => router.back()} className="p-1.5 text-blue-400 active:scale-90 transition-transform"><ChevronLeft size={26} /></button>
           
           <form onSubmit={handleManualSearch} className="relative flex-1">
             <input 
               ref={inputRef}
               type="search"
               enterKeyHint="search"
               placeholder="Songs, artists, albums..."
               className="w-full bg-[#131D30]/80 border border-white/10 rounded-xl py-2 pl-9 pr-10 text-[14px] focus:bg-[#131D30] focus:border-blue-500/50 outline-none transition-all"
               value={query}
               onChange={handleInputChange}
             />
             <SearchIcon onClick={handleManualSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/50 cursor-pointer" size={16} />
             
             <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
               {query && <X onClick={() => { setQuery(""); inputRef.current?.focus(); }} size={16} className="text-white/30 p-0.5 cursor-pointer" />}
               <button type="button" onClick={startVoiceSearch} className={`p-1.5 rounded-full transition-colors ${isListening ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
                 <Mic size={16} />
               </button>
             </div>
           </form>
        </div>

        {/* COMPACT TABS */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all flex-shrink-0 ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-[#131D30]/50 text-blue-200/40 border border-white/5"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="pb-32 pt-3">
        {isOffline ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <WifiOff size={48} className="mb-3 text-red-400" />
            <p className="text-sm font-bold text-red-200">No Internet Connection</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-4 px-3 mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg skeleton-wave flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 w-3/4 rounded skeleton-wave" />
                  <div className="h-2 w-1/2 rounded skeleton-wave" />
                </div>
              </div>
            ))}
          </div>
        ) : !results ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-10">
            <SearchIcon size={64} className="mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest">Discover Music</p>
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

      {/* VOICE LISTENING OVERLAY */}
      {isListening && (
        <div className="fixed inset-0 bg-[#0B1320]/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
           <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_40px_rgba(37,99,235,0.4)]">
             <Mic size={32} />
           </div>
           <h2 className="mt-6 text-xl font-black">Listening...</h2>
           <button onClick={() => setIsListening(false)} className="mt-8 px-6 py-2 bg-white/10 rounded-full text-sm font-bold active:scale-95">Cancel</button>
        </div>
      )}
    </main>
  );
}
