/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Play, ArrowLeft, Loader2, MoreVertical, Users, Disc3, ChevronRight, ChevronLeft } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// --- API SECRETS & CACHING ---
const CACHE_DURATION = 72 * 60 * 60 * 1000; // 72 Hours
const AUTOMATION_SECRET = "pR3nSUsTI9HQxb2RbdasB5mjKqUoSP8m";

// --- IRONCLAD GLOBAL FETCH LOCK (Guarantees exactly 1s gap AFTER response) ---
declare global {
  interface Window {
    __API_QUEUE_PROMISE__?: Promise<any>;
  }
}

const fetchStrictly = (url: string): Promise<any> => {
  // 1. Check cache first to avoid network calls
  try {
    const cachedStr = localStorage.getItem(`api_cache_${url}`);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (Date.now() - cached.timestamp < CACHE_DURATION) return Promise.resolve(cached.data);
    }
  } catch (e) {}

  if (typeof window === 'undefined') return Promise.resolve(null);

  // 2. Queue system ensures requests never run parallel, and 1-second rule is enforced
  if (!window.__API_QUEUE_PROMISE__) {
    window.__API_QUEUE_PROMISE__ = Promise.resolve();
  }

  const task = async () => {
    try {
      const res = await fetch(url, { headers: { "x-vercel-protection-bypass": AUTOMATION_SECRET } });
      let data = null;
      if (res.ok || res.status === 202 || res.status === 200) {
        data = await res.json();
        try { localStorage.setItem(`api_cache_${url}`, JSON.stringify({ timestamp: Date.now(), data })); } catch (e) {}
      }
      
      // STRICTLY WAIT 1 FULL SECOND AFTER RECEIVING THE RESPONSE
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
const decodeEntities = (text: string) => text ? String(text).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&hellip;/g, '...') : "";

const getImageUrl = (item: any) => {
  if (!item) return "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  let img = item.artwork_bio || item.artwork_large || item.artwork_web || item.atw || item.artwork || item.image || "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return img.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500").replace("50x50", "500x500");
};

const getSubtitle = (item: any) => {
  let names: string[] =[];
  if (item.entity_info) {
     const artistInfo = item.entity_info.find((info: any) => info.key === 'artist' || info.key === 'singers' || info.key === 'primaryartist');
     if (artistInfo && Array.isArray(artistInfo.value)) names = artistInfo.value.map((a: any) => a.name);
  }
  return Array.from(new Set(names)).join(", ");
};

const formatDuration = (seconds: any) => {
  if (!seconds) return "0:00";
  const num = parseInt(seconds);
  if (isNaN(num)) return seconds;
  const m = Math.floor(num / 60);
  const s = Math.floor(num % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatFollowers = (count: any) => {
  const num = parseInt(count);
  if (isNaN(num)) return count;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

// --- COMPONENTS ---
const LazyImage = ({ src, alt, className, objectFit = "object-cover" }: any) => {
  const [loaded, setLoaded] = useState(false);
  const placeholder = "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundImage: `url(${placeholder})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <img 
        src={src || placeholder} alt={alt} loading="lazy" decoding="async" 
        onLoad={(e) => { if (e.currentTarget.src !== placeholder) setLoaded(true); }} 
        className={`w-full h-full ${objectFit} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`} 
      />
    </div>
  );
};

const ScrollableTitle = ({ text, className }: { text: string, className?: string }) => {
  const decodedText = decodeEntities(text || '');
  const isLong = decodedText.length > 18;
  return (
    <div className={`w-full overflow-hidden whitespace-nowrap ${className || ''}`}>
      <div className={`inline-block w-max ${isLong ? 'animate-ping-pong' : ''}`} style={isLong ? { animationDuration: `${Math.max(4, decodedText.length * 0.15)}s` } : {}}>
         <span>{decodedText}</span>
      </div>
    </div>
  );
};

const PremiumCard = ({ item, onClick, showSubtitle }: any) => {
  const title = decodeEntities(item.track_title || item.name || item.title || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item));
  const isLongTitle = title.length > 13;

  return (
    <div onClick={() => onClick(item)} className="w-[32vw] sm:w-[160px] md:w-[190px] flex-shrink-0 snap-start cursor-pointer group pb-1">
      <div className="relative overflow-hidden bg-[#131D30] border border-[#1e293b] rounded-2xl mb-2 transition-transform duration-200 active:scale-95 shadow-md">
        <LazyImage src={getImageUrl(item)} alt={title} className="w-full aspect-[1/1] group-hover:scale-105 transition-transform duration-500 ease-out" />
      </div>
      <div className="w-full overflow-hidden whitespace-nowrap text-left px-1">
        <span className={`inline-block text-[13px] md:text-[15px] font-extrabold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`} style={isLongTitle ? { animationDuration: `${Math.max(4, title.length * 0.15)}s` } : {}}>{title}</span>
      </div>
      {showSubtitle && subtitle && (
        <div className="w-full overflow-hidden whitespace-nowrap text-left mt-0.5 px-1">
          <span className="inline-block text-[11px] md:text-[13px] font-medium text-blue-200/60 truncate w-full">{subtitle}</span>
        </div>
      )}
    </div>
  );
};

const SongItem = ({ song, index, fallbackArtistName, onPlay, currentSong }: any) => {
  const isPlaying = currentSong?.entity_id === song.entity_id;
  const durationInfo = song.entity_info?.find((i:any) => i.key === 'duration')?.value;
  const title = decodeEntities(song.track_title || song.name || "Unknown");
  const artists = song.entity_info?.find((i:any) => i.key === 'artist')?.value?.map((a:any) => a.name).join(', ') || fallbackArtistName;

  return (
    <div onClick={() => onPlay(song, index)} className="flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl hover:bg-[#131D30] border border-transparent hover:border-[#1e293b] active:scale-[0.98] cursor-pointer group transition-all duration-200 w-full">
      <span className={`text-sm font-medium w-6 text-center shrink-0 ${isPlaying ? 'text-[#1db954]' : 'text-blue-200/50 group-hover:text-white'}`}>
        {isPlaying ? <Play size={16} fill="currentColor" className="mx-auto" /> : index + 1}
      </span>
      <LazyImage src={getImageUrl(song)} alt="Cover" className="w-12 h-12 md:w-14 md:h-14 rounded-xl shadow-sm bg-[#131D30] shrink-0 pointer-events-none" />
      <div className="flex-1 overflow-hidden min-w-0">
        <div className={`text-sm md:text-base font-bold truncate ${isPlaying ? 'text-[#1db954]' : 'text-white'}`}>{title}</div>
        <div className="text-xs md:text-sm text-blue-200/50 mt-0.5 truncate">{artists}</div>
      </div>
      <div className="hidden md:block text-sm text-blue-200/40 w-12 text-right font-medium shrink-0">{formatDuration(durationInfo)}</div>
      <MoreVertical size={20} className="text-blue-200/50 hover:text-white shrink-0 ml-2" />
    </div>
  );
};

const SectionSkeleton = () => (
  <div className="w-full mb-10 px-4">
    <div className="flex items-center justify-between mb-4">
      <div className="h-[24px] rounded-md w-40 md:w-56 skeleton-wave"></div>
    </div>
    <div className="flex gap-4 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="w-[32vw] sm:w-[160px] md:w-[190px] flex-shrink-0">
          <div className="w-full aspect-[1/1] rounded-2xl mb-2 border border-[#1e293b] skeleton-wave"></div>
          <div className="h-3 rounded w-3/4 mt-2 skeleton-wave"></div>
          <div className="h-2 rounded w-1/2 mt-1.5 skeleton-wave"></div>
        </div>
      ))}
    </div>
  </div>
);

const HeroSkeleton = () => (
  <div className="relative w-full h-[400px] md:h-[500px] flex flex-col justify-end px-4 md:px-10 pb-10 border-b border-[#131D30] skeleton-wave">
    <div className="flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-8 max-w-7xl mx-auto w-full">
      <div className="w-36 h-36 md:w-56 md:h-56 rounded-full border-[4px] border-[#1e293b] shrink-0 shadow-2xl bg-[#0B1320]"></div>
      <div className="flex flex-col gap-3 w-full items-center md:items-start">
        <div className="h-10 md:h-16 bg-[#131D30] w-2/3 md:w-1/2 rounded-lg"></div>
        <div className="h-6 w-32 bg-[#131D30] rounded-full mt-2"></div>
      </div>
    </div>
  </div>
);

// --- MAIN PAGE LOGIC ---
function ArtistContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentSong, setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();

  // Extract seokey from params or path elegantly
  const pathSeokey = pathname.split('/').filter(Boolean).pop();
  const seokey = searchParams.get("id") || searchParams.get("seokey") || (pathSeokey !== 'artist' ? pathSeokey : null);

  const [artist, setArtist] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  
  const [artistLoading, setArtistLoading] = useState(true);
  const[contentLoading, setContentLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<'main' | 'songs' | 'albums' | 'playlists'>('main');
  const[showFullDesc, setShowFullDesc] = useState(false);

  useEffect(() => {
    if (!seokey) return;

    const loadData = async () => {
      setArtistLoading(true);
      setContentLoading(true);
      
      const artistData = await fetchStrictly(`https://gaanaayush.vercel.app/api/superserch/artist/detail?seokey=${seokey}&st=hls&pkc=true&request_type=app`);
      
      if (artistData?.data?.artist?.[0]) {
        const artistInfo = artistData.data.artist[0];
        setArtist(artistInfo);
        setArtistLoading(false); // Hero shows up immediately

        const artistId = artistInfo.artist_id;

        // Fire concurrent strictly queued fetches
        fetchStrictly(`https://gaanaayush.vercel.app/api/superserch/home/artist/tracks/${artistId}?limit=0,50`).then(res => {
          if (res?.data?.entities) setSongs(res.data.entities);
        });

        fetchStrictly(`https://gaanaayush.vercel.app/api/superserch/home/artist/album/${artistId}?limit=0,50`).then(res => {
          if (res?.data?.entities) setAlbums(res.data.entities);
        });

        fetchStrictly(`https://gaanaayush.vercel.app/api/superserch/home/artist/playlist/${artistId}?limit=0,50`).then(res => {
          if (res?.data?.entities) setPlaylists(res.data.entities);
          setContentLoading(false); // Remove remaining skeletons
        });
      } else {
        setArtistLoading(false);
        setContentLoading(false);
      }
    };

    loadData();
  }, [seokey]);

  const handlePlaySong = (song: any) => {
    setPlayContext({ type: "Artist", name: artist?.name || "Gaana Play" });
    setQueue(songs);
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const handleNavigate = (item: any) => {
    const type = item.entity_type || item.type;
    if (type === "AL" || type === "album") router.push(`/album/${item.seokey}`);
    else if (type === "PL" || type === "playlist") router.push(`/playlist/${item.seokey}`);
  };

  if (artistLoading) return (
    <div className="min-h-screen bg-[#0B1320] w-full overflow-hidden pb-28 text-white">
      <HeroSkeleton />
      <div className="mt-8"><SectionSkeleton /></div>
      <div className="mt-8"><SectionSkeleton /></div>
    </div>
  );

  if (!artist) return <div className="flex h-screen items-center justify-center bg-[#0B1320] text-blue-200/60 font-medium">Artist could not be found.</div>;

  // SUB VIEWS
  if (viewMode !== 'main') {
    const listData = viewMode === 'songs' ? songs : viewMode === 'albums' ? albums : playlists;
    const title = viewMode === 'songs' ? 'All Songs' : viewMode === 'albums' ? 'All Albums' : 'Artist Playlists';

    return (
      <div className="min-h-screen bg-[#0B1320] text-white pb-28 pt-2 animate-in fade-in">
        <div className="sticky top-0 bg-[#0B1320]/90 backdrop-blur-md z-40 px-4 py-3 md:py-4 mb-6 flex items-center gap-4 border-b border-[#131D30]">
          <button onClick={() => { setViewMode('main'); window.scrollTo(0,0); }} className="p-2 bg-[#131D30] border border-[#1e293b] rounded-full active:scale-95 text-white transition-all shrink-0">
            <ChevronLeft size={24} />
          </button>
          <div className="overflow-hidden min-w-0">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">{title}</h1>
            <p className="text-sm text-blue-200/60 font-medium truncate">{listData.length} Items</p>
          </div>
        </div>

        {viewMode === 'songs' ? (
          <div className="flex flex-col gap-1 px-4 max-w-7xl mx-auto w-full">
            {listData.map((song, idx) => (
              <SongItem key={idx} song={song} index={idx} fallbackArtistName={artist.name} onPlay={handlePlaySong} currentSong={currentSong} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-y-8 gap-x-3 px-4 w-full justify-items-center">
            {listData.map((item, i) => (
               <div key={i} className="w-full"><PremiumCard item={item} showSubtitle={true} onClick={handleNavigate} /></div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // MAIN VIEW
  return (
    <main className="min-h-screen bg-[#0B1320] text-white pb-28 selection:bg-[#1db954] selection:text-black">
      
      {/* Dynamic Cinematic Gradient Blur Background */}
      <div className="absolute top-0 left-0 right-0 h-[600px] z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-[-20%] bg-cover bg-center blur-[120px] saturate-[2.0] opacity-30"
          style={{ backgroundImage: `url(${getImageUrl(artist)})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B1320]/90 to-[#0B1320]" />
      </div>

      <div className="relative z-10 w-full overflow-hidden">
        
        {/* 1. Artist Hero Section */}
        <div className="relative w-full h-[380px] md:h-[480px] flex flex-col justify-end bg-transparent border-b border-white/5 pb-8">
          <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-30">
            <button onClick={() => router.back()} className="bg-[#131D30]/60 p-2.5 rounded-full backdrop-blur-xl text-white hover:bg-[#1e293b] border border-[#1e293b] shadow-sm active:scale-95 transition-all">
              <ArrowLeft size={24} />
            </button>
          </div>

          <div className="relative z-20 px-4 md:px-10 max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-8">
            <img 
              src={getImageUrl(artist)} draggable={false} alt="Artist"
              className="w-36 h-36 md:w-56 md:h-56 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.6)] object-cover border-[4px] border-[#1e293b] bg-[#131D30] shrink-0 pointer-events-none" 
            />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 w-full items-center md:items-start text-center md:text-left">
              <ScrollableTitle text={artist.name || 'Artist'} className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter drop-shadow-lg leading-none pb-1" />
              
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-4 text-xs md:text-sm text-blue-100 mt-3 font-semibold">
                {artist.favorite_count && artist.favorite_count !== "0" && (
                  <span className="flex items-center gap-1.5 bg-[#131D30]/80 px-3 py-1.5 rounded-full backdrop-blur-md border border-[#1e293b]">
                    <Users size={14} className="text-[#1db954]" /> {formatFollowers(artist.favorite_count)} Favorites
                  </span>
                )}
                {artist.songs && artist.songs !== "0" && (
                  <span className="flex items-center gap-1.5 bg-[#131D30]/80 px-3 py-1.5 rounded-full backdrop-blur-md border border-[#1e293b]">
                    <Disc3 size={14} className="text-[#1db954]" /> {artist.songs} Songs
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-10 mt-6 relative z-30">
          <div className="mb-10 flex justify-center md:justify-start gap-4 items-center">
            <button onClick={() => songs.length && handlePlaySong(songs[0])} className="bg-[#1db954] text-black p-4 md:p-5 rounded-full active:scale-95 transition-all duration-200 shadow-[0_5px_20px_rgba(29,185,84,0.4)] hover:scale-105 hover:bg-[#1ed760]">
              <Play fill="black" size={26} className="ml-1" />
            </button>
          </div>

          {contentLoading && <SectionSkeleton />}

          {/* 2. Top Songs (Top 10) */}
          {songs?.length > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-end px-1 mb-4">
                <h2 className="text-[22px] md:text-3xl font-black text-white tracking-tight">Popular Songs</h2>
                {songs.length > 5 && (
                  <button onClick={() => { setViewMode('songs'); window.scrollTo(0,0); }} className="text-[12px] md:text-sm font-bold text-[#1db954] bg-[#1db954]/10 px-3 py-1.5 rounded-full hover:bg-[#1db954]/20 active:scale-95 transition-all">
                    View All
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1 w-full bg-[#131D30]/40 p-2 border border-[#1e293b] rounded-2xl shadow-sm">
                {songs.slice(0, 10).map((song: any, index: number) => (
                  <SongItem key={`top-song-${index}`} song={song} index={index} fallbackArtistName={artist?.name} onPlay={handlePlaySong} currentSong={currentSong} />
                ))}
              </div>
            </section>
          )}

          {/* 3. Albums */}
          {albums?.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between px-1 mb-4">
                 <h2 className="text-[22px] md:text-3xl font-black text-white tracking-tight">Albums</h2>
                 {albums.length > 5 && (
                  <button onClick={() => { setViewMode('albums'); window.scrollTo(0,0); }} className="text-[12px] md:text-sm font-bold text-[#1db954] bg-[#1db954]/10 px-3 py-1.5 rounded-full hover:bg-[#1db954]/20 active:scale-95 transition-all">
                    View All
                  </button>
                )}
              </div>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar snap-x pb-2 pt-1 px-1">
                {albums.slice(0, 15).map((item: any, i: number) => (
                    <PremiumCard key={i} item={item} showSubtitle={true} onClick={handleNavigate} />
                ))}
              </div>
            </section>
          )}

          {/* 4. Playlists */}
          {playlists?.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between px-1 mb-4">
                 <h2 className="text-[22px] md:text-3xl font-black text-white tracking-tight">{artist.name} Playlists</h2>
                 {playlists.length > 5 && (
                  <button onClick={() => { setViewMode('playlists'); window.scrollTo(0,0); }} className="text-[12px] md:text-sm font-bold text-[#1db954] bg-[#1db954]/10 px-3 py-1.5 rounded-full hover:bg-[#1db954]/20 active:scale-95 transition-all">
                    View All
                  </button>
                )}
              </div>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar snap-x pb-2 pt-1 px-1">
                {playlists.slice(0, 15).map((item: any, i: number) => (
                    <PremiumCard key={i} item={item} showSubtitle={true} onClick={handleNavigate} />
                ))}
              </div>
            </section>
          )}

          {/* 5. Biography */}
          {artist.desc && (
            <section className="mb-12 px-1">
              <h2 className="text-[22px] md:text-3xl font-black text-white tracking-tight mb-6">About {artist.name}</h2>
              <div className="bg-[#131D30]/60 rounded-3xl p-6 md:p-8 backdrop-blur-md border border-[#1e293b] shadow-md">
                <div className={`relative overflow-hidden transition-all duration-500 ease-in-out ${showFullDesc ? 'max-h-[2000px]' : 'max-h-36'}`}>
                  <div className="text-blue-200/80 text-sm md:text-[15px] font-medium leading-relaxed prose prose-invert prose-p:mb-4" dangerouslySetInnerHTML={{ __html: decodeEntities(artist.desc) }} />
                  {!showFullDesc && <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#131D30] to-transparent pointer-events-none" />}
                </div>
                {decodeEntities(artist.desc).length > 200 && (
                  <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-[#1db954] text-sm font-bold mt-4 hover:underline active:scale-95 transition-all">
                    {showFullDesc ? "Show Less" : "Read More"}
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ArtistPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(calc(-100% + 140px)); } }
        .animate-ping-pong { animation-name: ping-pong; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        @keyframes wave { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .skeleton-wave { position: relative; overflow: hidden; background-color: #131D30; }
        .skeleton-wave::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent); animation: wave 1.5s infinite; }
      `}} />
      <div className="select-none [-webkit-touch-callout:none][-webkit-user-drag:none]" onContextMenu={(e) => e.preventDefault()}>
        <Suspense fallback={<div className="flex h-screen w-full bg-[#0B1320] items-center justify-center"><Loader2 className="animate-spin text-[#1db954]" size={40} /></div>}>
          <ArtistContent />
        </Suspense>
      </div>
    </>
  );
}
