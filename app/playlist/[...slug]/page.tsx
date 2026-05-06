/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, Suspense, useRef, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Play, ArrowLeft, Shuffle, Share2, Info, BadgeAlert, Heart, Clock } from "lucide-react";
import { useAppContext } from "../../../context/AppContext";

// --- GLOBAL SECRETS & CONSTANTS ---
const AUTOMATION_SECRET = "pR3nSUsTI9HQxb2RbdasB5mjKqUoSP8m";
const CACHE_DURATION = 72 * 60 * 60 * 1000; // 72 hours in milliseconds

// --- GLOBAL QUEUE TO AVOID DUPLICATE / SPAM CALLS ---
declare global {
  interface Window {
    __API_QUEUE_PROMISE__?: Promise<any>;
  }
}

const fetchStrictly = (url: string): Promise<any> => {
  // 1. Check Long-Term Cache First (72 Hours)
  try {
    const cachedStr = localStorage.getItem(`api_cache_${url}`);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (Date.now() - cached.timestamp < CACHE_DURATION) return Promise.resolve(cached.data);
    }
  } catch (e) {}

  if (typeof window === 'undefined') return Promise.resolve(null);

  // 2. Enforce strict single-thread execution globally
  if (!window.__API_QUEUE_PROMISE__) window.__API_QUEUE_PROMISE__ = Promise.resolve();

  const task = async () => {
    try {
      const res = await fetch(url, {
        headers: { "x-vercel-protection-bypass": AUTOMATION_SECRET }
      });
      let data = null;
      if (res.ok || res.status === 202 || res.status === 200) {
        data = await res.json();
        // Save to 72-hour persistent cache
        try { localStorage.setItem(`api_cache_${url}`, JSON.stringify({ timestamp: Date.now(), data })); } catch (e) {}
      }
      
      await new Promise(r => setTimeout(r, 1000)); // Strict 1s cooldown
      return data;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000)); 
      return null;
    }
  };

  const newPromise = window.__API_QUEUE_PROMISE__.then(task);
  window.__API_QUEUE_PROMISE__ = newPromise.catch(() => {});
  return newPromise;
};

// --- UTILS ---
const decodeEntities = (text: string) => {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'");
};

const getImageUrl = (item: any) => {
  if (!item) return "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  if (typeof item === 'string') return item.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500").replace("50x50", "500x500");
  let img = item.artworkUrl || item.artwork_large || item.artwork_web || item.atw || item.artwork || item.image || "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return img.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500").replace("50x50", "500x500");
};

const formatDuration = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

// --- COMPONENTS ---
const PingPongMarquee = ({ text, isPlaying, isSub }: { text: string, isPlaying?: boolean, isSub?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const[overflowWidth, setOverflowWidth] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const cWidth = containerRef.current.offsetWidth;
        const tWidth = textRef.current.scrollWidth;
        setOverflowWidth(tWidth > cWidth ? tWidth - cWidth + 10 : 0);
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text]);

  let textColor = "text-white group-hover:text-white";
  if (isPlaying && !isSub) textColor = "text-[#1db954]";
  else if (isSub) textColor = "text-blue-200/50 group-hover:text-blue-200/80";

  const textSize = isSub ? "text-[12px] md:text-[13px] font-medium" : "text-[14px] md:text-[15px] font-bold tracking-tight";

  return (
    <div ref={containerRef} className="relative overflow-hidden whitespace-nowrap w-full mask-linear-fade">
      <div 
        ref={textRef}
        className={`inline-block ${overflowWidth > 0 ? "animate-ping-pong" : ""} ${textColor} ${textSize} transition-colors duration-200`}
        style={{ '--overflow-dist': `-${overflowWidth}px` } as React.CSSProperties}
      >
        {decodeEntities(text)}
      </div>
    </div>
  );
};

const PlayingVisualizer = () => (
  <div className="flex items-end justify-center gap-[2px] w-5 h-4">
    <div className="w-[3px] bg-[#1db954] rounded-t-sm eq-bar-1"></div>
    <div className="w-[3px] bg-[#1db954] rounded-t-sm eq-bar-2"></div>
    <div className="w-[3px] bg-[#1db954] rounded-t-sm eq-bar-3"></div>
    <div className="w-[3px] bg-[#1db954] rounded-t-sm eq-bar-4"></div>
  </div>
);

const PlaylistSkeleton = () => (
  <div className="min-h-screen bg-[#0B1320] p-6 md:p-8 pt-24 select-none">
    <style dangerouslySetInnerHTML={{__html:`
      @keyframes wave { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      .skeleton-wave { position: relative; overflow: hidden; background-color: #131D30; }
      .skeleton-wave::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent); animation: wave 1.5s infinite; }
    `}} />
    <div className="flex flex-col md:flex-row gap-6 items-center md:items-end mb-8">
      <div className="w-40 h-40 md:w-56 md:h-56 skeleton-wave rounded-2xl border border-[#1e293b] shadow-2xl" />
      <div className="flex flex-col gap-4 w-full max-w-xl items-center md:items-start">
        <div className="w-24 h-4 skeleton-wave rounded-md" />
        <div className="w-3/4 h-12 md:h-16 skeleton-wave rounded-xl" />
        <div className="w-1/2 h-4 skeleton-wave rounded-md" />
      </div>
    </div>
    <div className="flex flex-col gap-3 mt-10">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="w-full h-14 skeleton-wave rounded-xl border border-[#1e293b]" />
      ))}
    </div>
  </div>
);

function PlaylistContent() {
  const pathname = usePathname();
  const router = useRouter();
  
  const { currentSong, setCurrentSong, setIsPlaying, setQueue, setPlayContext, likedPlaylists, toggleLikePlaylist } = useAppContext() as any;
  
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const[headerOpacity, setHeaderOpacity] = useState(0);
  const [showStickyPlay, setShowStickyPlay] = useState(false);

  const seokey = useMemo(() => {
    const segments = pathname?.split('/').filter(Boolean) ||[];
    return segments[segments.length - 1] || "";
  }, [pathname]);

  const isPlaylistLiked = playlist?.seokey ? likedPlaylists.some((p: any) => p?.seokey === playlist.seokey) : false;

  // Header Scroll Effect
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          setHeaderOpacity(Math.min(scrollY / 250, 1));
          setShowStickyPlay(scrollY > 300);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  },[]);

  // Fetch New Gaana Playlist Format
  useEffect(() => {
    if (!seokey) return;

    const fetchPlaylist = async () => {
      setLoading(true);
      const url = `https://gaanaayush.vercel.app/api/playlists/${seokey}`;
      
      const json = await fetchStrictly(url);
      const pData = json?.data?.data?.playlist || json?.data?.playlist || json?.playlist;
      
      if (pData && pData.tracks) {
        const tracks = pData.tracks ||[];
        
        setPlaylist({
          id: pData.playlist_id || seokey,
          seokey: pData.seokey || seokey,
          title: pData.title || seokey.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          songs: tracks.map((t: any) => ({
             ...t,
             id: t.track_id, // Normalize to id
             name: t.title, // Normalize title
             image: t.artworkUrl || t.artwork,
             artist_name: t.artists
          })),
          image: pData.artworkUrl || (tracks[0] ? (tracks[0].artworkUrl || tracks[0].artwork) : "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg"),
          topArtists: pData.author || "Various Artists",
          count: pData.trackcount || tracks.length,
          favorite_count: pData.favorite_count || "0",
          type: "playlist"
        });
      }
      setLoading(false);
    };

    fetchPlaylist();
  },[seokey]);

  const handlePlaySong = useCallback((song: any) => {
    if (playlist && playlist.songs) {
      setPlayContext({ type: "Playlist", name: playlist.title });
      setQueue(playlist.songs);
    }
    setCurrentSong(song);
    setIsPlaying(true);
  },[setCurrentSong, setIsPlaying, setQueue, setPlayContext, playlist]);

  const handlePlayPlaylist = useCallback(() => {
    if (!playlist?.songs?.length) return;
    handlePlaySong(playlist.songs[0]);
  },[playlist?.songs, handlePlaySong]);

  const handleShuffle = useCallback(() => {
    if (!playlist?.songs?.length) return;
    const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
    setPlayContext({ type: "Playlist", name: playlist.title });
    setQueue(shuffled);
    setCurrentSong(shuffled[0]);
    setIsPlaying(true);
  },[playlist, setQueue, setPlayContext, setCurrentSong, setIsPlaying]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: decodeEntities(playlist?.title),
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied!");
    }
  }, [playlist?.title]);

  const currentSongId = currentSong?.track_id || currentSong?.id;

  const renderedSongs = useMemo(() => {
    return playlist?.songs?.map((song: any, index: number) => {
      const songTitle = song.title || song.track_title || song.name || "Unknown Track";
      const artists = song.artists || song.artist_name || "Unknown Artist";
      const albumName = song.album || "Unknown Album";
      const durationStr = formatDuration(parseInt(song.duration) || 0);
      const isCurrentPlaying = currentSongId === (song.track_id || song.id);

      return (
        <div 
          key={`${song.track_id || index}`} 
          onClick={() => handlePlaySong(song)} 
          className={`grid grid-cols-[36px_1fr_auto] md:grid-cols-[48px_1fr_1fr_80px] gap-2 md:gap-4 items-center p-2 rounded-xl cursor-pointer group transition-all duration-200 border border-transparent ${isCurrentPlaying ? "bg-[#131D30] border-[#1e293b]" : "hover:bg-[#131D30] hover:border-[#1e293b]"}`}
        >
          <div className="flex justify-center items-center h-full relative text-blue-200/40">
            {isCurrentPlaying ? (
              <PlayingVisualizer />
            ) : (
              <span className="text-[13px] md:text-[15px] font-semibold group-hover:opacity-0 transition-opacity">{index + 1}</span>
            )}
            <Play fill="white" size={16} className={`text-white absolute opacity-0 ${!isCurrentPlaying && 'group-hover:opacity-100'} transition-opacity`} />
          </div>
          
          <div className="flex items-center gap-3 overflow-hidden pr-2">
            <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0 bg-[#0B1320] rounded-lg border border-[#1e293b] shadow-sm overflow-hidden pointer-events-none">
              <img src={getImageUrl(song)} alt="track" className="w-full h-full object-cover" draggable={false} />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
              <div className="flex items-center gap-2">
                <PingPongMarquee text={songTitle} isPlaying={isCurrentPlaying} />
                {(song.parental_warning === 1 || song.explicitContent) && <BadgeAlert size={14} className="text-blue-200/40 flex-shrink-0" />}
              </div>
              <PingPongMarquee text={artists} isPlaying={isCurrentPlaying} isSub={true} />
            </div>
          </div>

          <div className="hidden md:flex items-center text-[13px] md:text-[14px] font-medium text-blue-200/50 group-hover:text-blue-200/80 transition-colors truncate pr-4">
            <span className="truncate w-full">{albumName}</span>
          </div>
          
          <div className="flex items-center justify-end gap-3 md:gap-6 pr-2 md:pr-4">
             <button className="text-blue-200/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
               <Heart size={18} />
             </button>
            <span className={`text-[12px] md:text-[13px] tabular-nums font-bold ${isCurrentPlaying ? "text-[#1db954]" : "text-blue-200/50 group-hover:text-white"}`}>
              {durationStr}
            </span>
          </div>
        </div>
      );
    });
  },[playlist?.songs, currentSongId, handlePlaySong]);

  if (loading) return <PlaylistSkeleton />;

  if (!playlist) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0B1320] text-white gap-4 select-none selection:bg-[#1db954] selection:text-black">
        <Info size={48} className="text-blue-200/30" />
        <p className="text-xl font-bold tracking-tight">Playlist not found</p>
        <button onClick={() => router.back()} className="px-8 py-3 bg-[#131D30] border border-[#1e293b] hover:bg-[#1a263d] text-white rounded-full font-bold active:scale-95 transition-all">Go Back</button>
      </div>
    );
  }

  const totalSeconds = playlist.songs?.reduce((acc: number, song: any) => acc + (parseInt(song.duration) || 0), 0);
  let totalDurationStr = "";
  if (totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    totalDurationStr = h > 0 ? `${h} hr ${m} min` : `${m} min`;
  }

  return (
    <div className="pb-40 bg-[#0B1320] min-h-screen relative text-white selection:bg-[#1db954] selection:text-black font-sans" style={{ touchAction: 'pan-y' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(var(--overflow-dist)); } }
        .animate-ping-pong { animation: ping-pong 10s ease-in-out infinite alternate; }
        .mask-linear-fade { mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent); }
        @keyframes eq { 0%, 100% { height: 4px; } 50% { height: 16px; } }
        .eq-bar-1 { animation: eq 1s ease-in-out infinite 0s; }
        .eq-bar-2 { animation: eq 1s ease-in-out infinite 0.2s; }
        .eq-bar-3 { animation: eq 1s ease-in-out infinite 0.4s; }
        .eq-bar-4 { animation: eq 1s ease-in-out infinite 0.1s; }
      `}} />

      {/* Hero Background Effect (Decreased Blur for more color pop) */}
      <div className="absolute top-0 left-0 w-full h-[450px] md:h-[500px] pointer-events-none overflow-hidden z-0 select-none">
        <div className="absolute inset-0 bg-[#0B1320]" />
        <img src={playlist.image} alt="bg" className="absolute inset-0 w-full h-full object-cover blur-[60px] saturate-[180%] opacity-[0.65] transform-gpu" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#131D30]/20 via-[#0B1320]/70 to-[#0B1320]" />
      </div>

      {/* Sticky Header */}
      <nav 
        className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-3 transition-all duration-200 backdrop-blur-md"
        style={{ 
          backgroundColor: `rgba(11, 19, 32, ${headerOpacity * 0.9})`, 
          borderBottom: `1px solid rgba(30, 41, 59, ${headerOpacity})` 
        }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button onClick={() => router.back()} className="p-2.5 rounded-full bg-[#131D30] border border-[#1e293b] hover:bg-[#1a263d] active:scale-95 transition-all text-white z-50 flex-shrink-0 shadow-lg">
            <ArrowLeft size={22} />
          </button>
          
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 flex-1 min-w-0 ${showStickyPlay ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
            <img src={playlist.image} alt="thumb" className="w-9 h-9 rounded-md object-cover shadow-md border border-[#1e293b] flex-shrink-0 pointer-events-none" draggable={false} />
            <span className="text-[16px] font-black tracking-tight truncate">{playlist.title}</span>
          </div>
        </div>
      </nav>

      {/* Playlist Hero Info */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 px-5 md:px-8 pt-24 md:pt-32 pb-6">
        <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-60 lg:h-60 flex-shrink-0 shadow-[0_15px_40px_rgba(0,0,0,0.6)] bg-[#131D30] border border-[#1e293b] rounded-2xl overflow-hidden pointer-events-none">
          <img src={playlist.image} alt="cover" className="w-full h-full object-cover" draggable={false} />
        </div>
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left mt-3 md:mt-0 w-full flex-1 min-w-0">
          <span className="text-xs sm:text-sm font-extrabold text-blue-400 mb-1.5 tracking-wider uppercase hidden md:block drop-shadow-md">
            Playlist
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[5.5rem] font-black tracking-tighter mb-4 line-clamp-3 leading-[1.05] drop-shadow-lg">
            {playlist.title}
          </h1>
          
          <div className="flex flex-col gap-1.5 items-center md:items-start text-[13px] sm:text-[14px] font-medium text-white/90">
            {playlist.topArtists && (
               <span className="text-blue-200/80 font-bold tracking-wide line-clamp-1">{playlist.topArtists}</span>
            )}
            <div className="flex items-center flex-wrap justify-center md:justify-start gap-1.5 text-blue-200/50">
              <span>{playlist.count} songs</span>
              {totalDurationStr && <span className="hidden sm:inline">•</span>}
              {totalDurationStr && <span>{totalDurationStr}</span>}
              {playlist.favorite_count && playlist.favorite_count !== "0" && (
                 <>
                   <span className="hidden sm:inline">•</span>
                   <span>{playlist.favorite_count} likes</span>
                 </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 px-5 md:px-8 py-4 flex items-center justify-between mb-2">
        <div className="flex items-center gap-5 md:gap-6">
          <button onClick={handlePlayPlaylist} className="w-14 h-14 md:w-16 md:h-16 bg-[#1db954] hover:bg-[#1ed760] text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(29,185,84,0.3)] border border-transparent">
            <Play fill="black" size={28} className="ml-1" />
          </button>
          
          <button onClick={handleShuffle} className="text-blue-200/50 hover:text-white transition-colors active:scale-90" title="Shuffle">
            <Shuffle size={28} className="md:w-8 md:h-8" />
          </button>
          
          <button onClick={() => toggleLikePlaylist(playlist)} className={`transition-colors active:scale-90 ${isPlaylistLiked ? "text-[#1db954]" : "text-blue-200/50 hover:text-white"}`}>
            <Heart size={30} fill={isPlaylistLiked ? "#1db954" : "none"} strokeWidth={1.5} className="md:w-[34px] md:h-[34px]" />
          </button>
          
          <button onClick={handleShare} className="text-blue-200/50 hover:text-white transition-colors active:scale-90" title="Share">
             <Share2 size={26} className="md:w-7 md:h-7" />
          </button>
        </div>
      </div>

      {/* Table Header (Desktop) - Added Album column! */}
      <div className="relative z-10 px-4 md:px-8 mt-2 hidden md:grid grid-cols-[48px_1fr_1fr_80px] gap-4 items-center text-[12px] md:text-[13px] font-bold uppercase tracking-widest text-blue-200/40 border-b border-[#1e293b] pb-3 mb-4 sticky top-[68px] bg-[#0B1320]/95 backdrop-blur-md">
        <div className="text-center">#</div>
        <div>Title</div>
        <div>Album</div>
        <div className="text-right pr-6"><Clock size={16} className="inline-block" /></div>
      </div>

      {/* Song List */}
      <div className="relative z-10 px-2 md:px-6 flex flex-col gap-0.5">
        {renderedSongs}
      </div>

    </div>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense fallback={<PlaylistSkeleton />}>
      <PlaylistContent />
    </Suspense>
  );
}
