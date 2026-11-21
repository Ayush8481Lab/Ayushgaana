/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, Suspense, useCallback, useMemo, memo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Play, ChevronLeft, Shuffle, Share2, Info, BadgeAlert, Heart, Sparkles, Disc3 } from "lucide-react";
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

  if (typeof window === "undefined") return Promise.resolve(null);

  if (!window.__API_QUEUE_PROMISE__) window.__API_QUEUE_PROMISE__ = Promise.resolve();

  const task = async () => {
    try {
      const res = await fetch(url, { headers: { "x-vercel-protection-bypass": AUTOMATION_SECRET } });
      let data = null;
      if (res.ok || res.status === 202 || res.status === 200) {
        data = await res.json();
        try {
          localStorage.setItem(`api_cache_${url}`, JSON.stringify({ timestamp: Date.now(), data }));
        } catch (e) {}
      }
      await new Promise((r) => setTimeout(r, 1000));
      return data;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1000));
      return null;
    }
  };

  const newPromise = window.__API_QUEUE_PROMISE__.then(task);
  window.__API_QUEUE_PROMISE__ = newPromise.catch(() => {});
  return newPromise;
};

// --- UTILS (Optimized for Low-RAM Texture Memory) ---
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

// High-res image strictly for the main hero banner
const getHeroImageUrl = (item: any) => {
  if (!item) return "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  if (typeof item === "string")
    return item
      .replace(/size_[ms]/g, "size_l")
      .replace(/150x150|50x50/g, "500x500")
      .replace(/crop_\d+x\d+/g, "crop_480x480");
  const img =
    item.artworkUrl ||
    item.artwork_large ||
    item.artwork_web ||
    item.atw ||
    item.artwork ||
    item.image ||
    "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return img
    .replace(/size_[ms]/g, "size_l")
    .replace(/150x150|50x50/g, "500x500")
    .replace(/crop_\d+x\d+/g, "crop_480x480");
};

// Low-RAM optimized thumbnail for song rows (cuts texture memory by 75%)
const getTrackThumbUrl = (item: any) => {
  if (!item) return "https://a10.gaanacdn.com/gn_img/default/Song/size_m.jpg";
  const img =
    item.artwork_web ||
    item.artwork ||
    item.image ||
    item.artwork_large ||
    "https://a10.gaanacdn.com/gn_img/default/Song/size_m.jpg";
  return img.replace(/size_[sl]/g, "size_m").replace(/500x500|50x50/g, "175x175");
};

const getArtistImageUrl = (id: string | number) => {
  if (!id) return "https://a10.gaanacdn.com/gn_img/default/Artist/size_m.jpg";
  const strId = String(id);
  const last2 = strId.length > 1 ? strId.slice(-2) : "0" + strId;
  return `https://a10.gaanacdn.com/images/artists/${last2}/${strId}/crop_175x175_${strId}.jpg`;
};

// --- DYNAMIC TIME COLOR ENGINE ---
const getTimeTheme = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      orb1: "rgba(245, 158, 11, 0.28)",
      orb2: "rgba(236, 72, 153, 0.25)",
      orb3: "rgba(139, 92, 246, 0.22)",
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      orb1: "rgba(6, 182, 212, 0.28)",
      orb2: "rgba(217, 70, 239, 0.24)",
      orb3: "rgba(59, 130, 246, 0.22)",
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      orb1: "rgba(236, 72, 153, 0.30)",
      orb2: "rgba(139, 92, 246, 0.28)",
      orb3: "rgba(6, 182, 212, 0.20)",
    };
  }
  return {
    orb1: "rgba(168, 85, 247, 0.30)",
    orb2: "rgba(14, 165, 233, 0.25)",
    orb3: "rgba(236, 72, 153, 0.22)",
  };
};

// --- HARDWARE-ACCELERATED SUPER-COLORFUL BLUR BACKGROUND ---
const ColorfulBlurBackground = memo(({ orb1, orb2, orb3 }: { orb1: string; orb2: string; orb3: string }) => (
  <div
    className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    style={{
      transform: "translate3d(0,0,0)",
      background: `
        radial-gradient(circle at 12% 12%, ${orb1} 0%, transparent 48%),
        radial-gradient(circle at 88% 18%, ${orb2} 0%, transparent 50%),
        radial-gradient(circle at 50% 55%, ${orb3} 0%, transparent 58%),
        radial-gradient(circle at 85% 88%, rgba(236, 72, 153, 0.22) 0%, transparent 50%),
        radial-gradient(circle at 15% 85%, rgba(6, 182, 212, 0.20) 0%, transparent 50%),
        linear-gradient(180deg, #070514 0%, #090D24 50%, #050714 100%)
      `,
    }}
  />
));
ColorfulBlurBackground.displayName = "ColorfulBlurBackground";

// --- ULTRA-LIGHTWEIGHT LAZY IMAGE ---
const LazyImage = memo(({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#1E1438] via-[#131C38] to-[#0B1024] ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          e.currentTarget.src = "https://a10.gaanacdn.com/gn_img/default/Song/size_m.jpg";
          setLoaded(true);
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
});
LazyImage.displayName = "LazyImage";

// --- PLAYING VISUALIZER (Neon Gradient Bars) ---
const PlayingVisualizer = memo(() => (
  <div className="flex items-end justify-center gap-[2.5px] w-6 h-5">
    <div className="w-[3px] bg-gradient-to-t from-fuchsia-500 to-cyan-400 rounded-t-sm eq-bar-1" />
    <div className="w-[3px] bg-gradient-to-t from-fuchsia-500 to-cyan-400 rounded-t-sm eq-bar-2" />
    <div className="w-[3px] bg-gradient-to-t from-fuchsia-500 to-cyan-400 rounded-t-sm eq-bar-3" />
    <div className="w-[3px] bg-gradient-to-t from-fuchsia-500 to-cyan-400 rounded-t-sm eq-bar-4" />
  </div>
));
PlayingVisualizer.displayName = "PlayingVisualizer";

// --- MEMOIZED SONG ROW (Zero Resize Listeners, GPU Contained) ---
const SongRow = memo(({ song, isCurrentPlaying, onPlay }: { song: any; isCurrentPlaying: boolean; onPlay: (s: any) => void }) => {
  const songTitle = useMemo(() => decodeEntities(song.title || song.track_title || song.name || "Unknown Track"), [song]);
  const artists = useMemo(() => decodeEntities(song.artists || song.artist_name || "Unknown Artist"), [song]);
  const thumbUrl = useMemo(() => getTrackThumbUrl(song), [song]);
  const isLongTitle = songTitle.length > 26;
  const isLongArtist = artists.length > 32;

  return (
    <div
      onClick={() => onPlay(song)}
      className={`song-row-contain flex items-center justify-between gap-3.5 p-2.5 rounded-2xl cursor-pointer group transition-transform duration-150 active:scale-[0.99] border ${
        isCurrentPlaying
          ? "bg-gradient-to-r from-fuchsia-500/20 via-purple-500/15 to-cyan-500/20 border-fuchsia-400/40"
          : "bg-[#120E2B]/55 hover:bg-[#19143A]/75 border-white/10"
      }`}
    >
      <div className="flex items-center gap-3.5 overflow-hidden flex-1 min-w-0">
        {/* Artwork Thumbnail */}
        <div className="relative w-[62px] h-[62px] md:w-[74px] md:h-[74px] flex-shrink-0 rounded-xl p-[1px] bg-gradient-to-br from-white/25 via-fuchsia-500/25 to-cyan-400/25 overflow-hidden pointer-events-none">
          <div className="relative w-full h-full rounded-[11px] overflow-hidden bg-[#12162E]">
            <LazyImage src={thumbUrl} alt={songTitle} className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
            {isCurrentPlaying && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <PlayingVisualizer />
              </div>
            )}
            {!isCurrentPlaying && (
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play fill="white" size={22} className="text-white ml-0.5" />
              </div>
            )}
          </div>
        </div>

        {/* Title & Artist Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
            <span
              className={`inline-block text-[14px] md:text-[16px] font-extrabold tracking-tight truncate max-w-full ${
                isCurrentPlaying
                  ? "bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent"
                  : "text-white/95"
              } ${
                isLongTitle
                  ? "group-hover:max-w-none group-active:max-w-none group-hover:animate-ping-pong group-active:animate-ping-pong"
                  : ""
              }`}
            >
              {songTitle}
            </span>
            {(song.parental_warning === 1 || song.explicitContent) && (
              <BadgeAlert size={14} className="text-fuchsia-300/60 flex-shrink-0" />
            )}
          </div>

          <div className="overflow-hidden whitespace-nowrap">
            <span
              className={`inline-block text-[12px] md:text-[13px] font-medium text-fuchsia-200/65 truncate max-w-full ${
                isLongArtist
                  ? "group-hover:max-w-none group-active:max-w-none group-hover:animate-ping-pong group-active:animate-ping-pong"
                  : ""
              }`}
            >
              {artists}
            </span>
          </div>
        </div>
      </div>

      {/* Right Heart Icon */}
      <div className="flex items-center justify-end pr-1.5">
        <button
          onClick={(e) => e.stopPropagation()}
          className="text-fuchsia-200/40 hover:text-pink-400 transition-colors p-2 active:scale-90"
          aria-label="Favorite track"
        >
          <Heart size={19} />
        </button>
      </div>
    </div>
  );
});
SongRow.displayName = "SongRow";

// --- GLOBAL STYLES ---
const GLOBAL_STYLES = `
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .gpu-scroll { -webkit-overflow-scrolling: touch; transform: translateZ(0); }
  .song-row-contain { content-visibility: auto; contain-intrinsic-size: 0 80px; }
  @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(calc(-100% + 180px)); } }
  .animate-ping-pong { animation: ping-pong 5s ease-in-out infinite alternate; }
  @keyframes eq { 0%, 100% { height: 4px; } 50% { height: 18px; } }
  .eq-bar-1 { animation: eq 0.9s ease-in-out infinite 0s; }
  .eq-bar-2 { animation: eq 0.9s ease-in-out infinite 0.2s; }
  .eq-bar-3 { animation: eq 0.9s ease-in-out infinite 0.4s; }
  .eq-bar-4 { animation: eq 0.9s ease-in-out infinite 0.1s; }
  @keyframes pulse-colorful { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.9; } }
  .skeleton-colorful {
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.14), rgba(139, 92, 246, 0.14), rgba(6, 182, 212, 0.14));
    animation: pulse-colorful 1.5s ease-in-out infinite;
  }
`;

// --- COLORFUL SKELETON LOADER (With Exact 30px Top Space) ---
const PlaylistSkeleton = () => {
  const theme = getTimeTheme();
  return (
    <div className="relative min-h-screen bg-[#070514] px-4 md:px-8 pt-[30px] pb-28 select-none overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />
      <ColorfulBlurBackground orb1={theme.orb1} orb2={theme.orb2} orb3={theme.orb3} />

      {/* Top Header Skeleton */}
      <div className="relative z-10 flex items-center justify-between pt-1 pb-6">
        <div className="w-11 h-11 rounded-2xl skeleton-colorful" />
        <div className="w-24 h-7 rounded-full skeleton-colorful" />
      </div>

      {/* Hero Skeleton */}
      <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center md:items-end mb-8">
        <div className="w-[220px] h-[220px] md:w-[300px] md:h-[300px] skeleton-colorful rounded-3xl border border-white/15" />
        <div className="flex flex-col gap-3.5 w-full max-w-xl items-center md:items-start">
          <div className="w-28 h-5 skeleton-colorful rounded-full" />
          <div className="w-3/4 h-10 md:h-14 skeleton-colorful rounded-2xl" />
          <div className="w-1/2 h-4 skeleton-colorful rounded-md" />
        </div>
      </div>

      {/* Song Rows Skeleton */}
      <div className="relative z-10 flex flex-col gap-2.5 mt-8">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="w-full h-[78px] skeleton-colorful rounded-2xl border border-white/10" />
        ))}
      </div>
    </div>
  );
};

function PlaylistContent() {
  const pathname = usePathname();
  const router = useRouter();

  const {
    currentSong,
    setCurrentSong,
    setIsPlaying,
    setQueue,
    setPlayContext,
    likedPlaylists,
    toggleLikePlaylist,
  } = useAppContext() as any;

  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme] = useState(getTimeTheme);

  const seokey = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) || [];
    return segments[segments.length - 1] || "";
  }, [pathname]);

  const isPlaylistLiked = useMemo(
    () => (playlist?.seokey ? likedPlaylists?.some((p: any) => p?.seokey === playlist.seokey) : false),
    [playlist?.seokey, likedPlaylists]
  );

  useEffect(() => {
    if (!seokey) return;

    const fetchPlaylist = async () => {
      setLoading(true);
      const url = `https://ayushgaana.vercel.app/api/Playlist?seo=${seokey}`;

      const json = await fetchStrictly(url);
      const tracks = json?.tracks || json?.data?.tracks || [];
      const pData = json?.playlist || json?.data?.playlist || json?.data?.data?.playlist;

      if (pData && tracks.length > 0) {
        const artistFreq: Record<string, number> = {};
        const artistMap: Record<string, any> = {};

        tracks.forEach((t: any) => {
          if (t.artist && Array.isArray(t.artist)) {
            t.artist.forEach((a: any) => {
              const id = a.artist_id || a.id;
              if (!id) return;
              artistFreq[id] = (artistFreq[id] || 0) + 1;
              if (!artistMap[id]) artistMap[id] = { id, name: a.name, seokey: a.seokey };
            });
          }
        });

        const sortedArtists = Object.values(artistMap).sort((a: any, b: any) => artistFreq[b.id] - artistFreq[a.id]);

        const rawBanner =
          pData.artwork_175 ||
          pData.artwork_110 ||
          pData.artwork ||
          tracks[0]?.artwork_large ||
          "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
        const bannerImage = getHeroImageUrl(rawBanner);

        const totalSeconds = tracks.reduce((acc: number, t: any) => acc + (parseInt(t.duration, 10) || 0), 0);
        let durationText = "";
        if (totalSeconds > 0) {
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          durationText = h > 0 ? `${h} hr ${m} min` : `${m} min`;
        }

        const songs = tracks.map((t: any) => {
          const artistName =
            t.artists || (t.artist && Array.isArray(t.artist) ? t.artist.map((a: any) => a.name).join(", ") : "");
          const streamBaseUrl = t.urls?.high?.url || t.urls?.medium?.url || t.urls?.auto?.url || null;
          const prefetchedQuality = t.urls?.high ? "128" : t.urls?.medium ? "64" : null;

          return {
            ...t,
            id: t.track_id,
            name: t.track_title,
            image: t.artwork_large || t.artwork,
            artist_name: artistName,
            artists: artistName,
            prefetchedStreamBaseUrl: streamBaseUrl,
            prefetchedQuality: prefetchedQuality,
          };
        });

        setPlaylist({
          id: pData.playlist_id || seokey,
          seokey: pData.seokey || seokey,
          title: decodeEntities(pData.title || seokey.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())),
          songs: songs,
          image: bannerImage,
          top3Artists: decodeEntities(sortedArtists.slice(0, 3).map((a: any) => a.name).join(", ")),
          top5ArtistsObj: sortedArtists.slice(0, 5),
          trackCount: tracks.length,
          totalDurationStr: durationText,
          type: "playlist",
        });
      }
      setLoading(false);
    };

    fetchPlaylist();
  }, [seokey]);

  const handlePlaySong = useCallback(
    (song: any) => {
      if (playlist && playlist.songs) {
        setPlayContext({ type: "Playlist", name: playlist.title });
        setQueue(playlist.songs);
      }
      setCurrentSong(song);
      setIsPlaying(true);
    },
    [setCurrentSong, setIsPlaying, setQueue, setPlayContext, playlist]
  );

  const handlePlayPlaylist = useCallback(() => {
    if (!playlist?.songs?.length) return;
    handlePlaySong(playlist.songs[0]);
  }, [playlist?.songs, handlePlaySong]);

  const handleShuffle = useCallback(() => {
    if (!playlist?.songs?.length) return;
    const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
    const firstSong = shuffled[0];
    const restOfQueue = shuffled.slice(1);

    setPlayContext({ type: "Playlist", name: playlist.title });
    setQueue(restOfQueue);
    setCurrentSong(firstSong);
    setIsPlaying(true);
  }, [playlist, setQueue, setPlayContext, setCurrentSong, setIsPlaying]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: decodeEntities(playlist?.title),
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied!");
    }
  }, [playlist?.title]);

  const currentSongId = currentSong?.track_id || currentSong?.id;

  if (loading) return <PlaylistSkeleton />;

  if (!playlist) {
    return (
      <div className="relative flex flex-col h-screen items-center justify-center bg-[#070514] text-white gap-4 select-none">
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />
        <ColorfulBlurBackground orb1={theme.orb1} orb2={theme.orb2} orb3={theme.orb3} />
        <Info size={48} className="text-fuchsia-300/40 relative z-10" />
        <p className="text-xl font-black tracking-tight relative z-10">Playlist not found</p>
        <button
          onClick={() => router.back()}
          className="relative z-10 px-8 py-3 bg-gradient-to-r from-fuchsia-500/25 to-cyan-500/25 border border-white/20 text-white rounded-full font-extrabold active:scale-95 transition-transform"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <main
      className="relative pt-[30px] pb-40 bg-[#070514] min-h-screen text-white selection:bg-fuchsia-500 selection:text-white overflow-x-hidden font-sans"
      style={{ touchAction: "pan-y" }}
    >
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />

      {/* Super-Colorful Blur Ambient Mesh (Zero Scroll Lag) */}
      <ColorfulBlurBackground orb1={theme.orb1} orb2={theme.orb2} orb3={theme.orb3} />

      {/* Clean Seamless Top Header (Exact 30px Top Cut, No Black Overlay Bar) */}
      <div className="relative z-20 px-4 md:px-8 pt-1 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-2xl bg-gradient-to-br from-fuchsia-500/30 via-purple-500/25 to-cyan-500/30 border border-white/25 text-white active:scale-90 transition-transform flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-400/30">
              <Sparkles size={11} className="text-fuchsia-300 flex-shrink-0" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-fuchsia-200">
                Featured Playlist
              </span>
            </div>
          </div>
        </div>

        {/* Live Track Count Pill */}
        <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-500/25 to-cyan-500/25 border border-white/20 text-[11px] font-extrabold text-cyan-100 flex-shrink-0">
          {playlist.trackCount} Tracks
        </div>
      </div>

      {/* Playlist Hero Info */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 px-5 md:px-8 pt-2 pb-6">
        {/* Neon Bordered Cover Art */}
        <div className="w-[216px] h-[216px] sm:w-[256px] sm:h-[256px] md:w-[300px] md:h-[300px] flex-shrink-0 p-[2px] rounded-3xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-cyan-400 shadow-2xl pointer-events-none">
          <div className="w-full h-full rounded-[22px] overflow-hidden bg-[#12162E]">
            <LazyImage src={playlist.image} alt={playlist.title} className="w-full h-full" />
          </div>
        </div>

        <div className="flex flex-col items-center md:items-start text-center md:text-left mt-2 md:mt-0 w-full flex-1 min-w-0">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-3 line-clamp-3 leading-tight bg-gradient-to-r from-white via-fuchsia-100 to-cyan-200 bg-clip-text text-transparent drop-shadow-sm">
            {playlist.title}
          </h1>

          <div className="flex flex-col gap-1.5 items-center md:items-start text-[13px] sm:text-[14px] font-medium">
            {playlist.top3Artists && (
              <span className="text-fuchsia-200/85 font-bold tracking-wide line-clamp-2">
                {playlist.top3Artists}
              </span>
            )}
            <div className="flex items-center flex-wrap justify-center md:justify-start gap-2 text-cyan-200/65 text-xs font-bold uppercase tracking-wider mt-0.5">
              <span className="inline-flex items-center gap-1">
                <Disc3 size={13} className="text-fuchsia-400" />
                {playlist.trackCount} Songs
              </span>
              {playlist.totalDurationStr && <span>•</span>}
              {playlist.totalDurationStr && <span>{playlist.totalDurationStr}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Colorful Premium Action Bar */}
      <div className="relative z-10 px-5 md:px-8 py-3 flex items-center justify-center md:justify-start mb-4">
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Primary Neon Play Button */}
          <button
            onClick={handlePlayPlaylist}
            className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-cyan-400 text-white rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-lg border border-white/25"
            aria-label="Play Playlist"
          >
            <Play fill="white" size={26} className="ml-1" />
          </button>

          {/* Glass Shuffle Button */}
          <button
            onClick={handleShuffle}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-fuchsia-200 hover:text-white transition-transform active:scale-90"
            title="Shuffle Play"
          >
            <Shuffle size={22} />
          </button>

          {/* Glass Like Playlist Button */}
          <button
            onClick={() => toggleLikePlaylist(playlist)}
            className={`p-3.5 rounded-2xl border transition-transform active:scale-90 ${
              isPlaylistLiked
                ? "bg-pink-500/20 border-pink-400/40 text-pink-400"
                : "bg-white/5 hover:bg-white/10 border-white/15 text-fuchsia-200 hover:text-white"
            }`}
            title="Like Playlist"
          >
            <Heart size={22} fill={isPlaylistLiked ? "currentColor" : "none"} />
          </button>

          {/* Glass Share Button */}
          <button
            onClick={handleShare}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-cyan-200 hover:text-white transition-transform active:scale-90"
            title="Share Playlist"
          >
            <Share2 size={22} />
          </button>
        </div>
      </div>

      {/* Optimized Song List */}
      <div className="relative z-10 px-3 md:px-8 flex flex-col gap-2 pb-4">
        {playlist.songs.map((song: any, index: number) => (
          <SongRow
            key={song.track_id || song.id || index}
            song={song}
            isCurrentPlaying={currentSongId === (song.track_id || song.id)}
            onPlay={handlePlaySong}
          />
        ))}
      </div>

      {/* Top Artists Row */}
      {playlist.top5ArtistsObj && playlist.top5ArtistsObj.length > 0 && (
        <div className="relative z-10 px-4 md:px-8 pt-8 pb-10 mt-6 border-t border-white/10">
          <div className="flex items-center gap-2.5 mb-5 px-1">
            <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-fuchsia-400 to-cyan-400" />
            <h2 className="text-[20px] md:text-2xl font-black text-white tracking-tight">Featured Artists</h2>
          </div>

          <div className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-4 snap-x gpu-scroll">
            {playlist.top5ArtistsObj.map((artist: any) => (
              <div
                key={artist.id}
                onClick={() => router.push(`/artist/${artist.seokey}`)}
                className="flex flex-col items-center gap-2.5 cursor-pointer group flex-shrink-0 snap-start w-28 md:w-36 select-none"
              >
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full p-[1.5px] bg-gradient-to-tr from-fuchsia-500/60 via-purple-500/40 to-cyan-400/60 group-active:scale-95 transition-transform duration-200">
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#12162E]">
                    <img
                      src={getArtistImageUrl(artist.id)}
                      alt={artist.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = "https://a10.gaanacdn.com/gn_img/default/Artist/size_m.jpg";
                      }}
                      draggable={false}
                    />
                  </div>
                </div>
                <span className="text-[13px] md:text-[15px] font-extrabold text-fuchsia-100/85 group-hover:text-white text-center line-clamp-2 w-full transition-colors">
                  {decodeEntities(artist.name)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense fallback={<PlaylistSkeleton />}>
      <PlaylistContent />
    </Suspense>
  );
        }
