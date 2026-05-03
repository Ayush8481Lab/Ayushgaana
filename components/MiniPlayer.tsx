/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAppContext } from "../context/AppContext";
import { 
  Play, Pause, SkipForward, SkipBack, Loader2, ChevronDown, 
  MoreHorizontal, Shuffle, Repeat, Heart, ListMusic, 
  MonitorPlay, Maximize2, Menu, Timer, Disc3, Calendar, Clock, Hash, Globe, Settings2, Check, Share2, Download, Video, X, Server, Sparkles
} from "lucide-react";

// (Keep existing cache/IDB functions & NativeID3 as before)
const getCache = async (key: string): Promise<any> => null; // Placeholder for brevity, use your existing DB methods.
const setCache = async (key: string, data: any, isAudio = false): Promise<void> => {};
const RAPID_KEYS =["d1edce158amshec139440d20658ap1f2545jsnbb7da9add82f"];
const RAPID_API_HOST = "spotify81.p.rapidapi.com";

const getImageUrl = (img: any) => {
  if (!img) return "https://via.placeholder.com/500x500?text=Music";
  if (typeof img === "string") return img.replace("150x150", "500x500").replace("50x50", "500x500");
  return img;
};

const decodeEntities = (text: string) => text ? text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&") : "";
const formatTime = (time: number) => { const m = Math.floor(time / 60); const s = Math.floor(time % 60); return `${m}:${s < 10 ? "0" : ""}${s}`; };

const parseLrc = (lrcString: string) => {
  const lines = lrcString.split('\n');
  const result: any[] =[];
  lines.forEach(line => {
      const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
      if (match) {
          const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
          const words = match[3].trim();
          if (words) result.push({ time, words });
      }
  });
  return result;
};

const MarqueeText = React.memo(({ text, className = "" }: { text: string, className?: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    useEffect(() => {
      if (containerRef.current && textRef.current) setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 5); 
    }, [text]);
    return (
      <div ref={containerRef} className={`overflow-hidden whitespace-nowrap w-full flex items-center ${isOverflowing ? "mask-edges" : ""} ${className}`}>
        <div className={`inline-block whitespace-nowrap ${isOverflowing ? "animate-spotify-marquee" : ""}`} style={{ minWidth: "100%" }}>
          <span ref={textRef} className={`inline-block whitespace-nowrap ${isOverflowing ? "pr-12" : ""}`}>{text}</span>
          {isOverflowing && <span className="inline-block whitespace-nowrap pr-12">{text}</span>}
        </div>
      </div>
    );
});
MarqueeText.displayName = 'MarqueeText';

export default function MiniPlayer() {
  const { currentSong, isPlaying, setIsPlaying, setCurrentSong, queue, upcomingQueue, setUpcomingQueue, historyQueue, setHistoryQueue, playContext, likedSongs, toggleLikeSong } = useAppContext();
  
  const[audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const[progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const[isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [dominantColor, setDominantColor] = useState("#0B1320"); // Default Navy Blue

  const[spotifyId, setSpotifyId] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<any[]>([]);
  const [syncType, setSyncType] = useState<string | null>(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [canvasData, setCanvasData] = useState<any>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const[selectedQuality, setSelectedQuality] = useState("320");
  const isSongLiked = likedSongs.some((s: any) => s && (s.id || s.track_id) === (currentSong?.id || currentSong?.track_id));

  const displayTitle = currentSong ? decodeEntities(currentSong.track_title || currentSong.name || currentSong.title) : "";
  const displayArtists = currentSong ? decodeEntities(currentSong.artists || currentSong.singers?.[0]?.name || "Unknown") : "";
  const displayImage = currentSong ? getImageUrl(currentSong.artwork_large || currentSong.artwork_web || currentSong.artwork || currentSong.image) : "";

  // MAIN TRACK CHANGE HOOK
  useEffect(() => {
    if (!currentSong) return;
    const trackId = currentSong.track_id || currentSong.entity_id || currentSong.id;
    setLoading(true);
    setLyrics([]); setCanvasData(null); setSpotifyId(null); setSyncType(null);

    // 1. Fetch Audio Stream from Gaana
    const fetchStream = async () => {
      try {
        const qualityMap: any = { "12": "16", "48": "64", "96": "64", "160": "128", "320": "320" };
        const gaanaQ = qualityMap[selectedQuality] || "320";
        
        const res = await fetch(`https://gaanaayush.vercel.app/api/stream/${trackId}`);
        const json = await res.json();
        
        if (json.data?.hlsUrl) {
            // Translate HLS master string to raw MP4 for native HTML5 audio execution
            const mp4Url = json.data.hlsUrl.replace(/(\d+)\.mp4\.master\.m3u8/, `${gaanaQ}.mp4`);
            setAudioUrl(mp4Url);
        } else if (json.data?.url) {
            setAudioUrl(json.data.url);
        }
      } catch (e) {}
      setLoading(false);
    };

    // 2. Fetch Native Gaana LRC Lyrics
    const fetchLyrics = async () => {
      try {
        const res = await fetch(`https://gaanaayush.vercel.app/api/lrc?id=${trackId}`);
        const json = await res.json();
        if (json.data?.lyrics) {
            setLyrics(parseLrc(json.data.lyrics));
            setSyncType("LINE_SYNCED");
        } else {
            // Fallback to Spotify Match for Canvas and Visuals
            triggerSpotifyFallback();
        }
      } catch (e) { triggerSpotifyFallback(); }
    };

    // Fallback RapidAPI Spotify Matcher
    const triggerSpotifyFallback = async () => {
       const query = `${displayTitle} ${displayArtists.split(',')[0]}`.trim();
       try {
         const searchUrl = `https://${RAPID_API_HOST}/search?q=${encodeURIComponent(query)}&type=tracks&limit=1`;
         const response = await fetch(searchUrl, { headers: { 'x-rapidapi-key': RAPID_KEYS[0], 'x-rapidapi-host': RAPID_API_HOST } });
         if (response.ok) { 
            const data = await response.json(); 
            const matchId = data.tracks?.[0]?.data?.id;
            if (matchId) setSpotifyId(matchId);
         }
       } catch (e) {}
    };

    fetchStream();
    fetchLyrics();
  }, [currentSong, selectedQuality]);

  // Fetch Canvas if Spotify Match succeeds
  useEffect(() => {
    if (!spotifyId) return;
    const fetchCanvas = async () => {
      try {
        const res = await fetch(`https://ayush-gamma-coral.vercel.app/api/canvas?trackId=${spotifyId}`);
        if (res.ok) {
           const json = await res.json();
           if (json?.canvasesList?.length > 0) setCanvasData(json.canvasesList[0]);
        }
      } catch (e) {}
    };
    fetchCanvas();
  }, [spotifyId]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const c = audioRef.current.currentTime; const d = audioRef.current.duration;
      setCurrentTime(c); setDuration(d || 0);
      if (d > 0) setProgress((c / d) * 100);

      if (syncType === "LINE_SYNCED" && lyrics.length > 0) {
        let activeIdx = -1;
        const offsetTime = c + 0.4; 
        for (let i = 0; i < lyrics.length; i++) { if (lyrics[i].time <= offsetTime) activeIdx = i; else break; }
        if (activeIdx !== activeLyricIndex) setActiveLyricIndex(activeIdx);
      }
    }
  };

  const playNext = () => {
    if (upcomingQueue.length > 0) {
      setCurrentSong(upcomingQueue[0]); setUpcomingQueue(prev => prev.slice(1)); setIsPlaying(true);
    } else { setIsPlaying(false); setProgress(0); }
  };

  const playPrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    if (historyQueue.length > 0) {
      setCurrentSong(historyQueue[0]); setHistoryQueue(prev => prev.slice(1)); setUpcomingQueue(prev => [currentSong, ...prev]); setIsPlaying(true);
    }
  };

  if (!currentSong) return null;

  return (
    <>
      <audio ref={audioRef} src={audioUrl} autoPlay={isPlaying} onEnded={playNext} onTimeUpdate={handleTimeUpdate} />

      <div className={`fixed inset-0 z-[99999] text-white transition-all duration-[450ms] ${isExpanded ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 z-0 bg-[#0B1320]" />
        
        {canvasData?.canvasUrl && (
          <video src={canvasData.canvasUrl} loop muted autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" />
        )}

        <div className="absolute inset-0 z-20 flex flex-col p-6 pt-12">
            <button onClick={() => setIsExpanded(false)} className="p-2 -ml-2 text-white active:opacity-50 absolute top-10 left-4 z-30"><ChevronDown size={32} /></button>
            
            <div className="flex-1 flex flex-col items-center justify-center relative mt-10">
               <div className="w-full max-w-[350px] aspect-square rounded-2xl overflow-hidden shadow-2xl bg-[#131d30]">
                  {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 size={40} className="animate-spin" /></div>}
                  <img src={displayImage} className="w-full h-full object-cover" />
               </div>
            </div>

            <div className="w-full pb-8 flex flex-col justify-end mt-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col flex-1 min-w-0 pr-4">
                        <MarqueeText text={displayTitle} className="text-2xl font-bold" />
                        <MarqueeText text={displayArtists} className="text-[15px] text-white/60 mt-1" />
                    </div>
                    <button onClick={() => toggleLikeSong(currentSong)}><Heart size={28} fill={isSongLiked ? "#1db954" : "none"} color={isSongLiked ? "#1db954" : "white"} /></button>
                </div>

                <div className="w-full mb-6">
                    <input type="range" min="0" max="100" value={duration > 0 ? progress : 0} onChange={(e) => { const v = parseFloat(e.target.value); setProgress(v); audioRef.current!.currentTime = (v/100)*duration; }} className="w-full" />
                    <div className="flex justify-between text-xs text-white/50 mt-2"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                </div>

                <div className="flex items-center justify-between">
                    <button onClick={playPrev}><SkipBack size={36} fill="white" /></button>
                    <button onClick={() => { setIsPlaying(!isPlaying); if(isPlaying) audioRef.current?.pause(); else audioRef.current?.play(); }} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center">
                        {loading ? <Loader2 className="animate-spin" size={30} /> : (isPlaying ? <Pause fill="black" size={30} /> : <Play fill="black" size={30} className="ml-1" />)}
                    </button>
                    <button onClick={playNext}><SkipForward size={36} fill="white" /></button>
                </div>
            </div>
        </div>
      </div>

      <div onClick={() => setIsExpanded(true)} className={`fixed bottom-[65px] left-2 right-2 h-14 bg-[#131d30] rounded-lg z-[99990] flex items-center px-2 cursor-pointer shadow-lg transition-transform ${isExpanded ? 'translate-y-20' : ''}`}>
        <img src={displayImage} className="w-10 h-10 rounded-md" />
        <div className="flex flex-col flex-1 px-3 overflow-hidden">
           <MarqueeText text={displayTitle} className="text-[13px] font-bold" />
           <MarqueeText text={displayArtists} className="text-[11px] text-white/60" />
        </div>
        <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); if(isPlaying) audioRef.current?.pause(); else audioRef.current?.play(); }} className="p-2">
           {isPlaying ? <Pause fill="white" size={20} /> : <Play fill="white" size={20} />}
        </button>
      </div>
    </>
  );
}
