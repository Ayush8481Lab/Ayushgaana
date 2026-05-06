/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, Suspense, useRef, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Play, ArrowLeft, Shuffle, Share2, Info, BadgeAlert, Heart } from "lucide-react";
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
  try {
    const cachedStr = localStorage.getItem(`api_cache_${url}`);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (Date.now() - cached.timestamp < CACHE_DURATION) return Promise.resolve(cached.data);
    }
  } catch (e) {}

  if (typeof window === 'undefined') return Promise.resolve(null);

  if (!window.__API_QUEUE_PROMISE__) window.__API_QUEUE_PROMISE__ = Promise.resolve();

  const task = async () => {
    try {
      const res = await fetch(url, { headers: { "x-vercel-protection-bypass": AUTOMATION_SECRET } });
      let data = null;
      if (res.ok || res.status === 202 || res.status === 200) {
        data = await res.json();
        try { localStorage.setItem(`api_cache_${url}`, JSON.stringify({ timestamp: Date.now(), data })); } catch (e) {}
      }
      await new Promise(r => setTimeout(r, 1000));
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
  return text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'");
};

const getImageUrl = (item: any) => {
  if (!item) return "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  if (typeof item === 'string') return item.replace(/size_[ms]/g, "size_l").replace(/150x150|50x50/g, "500x500").replace(/crop_80x80/g, "crop_480x480");
  let img = item.artworkUrl || item.artwork_large || item.artwork_web || item.atw || item.artwork || item.image || "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return img.replace(/size_[ms]/g, "size_l").replace(/150x150|50x50/g, "500x500").replace(/crop_80x80/g, "crop_480x480");
};

const getArtistImageUrl = (id: string | number) => {
  if (!id) return "https://a10.gaanacdn.com/gn_img/default/Artist/size_m.jpg";
  const strId = String(id);
  const last2 = strId.length > 1 ? strId.slice(-2) : "0" + strId;
  return `https://a10.gaanacdn.com/images/artists/${last2}/${strId}/crop_175x175_${strId}.jpg`;
};

const formatDuration = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
  },[text]);

  let textColor = "text-white group-hover:text-white";
  if (isPlaying && !isSub) textColor = "text-[#1db954]";
  else if (isSub) textColor = "text-blue-200/50 group-hover:text-blue-200/80";

  const textSize = isSub ? "text-[12px] md:text-[13px] font-medium" : "text-[15px] md:text-[16px] font-bold tracking-tight";

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
  <div className="flex items-end justify-center gap-[2px] w-6 h-5">
    <div className="w-[3px] bg-[#1db954] rounded-t-sm eq-bar-1"></div>
    <div className="w-[3px] bg-[#1db954] rounded-t-sm eq-bar-2"></div>
    <div className="w-[3px] bg-[#1db954] rounded-t-sm eq-bar-3"></div>
    <div className="w-[3px] bg-[#1db954] rounded-t-sm eq-bar-4"></div>
  </div>
);

const AlbumSkeleton = () => (
  <div className="min-h-screen bg-[#0B1320] p-6 md:p-8 pt-24 select-none">
    <style dangerouslySetInnerHTML={{__html:`
      @keyframes wave { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      .skeleton-wave { position: relative; overflow: hidden; background-color: #131D30; }
      .skeleton-wave::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent); animation: wave 1.5s infinite; }
    `}} />
    <div className="flex flex-col md:flex-row gap-6 items-center md:items-end mb-8">
      <div className="w-[224px] h-[224px] md:w-[336px] md:h-[336px] skeleton-wave rounded-2xl border border-[#1e293b] shadow-2xl" />
      <div className="flex flex-col gap-4 w-full max-w-xl items-center md:items-start">
        <div className="w-24 h-4 skeleton-wave rounded-md" />
        <div className="w-3/4 h-12 md:h-16 skeleton-wave rounded-xl" />
        <div className="w-1/2 h-4 skeleton-wave rounded-md" />
      </div>
    </div>
    <div className="flex flex-col gap-3 mt-10">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="w-full h-20 skeleton-wave rounded-xl border border-[#1e293b]" />
      ))}
    </div>
  </div>
);

function AlbumContent() {
  const pathname = usePathname();
  const router = useRouter();
  
  const { currentSong, setCurrentSong, setIsPlaying, setQueue, setPlayContext, likedPlaylists, toggleLikePlaylist } = useAppContext() as any;
  
  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const[headerOpacity, setHeaderOpacity] = useState(0);
  const [showStickyPlay, setShowStickyPlay] = useState(false);

  const seokey = useMemo(() => {
    const segments = pathname?.split('/').filter(Boolean) ||[];
    return segments[segments.length - 1] || "";
  }, [pathname]);

  const isAlbumLiked = album?.seokey ? likedPlaylists.some((p: any) => p?.seokey === album.seokey) : false;

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

  // Fetch Gaana Album API
  useEffect(() => {
    if (!seokey) return;

    const fetchAlbum = async () => {
      setLoading(true);
      const url = `https://gaanaayush.vercel.app/api/albums/${seokey}`;
      
      const json = await fetchStrictly(url);
      const aData = json?.data;
      
      if (aData && aData.tracks) {
        const tracks = aData.tracks ||[];
        
        // Process All Distinct Artists for Bottom Banner
        const artistFreq: Record<string, number> = {};
        const artistMap: Record<string, any> = {};
        
        tracks.forEach((t: any) => {
          if (t.artist_ids && typeof t.artist_ids === 'string') {
            const ids = t.artist_ids.split(',').map((s: string) => s.trim());
            const names = (t.artists || "").split(',').map((s: string) => s.trim());
            const seokeys = (t.artist_seokeys || "").split(',').map((s: string) => s.trim());
            
            ids.forEach((id: string, i: number) => {
              if(!id) return;
              artistFreq[id] = (artistFreq[id] || 0) + 1;
              if(!artistMap[id]) artistMap[id] = { id, name: names[i] || "Unknown", seokey: seokeys[i] || id };
            });
          }
        });

        // Fallback to album level artists if tracks didn't yield any
        if (Object.keys(artistMap).length === 0 && aData.artist_ids) {
            const ids = String(aData.artist_ids).split(',').map((s: string) => s.trim());
            const names = (aData.artists || "").split(',').map((s: string) => s.trim());
            const seokeys = (aData.artist_seokeys || "").split(',').map((s: string) => s.trim());
            ids.forEach((id: string, i: number) => {
              if(!id) return;
              artistFreq[id] = 1;
              if(!artistMap[id]) artistMap[id] = { id, name: names[i] || "Unknown", seokey: seokeys[i] || id };
            });
        }

        // Sort by frequency
        const allArtists = Object.values(artistMap).sort((a: any, b: any) => artistFreq[b.id] - artistFreq[a.id]);

        // Fix Image resolution to highest
        let bannerImage = aData.artworkUrl || (tracks[0] ? (tracks[0].artworkUrl || tracks[0].artwork) : "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg");
        bannerImage = bannerImage.replace(/crop_80x80/g, "crop_480x480").replace(/150x150|50x50/g, "500x500").replace(/size_[ms]/g, "size_l");

        // Total Duration manually parsed
        const totalSeconds = tracks.reduce((acc: number, t: any) => acc + (parseInt(t.duration) || 0), 0);
        let durationText = "";
        if (totalSeconds > 0) {
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          durationText = h > 0 ? `${h} hr ${m} min` : `${m} min`;
        }

        setAlbum({
          id: aData.album_id || seokey,
          seokey: aData.seokey || seokey,
          title: aData.title || seokey.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          songs: tracks.map((t: any) => ({ ...t, id: t.track_id, name: t.title, image: t.artworkUrl || t.artwork, artist_name: t.artists })),
          image: bannerImage,
          topArtistsDisplay: aData.artists || allArtists.slice(0, 3).map((a: any) => a.name).join(", "),
          allArtistsObj: allArtists, // Store all artists for the bottom section
          trackCount: tracks.length,
          totalDurationStr: durationText,
          label: aData.label,
          releaseDate: aData.release_date,
          type: "album"
        });
      }
      setLoading(false);
    };

    fetchAlbum();
  },[seokey]);

  const handlePlaySong = useCallback((song: any) => {
    if (album && album.songs) {
      setPlayContext({ type: "Album", name: album.title });
      setQueue(album.songs);
    }
    setCurrentSong(song);
    setIsPlaying(true);
  },[setCurrentSong, setIsPlaying, setQueue, setPlayContext, album]);

  const handlePlayAlbum = useCallback(() => {
    if (!album?.songs?.length) return;
    handlePlaySong(album.songs[0]);
  },[album?.songs, handlePlaySong]);

  const handleShuffle = useCallback(() => {
    if (!album?.songs?.length) return;
    const shuffled =[...album.songs].sort(() => Math.random() - 0.5);
    const firstSong = shuffled[0];
    const restOfQueue = shuffled.slice(1);
    
    setPlayContext({ type: "Album", name: album.title });
    setQueue(restOfQueue);
    setCurrentSong(firstSong);
    setIsPlaying(true);
  },[album, setQueue, setPlayContext, setCurrentSong, setIsPlaying]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: decodeEntities(album?.title),
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied!");
    }
  }, [album?.title]);

  const currentSongId = currentSong?.track_id || currentSong?.id;

  const renderedSongs = useMemo(() => {
    return album?.songs?.map((song: any, index: number) => {
      const songTitle = song.title || song.track_title || song.name || "Unknown Track";
      const artists = song.artists || song.artist_name || "Unknown Artist";
      const isCurrentPlaying = currentSongId === (song.track_id || song.id);

      return (
        <div 
          key={`${song.track_id || index}`} 
          onClick={() => handlePlaySong(song)} 
          className={`flex items-center justify-between gap-4 p-2.5 rounded-2xl cursor-pointer group transition-all duration-200 border border-transparent ${isCurrentPlaying ? "bg-[#131D30] border-[#1e293b]" : "hover:bg-[#131D30] hover:border-[#1e293b]"}`}
        >
          <div className="flex items-center gap-4 overflow-hidden flex-1 min-w-0">
            {/* Song banner size 1.5x */}
            <div className="relative w-[72px] h-[72px] md:w-[84px] md:h-[84px] flex-shrink-0 bg-[#0B1320] rounded-xl border border-[#1e293b] shadow-sm overflow-hidden pointer-events-none">
              <img src={getImageUrl(song)} alt="track" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" draggable={false} />
              {isCurrentPlaying && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                  <PlayingVisualizer />
                </div>
              )}
              {!isCurrentPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                  <Play fill="white" size={26} className="text-white ml-1 shadow-lg" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2">
                <PingPongMarquee text={songTitle} isPlaying={isCurrentPlaying} />
                {(song.parental_warning === 1 || song.explicitContent || song.is_explicit) && <BadgeAlert size={15} className="text-blue-200/40 flex-shrink-0" />}
              </div>
              <PingPongMarquee text={artists} isPlaying={isCurrentPlaying} isSub={true} />
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2 pr-2">
            <button className="text-blue-200/30 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-2 active:scale-90">
               <Heart size={22} />
            </button>
          </div>
        </div>
      );
    });
  },[album?.songs, currentSongId, handlePlaySong]);

  if (loading) return <AlbumSkeleton />;

  if (!album) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0B1320] text-white gap-4 select-none selection:bg-[#1db954] selection:text-black">
        <Info size={48} className="text-blue-200/30" />
        <p className="text-xl font-bold tracking-tight">Album not found</p>
        <button onClick={() => router.back()} className="px-8 py-3 bg-[#131D30] border border-[#1e293b] hover:bg-[#1a263d] text-white rounded-full font-bold active:scale-95 transition-all">Go Back</button>
      </div>
    );
  }

  return (
    <div className="pb-40 bg-[#0B1320] min-h-screen relative text-white selection:bg-[#1db954] selection:text-black font-sans" style={{ touchAction: 'pan-y' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(var(--overflow-dist)); } }
        .animate-ping-pong { animation: ping-pong 10s ease-in-out infinite alternate; }
        /* FIXED MASK IMAGE: Prevents left side text clipping! */
        .mask-linear-fade { mask-image: linear-gradient(to right, black 0%, black 95%, transparent 100%); -webkit-mask-image: linear-gradient(to right, black 0%, black 95%, transparent 100%); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes eq { 0%, 100% { height: 4px; } 50% { height: 20px; } }
        .eq-bar-1 { animation: eq 1s ease-in-out infinite 0s; }
        .eq-bar-2 { animation: eq 1s ease-in-out infinite 0.2s; }
        .eq-bar-3 { animation: eq 1s ease-in-out infinite 0.4s; }
        .eq-bar-4 { animation: eq 1s ease-in-out infinite 0.1s; }
      `}} />

      {/* Hero Background Effect */}
      <div className="absolute top-0 left-0 w-full h-[500px] md:h-[550px] pointer-events-none overflow-hidden z-0 select-none">
        <div className="absolute inset-0 bg-[#0B1320]" />
        <img src={album.image} alt="bg" className="absolute inset-0 w-full h-full object-cover blur-[60px] saturate-[180%] opacity-[0.65] transform-gpu" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#131D30]/20 via-[#0B1320]/70 to-[#0B1320]" />
      </div>

      {/* Sticky Header */}
      <nav 
        className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-3 transition-all duration-200 backdrop-blur-md"
        style={{ backgroundColor: `rgba(11, 19, 32, ${headerOpacity * 0.9})`, borderBottom: `1px solid rgba(30, 41, 59, ${headerOpacity})` }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button onClick={() => router.back()} className="p-2.5 rounded-full bg-[#131D30] border border-[#1e293b] hover:bg-[#1a263d] active:scale-95 transition-all text-white z-50 flex-shrink-0 shadow-lg">
            <ArrowLeft size={22} />
          </button>
          
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 flex-1 min-w-0 ${showStickyPlay ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
            <img src={album.image} alt="thumb" className="w-9 h-9 rounded-md object-cover shadow-md border border-[#1e293b] flex-shrink-0 pointer-events-none" draggable={false} />
            <span className="text-[16px] font-black tracking-tight truncate">{album.title}</span>
          </div>
        </div>
      </nav>

      {/* Album Hero Info - Banner size increased 1.4x */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 px-5 md:px-8 pt-24 md:pt-32 pb-6">
        <div className="w-[224px] h-[224px] sm:w-[268px] sm:h-[268px] md:w-[313px] md:h-[313px] lg:w-[336px] lg:h-[336px] flex-shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-[#131D30] border border-[#1e293b] rounded-3xl overflow-hidden pointer-events-none">
          <img src={album.image} alt="cover" className="w-full h-full object-cover" draggable={false} />
        </div>
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left mt-4 md:mt-0 w-full flex-1 min-w-0">
          <span className="text-xs sm:text-sm font-extrabold text-blue-400 mb-2 tracking-wider uppercase hidden md:block drop-shadow-md">
            Album
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[5.5rem] font-black tracking-tighter mb-4 line-clamp-3 leading-[1.05] drop-shadow-lg">
            {album.title}
          </h1>
          
          <div className="flex flex-col gap-2 items-center md:items-start text-[14px] sm:text-[15px] font-medium text-white/90">
            {album.topArtistsDisplay && (
               <span className="text-blue-200/80 font-bold tracking-wide line-clamp-2">{album.topArtistsDisplay}</span>
            )}
            <div className="flex items-center flex-wrap justify-center md:justify-start gap-1.5 text-blue-200/50">
              <span>{album.trackCount} tracks</span>
              {album.totalDurationStr && <span className="hidden sm:inline">•</span>}
              {album.totalDurationStr && <span>{album.totalDurationStr}</span>}
            </div>
            
            {/* Added Label & Release Date */}
            {(album.label || album.releaseDate) && (
              <div className="flex items-center flex-wrap justify-center md:justify-start gap-1.5 text-blue-200/40 text-[12px] md:text-[13px] uppercase tracking-wider mt-1">
                {album.label && <span>{album.label}</span>}
                {album.label && album.releaseDate && <span className="hidden sm:inline">•</span>}
                {album.releaseDate && <span>Released {formatDate(album.releaseDate)}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 px-5 md:px-8 py-4 flex items-center justify-between mb-4">
        <div className="flex items-center gap-5 md:gap-6">
          <button onClick={handlePlayAlbum} className="w-14 h-14 md:w-16 md:h-16 bg-[#1db954] hover:bg-[#1ed760] text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(29,185,84,0.3)] border border-transparent">
            <Play fill="black" size={28} className="ml-1" />
          </button>
          
          <button onClick={handleShuffle} className="text-blue-200/50 hover:text-white transition-colors active:scale-90" title="Shuffle">
            <Shuffle size={28} className="md:w-8 md:h-8" />
          </button>
          
          <button onClick={() => toggleLikePlaylist(album)} className={`transition-colors active:scale-90 ${isAlbumLiked ? "text-[#1db954]" : "text-blue-200/50 hover:text-white"}`}>
            <Heart size={30} fill={isAlbumLiked ? "#1db954" : "none"} strokeWidth={1.5} className="md:w-[34px] md:h-[34px]" />
          </button>
          
          <button onClick={handleShare} className="text-blue-200/50 hover:text-white transition-colors active:scale-90" title="Share">
             <Share2 size={26} className="md:w-7 md:h-7" />
          </button>
        </div>
      </div>

      {/* Song List */}
      <div className="relative z-10 px-2 md:px-6 flex flex-col gap-1 pb-4">
        {renderedSongs}
      </div>

      {/* All Artists Row */}
      {album.allArtistsObj && album.allArtistsObj.length > 0 && (
         <div className="relative z-10 px-4 md:px-8 pt-8 pb-10 mt-6 border-t border-[#1e293b]">
           <h2 className="text-[22px] md:text-2xl font-black mb-6 text-white tracking-tight px-1">Artists</h2>
           <div className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-4 snap-x">
             {album.allArtistsObj.map((artist: any) => (
               <div 
                 key={artist.id} 
                 onClick={() => router.push(`/artist/${artist.seokey}`)}
                 className="flex flex-col items-center gap-3 cursor-pointer group flex-shrink-0 snap-start w-28 md:w-36"
               >
                 <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden bg-[#131D30] border border-[#1e293b] group-hover:scale-105 group-hover:border-blue-400/50 transition-all duration-300 shadow-xl">
                    <img 
                       src={getArtistImageUrl(artist.id)} 
                       className="w-full h-full object-cover" 
                       onError={(e) => { e.currentTarget.src="https://a10.gaanacdn.com/gn_img/default/Artist/size_m.jpg" }} 
                       draggable={false}
                    />
                 </div>
                 <span className="text-[14px] md:text-[15px] font-bold text-blue-200/80 group-hover:text-white text-center line-clamp-2 w-full transition-colors">{artist.name}</span>
               </div>
             ))}
           </div>
         </div>
      )}

    </div>
  );
}

export default function AlbumPage() {
  return (
    <Suspense fallback={<AlbumSkeleton />}>
      <AlbumContent />
    </Suspense>
  );
}
