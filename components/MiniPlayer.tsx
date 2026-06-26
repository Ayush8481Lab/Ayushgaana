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
  MonitorPlay, Maximize2, Menu, Timer, Disc3, Calendar, Clock, Hash, Globe, Settings2, Check, Share2, Download, Video, X, Server, Sparkles,
  Users, LogOut, Copy, Radio, Activity, MessageCircle, Send, MessageCircleOff, Shield, Crown, AlertTriangle, UserMinus
} from "lucide-react";

// --- VERCEL PROTECTION BYPASS ENGINE ---
const AUTOMATION_SECRET = "pR3nSUsTI9HQxb2RbdasB5mjKqUoSP8m";
const bypassHeaders = { "x-vercel-protection-bypass": AUTOMATION_SECRET };

const fetchProtected = async (url: string, options: any = {}) => {
  return fetch(url, { ...options, headers: { ...options.headers, ...bypassHeaders } });
};

// Advanced Parser for r.jina.ai
const fetchJina = async (targetUrl: string, options: any = {}) => {
  const res = await fetch(`https://r.jina.ai/${targetUrl}`, {
      ...options,
      headers: { ...options.headers, "Accept": "application/json", ...bypassHeaders }
  });
  const text = await res.text();
  let result;
  try {
      const jinaWrapper = JSON.parse(text);
      if (jinaWrapper.data && jinaWrapper.data.content) {
          const match = jinaWrapper.data.content.match(/```(?:json)?\n([\s\S]*?)\n```/);
          result = match ? JSON.parse(match[1]) : JSON.parse(jinaWrapper.data.content);
      } else {
          result = jinaWrapper;
      }
  } catch(e) {
      try {
          const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
          result = match ? JSON.parse(match[1]) : JSON.parse(text);
      } catch(err) { result = null; }
  }
  return result;
};

// --- 30-MINUTE INDEXEDDB CACHE ENGINE ---
const DB_NAME = "GrooveCacheDB";
const STORE_NAME = "caches";
const CACHE_EXPIRY_MS = 30 * 60 * 1000;

const initDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof window === 'undefined' || !window.indexedDB) return reject();
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = (e: any) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'key' });
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject();
});

const getCache = async (key: string): Promise<any> => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const res = req.result;
        if (res && Date.now() - res.timestamp < CACHE_EXPIRY_MS) resolve(res.data);
        else resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  } catch(e) { return null; }
};

const setCache = async (key: string, data: any, isAudio = false): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, data, timestamp: Date.now(), isAudio });
      tx.oncomplete = () => {
        if (isAudio) {
          const txc = db.transaction(STORE_NAME, 'readwrite');
          const storec = txc.objectStore(STORE_NAME);
          const allReq = storec.getAll();
          allReq.onsuccess = () => {
            const audioItems = allReq.result.filter((i: any) => i.isAudio).sort((a: any, b: any) => b.timestamp - a.timestamp);
            if (audioItems.length > 30) audioItems.slice(30).forEach((i: any) => storec.delete(i.key));
          };
        }
        resolve();
      };
    });
  } catch(e) {}
};

// --- PRO AUTH ENGINE ---
const AUTH_STORAGE_KEY = 'spotify_app_auth';
let ongoingAuthPromise: Promise<any> | null = null;

const getCachedAuth = () => {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(AUTH_STORAGE_KEY);
    if (cached) {
      const authData = JSON.parse(cached);
      if (Date.now() < (authData.accessTokenExpirationTimestampMs - 10000)) return authData;
    }
  } catch (e) {}
  return null;
};

const fetchNewAuthToken = async () => {
  if (ongoingAuthPromise) return ongoingAuthPromise;
  ongoingAuthPromise = (async () => {
    try {
      const data = await fetchJina('https://spotifystreamayush.vercel.app/api/Auth', { referrerPolicy: "no-referrer" });
      if (data && data.accessToken) {
         if (typeof window !== "undefined") localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
         return data;
      }
      return null;
    } catch (error) { return null; } finally { ongoingAuthPromise = null; }
  })();
  return ongoingAuthPromise;
};

const getAuthData = async () => {
  const cachedAuth = getCachedAuth();
  if (cachedAuth) return cachedAuth;
  return await fetchNewAuthToken();
};

const decodeEntities = (text: string) => {
  if (!text) return "";
  let decoded = text;
  try {
    if (typeof window !== "undefined") {
      const txt = document.createElement("textarea");
      txt.innerHTML = text;
      decoded = txt.value;
    }
  } catch (e) {}
  return decoded.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'");
};

const getArtistsText = (data: any) => {
  let names: string[] =[];
  if (data?.entity_info) {
     const artistInfo = data.entity_info.find((info: any) => info.key === 'artist' || info.key === 'singers');
     if (artistInfo && Array.isArray(artistInfo.value)) names = artistInfo.value.map((a: any) => a.name);
  }
  if (names.length === 0) {
     if (Array.isArray(data?.artist)) names = data.artist.map((a: any) => a.name);
     else if (Array.isArray(data?.singers)) names = data.singers.map((a: any) => a.name);
     else if (Array.isArray(data?.artists)) names = data.artists.map((a: any) => a.name);
     else if (typeof data?.artists === "string") names = data.artists.split(",").map((n: string) => n.trim());
     else if (data?.primaryArtists) names = typeof data.primaryArtists === 'string' ? data.primaryArtists.split(",") : data.primaryArtists.map((a:any)=>a.name);
  }
  return names.length > 0 ? Array.from(new Set(names)).join(", ") : "Unknown Artist";
};

const getImageUrl = (item: any) => {
  if (!item) return "https://via.placeholder.com/500x500?text=Music";
  let img = item.artwork_large || item.artwork_web || item.atw || item.artwork || item.image || item;
  if (typeof img === "string") return img.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500").replace("50x50", "500x500").split('?')[0];
  if (Array.isArray(img) && img[0]?.url) return (img[img.length - 1]?.url || img[0]?.url).split('?')[0];
  return img;
};

const getArtistColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 45%, 35%)`;
};

const formatTime = (time: number) => {
  if (!time || isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const parseTimeTag = (tag: string) => {
  if (!tag) return 0;
  const parts = tag.split(':');
  if (parts.length >= 2) return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  return 0;
};

const RAPID_KEYS =["d1edce158amshec139440d20658ap1f2545jsnbb7da9add82f", "6cf7f03014msh787c51a713c0264p15c20djsna1f9a9f6a378", "13d48f6bb8msh459c11b91bdcc44p110f4ejsn099443894115", "03fc23317fmsh0535ef9ec8c6f5bp1db59bjsn545991df9343", "e54e3fbc4dmshfc16d4417b618fdp1a2fafjsn30c72d8cf3ab"];
const RAPID_API_HOST = "spotify81.p.rapidapi.com";

const QUALITY_MAP: any = { "16": "Low", "64": "Medium", "128": "High", "320": "HD" };

const performAK47Matching = (results: any[], targetTrack: string, targetArtist: string): any => {
    if (!results || results.length === 0) return null;
    const clean = (s: string) => decodeEntities(s || "").toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
    const tTitle = clean(targetTrack);
    const tArtist = clean(targetArtist);
    let bestMatch = null; let highestScore = 0;

    results.forEach((track) => {
        if (!track) return;
        const rTitle = clean(track.song_name);
        const rArtists = clean(track.artist);
        let score = 0; let artistMatched = false;

        if (tArtist.length > 0) {
            if (rArtists === tArtist) { score += 100; artistMatched = true; }
            else if (rArtists.includes(tArtist) || tArtist.includes(rArtists)) { score += 80; artistMatched = true; }
            else {
                const tSplit = tArtist.split(" ");
                for (let t of tSplit) { if (t.length > 2 && rArtists.includes(t)) { score += 50; artistMatched = true; break; } }
            }
            if (!artistMatched) score = 0;
        } else score += 50;

        if (score > 0) {
            if (rTitle === tTitle) score += 100;
            else if (rTitle.startsWith(tTitle) || tTitle.startsWith(rTitle)) score += 80;
            else if (rTitle.includes(tTitle) || tTitle.includes(rTitle)) score += 50;
        }
        if (score > highestScore) { highestScore = score; bestMatch = track; }
    });
    if (highestScore > 0) return bestMatch;
    return results[0];
};

const performMatching = (apiData: any, targetTrack: string, targetArtist: string): any => {
  if (!apiData.tracks || apiData.tracks.length === 0) return null;
  const clean = (s: string) => decodeEntities(s || "").toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
  const tTitle = clean(targetTrack); const tArtist = clean(targetArtist);
  let bestMatch: any = null; let highestScore = 0;
  
  apiData.tracks.forEach((item: any) => {
      const track = item.data || item; if (!track) return;
      const rTitle = clean(track.name); const rArtists = (track.artists?.items || track.artists ||[]).map((a: any) => clean(a.profile?.name || a.name));
      let score = 0; let artistMatched = false;
      if (tArtist.length > 0) {
          for (let ra of rArtists) { 
              if (ra === tArtist) { score += 100; artistMatched = true; break; } 
              else if (ra.includes(tArtist) || tArtist.includes(ra)) { score += 80; artistMatched = true; break; } 
          }
          if (!artistMatched) score = 0;
      } else score += 50;
      if (score > 0) { 
          if (rTitle === tTitle) score += 100; 
          else if (rTitle.startsWith(tTitle) || tTitle.startsWith(rTitle)) score += 80; 
          else if (rTitle.includes(tTitle)) score += 50; 
      }
      if (score > highestScore) { highestScore = score; bestMatch = track; }
  });
  if (highestScore > 0) return bestMatch;
  if (apiData.tracks && apiData.tracks.length > 0) return apiData.tracks[0].data || apiData.tracks[0];
  return null;
};

const NativeID3 = {
  tag: function(data: any) {
      const frames =[];
      if(data.title) frames.push(this.txtFrame('TIT2', data.title));
      if(data.artist) frames.push(this.txtFrame('TPE1', data.artist));
      if(data.album) frames.push(this.txtFrame('TALB', data.album));
      if(data.image) frames.push(this.picFrame(data.image));
      let totalSize = 0; frames.forEach(f => totalSize += f.length);
      const header = new Uint8Array(10);
      header.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00], 0); header.set(this.calcSize(totalSize), 6);
      const final = new Uint8Array(10 + totalSize + data.audio.byteLength);
      final.set(header, 0); let offset = 10;
      frames.forEach(f => { final.set(f, offset); offset += f.length; });
      final.set(new Uint8Array(data.audio), offset);
      return final;
  },
  txtFrame: function(id: string, text: string) {
      const strBytes = this.strToUtf16(text); const size = 1 + strBytes.length;
      const buf = new Uint8Array(10 + size);
      buf.set(this.strToAscii(id), 0); buf.set(this.intToBytes(size), 4);
      buf[10] = 0x01; buf.set(strBytes, 11); return buf;
  },
  picFrame: function(imgBuf: ArrayBuffer) {
      const mime = this.strToAscii("image/jpeg"); const imgData = new Uint8Array(imgBuf);
      const size = 1 + mime.length + 1 + 1 + 1 + imgData.length;
      const buf = new Uint8Array(10 + size);
      buf.set(this.strToAscii('APIC'), 0); buf.set(this.intToBytes(size), 4);
      let p = 10; buf[p++] = 0x00; buf.set(mime, p); p += mime.length;
      buf[p++] = 0x00; buf[p++] = 0x03; buf[p++] = 0x00; buf.set(imgData, p); return buf;
  },
  calcSize: function(n: number) { return[(n>>21)&0x7F, (n>>14)&0x7F, (n>>7)&0x7F, n&0x7F]; },
  intToBytes: function(n: number) { return[(n>>24)&0xFF, (n>>16)&0xFF, (n>>8)&0xFF, n&0xFF]; },
  strToAscii: (s: string) => new Uint8Array([...s].map(c=>c.charCodeAt(0))),
  strToUtf16: (s: string) => {
      const b = new Uint8Array(2 + s.length*2); b[0]=0xFF; b[1]=0xFE;
      for(let i=0; i<s.length; i++){ const c = s.charCodeAt(i); b[2 + i*2] = c & 0xFF; b[3 + i*2] = (c >> 8) & 0xFF; }
      return b;
  }
};

const loadLameJS = () => new Promise((resolve, reject) => {
  if ((window as any).lamejs) return resolve(true);
  const script = document.createElement('script');
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js";
  script.onload = () => resolve(true);
  script.onerror = reject;
  document.head.appendChild(script);
});

const loadHlsJS = (): Promise<any> => new Promise((resolve, reject) => {
    if ((window as any).Hls) return resolve((window as any).Hls);
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
    script.onload = () => resolve((window as any).Hls);
    script.onerror = reject;
    document.head.appendChild(script);
});

const loadAblyJS = (): Promise<any> => new Promise((resolve, reject) => {
    if ((window as any).Ably) return resolve((window as any).Ably);
    const script = document.createElement('script');
    script.src = "https://cdn.ably.com/lib/ably.min-1.js";
    script.onload = () => resolve((window as any).Ably);
    script.onerror = reject;
    document.head.appendChild(script);
});

const MarqueeText = React.memo(({ text, className = "" }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const[isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => { 
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 5); 
      }
    };
    checkOverflow();
    const timeouts =[setTimeout(checkOverflow, 100), setTimeout(checkOverflow, 500)];
    window.addEventListener('resize', checkOverflow);
    return () => { timeouts.forEach(clearTimeout); window.removeEventListener('resize', checkOverflow); };
  },[text]);

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

const SongDnaCard = React.memo(({ artist, closePlayer, isFew }: { artist: any, closePlayer: () => void, isFew: boolean }) => {
    const artistImg = getImageUrl(artist);
    const fallbackColor = getArtistColor(artist.name || "Unknown");
    
    const formatRoles = (roles: string[]) => {
        if (!roles || roles.length === 0) return "";
        const joined = roles.join(', ').toLowerCase();
        return joined.charAt(0).toUpperCase() + joined.slice(1);
    };
    const rolesText = formatRoles(artist.roles);

    const sizeClass = isFew ? "w-[130px] h-[130px] sm:w-[150px] sm:h-[150px]" : "w-[110px] h-[110px]";
    const textClass = isFew ? "text-[15px] sm:text-[16px]" : "text-[13px]";
    const subtextClass = isFew ? "text-[12px] sm:text-[13px]" : "text-[11px]";
    const containerWidth = isFew ? "w-[130px] sm:w-[150px]" : "w-[110px]";

    return (
        <Link prefetch={false} href={`/artist/${artist.seokey || artist.id}`} onClick={closePlayer} className={`flex flex-col items-center gap-2 flex-shrink-0 ${containerWidth} group no-select-text`}>
            <div className={`${sizeClass} rounded-full overflow-hidden relative flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.3)] border border-white/10 group-hover:scale-105 transition-transform`} style={{ backgroundColor: artistImg ? '#282828' : fallbackColor }}>
                {!artistImg ? <span className="text-white font-bold text-4xl no-select-text">{decodeEntities(artist.name).charAt(0).toUpperCase()}</span> : <img draggable={false} src={artistImg} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="min-w-full min-h-full w-full h-full object-cover object-center relative z-10 no-select pointer-events-none" alt={artist.name} />}
            </div>
            <div className="flex flex-col items-center w-full px-1 no-select-text overflow-hidden">
                <MarqueeText text={decodeEntities(artist.name)} className={`text-white/90 ${textClass} font-bold drop-shadow-md w-full justify-center text-center`} />
                <div className={`w-full mt-[1px] flex justify-center text-[#a7a7a7] ${subtextClass} font-medium tracking-wide`}>
                    <MarqueeText text={rolesText} className="w-full justify-center text-center" />
                </div>
            </div>
        </Link>
    )
});
SongDnaCard.displayName = 'SongDnaCard';


export default function MiniPlayer() {
  const { 
    currentSong, isPlaying, setIsPlaying, setCurrentSong, 
    queue, upcomingQueue, setUpcomingQueue, historyQueue, setHistoryQueue,
    playContext, likedSongs, toggleLikeSong 
  } = useAppContext();
  
  const[audioUrl, setAudioUrl] = useState("");
  const[streamBaseUrl, setStreamBaseUrl] = useState<string | null>(null);
  
  // Buffering States
  const[isStreamLoading, setIsStreamLoading] = useState(false);
  const[isAudioBuffering, setIsAudioBuffering] = useState(false);
  
  const[progress, setProgress] = useState(0);
  const[buffered, setBuffered] = useState(0);
  const[currentTime, setCurrentTime] = useState(0);
  const[duration, setDuration] = useState(0);
  const[volume, setVolume] = useState(100);
  
  const[isExpanded, setIsExpanded] = useState(false);
  const[showQueue, setShowQueue] = useState(false);
  const[showSettingsMenu, setShowSettingsMenu] = useState(false);
  const[showTimerMenu, setShowTimerMenu] = useState(false);

  // --- JIM JAM CORE STATE ENGINE ---
  const JAM_STORAGE_KEY = 'jim_jam_session';
  const [showJamMenu, setShowJamMenu] = useState(false);
  const [jamRoomId, setJamRoomId] = useState<string | null>(null);
  const [jamRole, setJamRole] = useState<'host' | 'admin' | 'guest' | null>(null);
  const [jamInputId, setJamInputId] = useState("");
  const [jamName, setJamName] = useState("");
  const [jamAvatar, setJamAvatar] = useState("");
  const [jamStatus, setJamStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [jamParticipants, setJamParticipants] = useState<any[]>([]);
  const [jamLogs, setJamLogs] = useState<any[]>([]);
  const [jamPlayBlocked, setJamPlayBlocked] = useState(false);
  const [jamPlayContext, setJamPlayContext] = useState<any>(null);
  const [jamError, setJamError] = useState<string | null>(null);
  
  const [jamChatMessages, setJamChatMessages] = useState<any[]>([]);
  const [jamChatInput, setJamChatInput] = useState("");
  const [isChatEnabled, setIsChatEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const ablyClientRef = useRef<any>(null);
  const ablyChannelRef = useRef<any>(null);
  const isPlayingRef = useRef(isPlaying);
  const jamRoleRef = useRef(jamRole);
  const jamPlayBlockedRef = useRef(jamPlayBlocked);
  const clientIdRef = useRef<string | null>(null);
  const isSystemSongChangeRef = useRef(false);
  
  // High-performance action lockout to prevent UI fights
  const localActionTimeRef = useRef<number>(0);
  const requestedDataForTrackRef = useRef<string | null>(null); // Prevents infinite data request loop
  
  const upcomingQueueRef = useRef<any[]>([]);
  const playContextRef = useRef<any>(null);

  useEffect(() => { upcomingQueueRef.current = upcomingQueue; }, [upcomingQueue]);
  useEffect(() => { playContextRef.current = playContext; }, [playContext]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { jamRoleRef.current = jamRole; }, [jamRole]);
  useEffect(() => { jamPlayBlockedRef.current = jamPlayBlocked; }, [jamPlayBlocked]);

  useEffect(() => {
      if (typeof window !== 'undefined') {
          const storedName = localStorage.getItem('jam_name');
          if (storedName) setJamName(storedName);
          const storedAvatar = localStorage.getItem('jam_avatar');
          if (storedAvatar) setJamAvatar(storedAvatar);
      }
  }, []);

  useEffect(() => {
      if (chatContainerRef.current && showChat) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
  }, [jamChatMessages, showChat]);

  // High-performance payload broadcast tracking
  const songStartTrackingRef = useRef<number>(Date.now());
  const lastFetchedTrackIdRef = useRef<string | null>(null);
  
  const[dominantColor, setDominantColor] = useState("rgb(83, 83, 83)");
  const[isScrolledPastMain, setIsScrolledPastMain] = useState(false);
  const[isUiHidden, setIsUiHidden] = useState(false); 
  const[isShuffle, setIsShuffle] = useState(false);
  const[repeatMode, setRepeatMode] = useState(0); 
  
  const[dragActiveIndex, setDragActiveIndex] = useState<number | null>(null);
  const dragRef = useRef({ activeIndex: -1, startY: 0, currentY: 0, startScrollTop: 0, scrollSpeed: 0, rafId: 0, targetIndex: -1 });
  const[isQueueEditMode, setIsQueueEditMode] = useState(false);
  const[selectedQueueItems, setSelectedQueueItems] = useState<number[]>([]); 

  const[sleepTimer, setSleepTimer] = useState<number | 'end' | null>(null);
  const[timerRemaining, setTimerRemaining] = useState<number | null>(null);
  
  const currentTrackRef = useRef<any>(null);
  const maxListenRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0); 
  const isNavigatingBackRef = useRef(false);
  const mediaMetadataSetRef = useRef(false);
  const hasCachedCurrentSongRef = useRef(false);
  
  const rapidKeyIdxRef = useRef(0);
  const[spotifyId, setSpotifyId] = useState<string | null>(null);
  const[spotifyUrl, setSpotifyUrl] = useState<string | null>(null);
  const[lyrics, setLyrics] = useState<any[]>([]);
  const[syncType, setSyncType] = useState<string | null>(null);
  const[activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const[isLyricsFullScreen, setIsLyricsFullScreen] = useState(false);
  const[canvasData, setCanvasData] = useState<any>(null);
  const[isCanvasLoaded, setIsCanvasLoaded] = useState(false);
  
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLParagraphElement>(null);
  const fullLyricsContainerRef = useRef<HTMLDivElement>(null);
  const fullActiveLyricRef = useRef<HTMLParagraphElement>(null);
  const miniActiveLyricRef = useRef<HTMLDivElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  
  const canvasVideoRef = useRef<HTMLVideoElement>(null);
  const playNextRef = useRef<((isAutoPlay?: boolean) => void)>(() => {});
  const playPrevRef = useRef<() => void>(() => {});
  const isVideoModeRef = useRef<boolean>(false);
  const[swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<any>(null);
  const queueContainerRef = useRef<HTMLDivElement>(null);
  const isSeekingRef = useRef(false);
  const[songDetails, setSongDetails] = useState<any>(null);

  const[isVideoMode, setIsVideoMode] = useState(false);
  const[ytVideoId, setYtVideoId] = useState<string | null>(null);
  const prefetchedYtIdRef = useRef<string | null>(null); 
  const iframeInitialTimeRef = useRef<number>(0); 
  const videoStartTimeRef = useRef<number>(0);    
  const[isVideoLoading, setIsVideoLoading] = useState(false);
  const videoIframeRef = useRef<HTMLIFrameElement>(null);

  const fetchingRecsRef = useRef(false);
  const[isFetchingRecsUI, setIsFetchingRecsUI] = useState(false);
  const[isSessionRestored, setIsSessionRestored] = useState(false);
  
  const[selectedQuality, setSelectedQuality] = useState("128");
  const[lineFontSize, setLineFontSize] = useState("Medium");
  const[cardFontSize, setCardFontSize] = useState("Medium");
  const[isCanvasEnabled, setIsCanvasEnabled] = useState(true);
  const[isLyricsEnabled, setIsLyricsEnabled] = useState(true);
  const[isWordSyncEnabled, setIsWordSyncEnabled] = useState(true);
  const[isMiniWordSyncEnabled, setIsMiniWordSyncEnabled] = useState(true);
  const[lyricsServer, setLyricsServer] = useState("Spotify");
  const restoreTimeRef = useRef<number | null>(null);

  const isCanvasEnabledRef = useRef(true);
  const isLyricsEnabledRef = useRef(true);

  // Deep refs for Host payload building
  const songDetailsRef = useRef(songDetails);
  const audioUrlRef = useRef(audioUrl);
  const streamBaseUrlRef = useRef(streamBaseUrl);
  const lyricsRef = useRef(lyrics);
  const syncTypeRef = useRef(syncType);
  const canvasDataRef = useRef(canvasData);
  const ytVideoIdRef = useRef(ytVideoId);

  useEffect(() => { songDetailsRef.current = songDetails; }, [songDetails]);
  useEffect(() => { audioUrlRef.current = audioUrl; }, [audioUrl]);
  useEffect(() => { streamBaseUrlRef.current = streamBaseUrl; }, [streamBaseUrl]);
  useEffect(() => { lyricsRef.current = lyrics; }, [lyrics]);
  useEffect(() => { syncTypeRef.current = syncType; }, [syncType]);
  useEffect(() => { canvasDataRef.current = canvasData; }, [canvasData]);
  useEffect(() => { ytVideoIdRef.current = ytVideoId; }, [ytVideoId]);

  const[dlState, setDlState] = useState<{type: "music" | "video" | null, status: string, options?: any[], progress?: number, packStep?: string, server?: number}>({type: null, status: "idle", progress: 0, server: 1});

  const isSongLiked = likedSongs.some((s: any) => s && (s.id || s.track_id) === (currentSong?.id || currentSong?.track_id));
  const handleLikeClick = (e: any) => { e.stopPropagation(); toggleLikeSong(currentSong); };

  const isCanvasActive = isCanvasLoaded && isCanvasEnabled && !isVideoMode && !isLyricsFullScreen && canvasData?.canvasUrl;
  const isBuffering = isStreamLoading || isAudioBuffering || isVideoLoading;

  // Admin is NOT guest locked for UI
  const isGuestLocked = jamRole === 'guest' && jamStatus === 'connected';

  // Context Switcher for UI
  const displayContext = (jamStatus === 'connected' && jamRole !== 'host') ? jamPlayContext : playContext;

  // --- SILENT AUTOPLAY BYPASS ---
  useEffect(() => {
      const unlockAudio = () => {
          if (jamPlayBlockedRef.current && audioRef.current) {
              audioRef.current.play().then(() => {
                  setJamPlayBlocked(false);
              }).catch(() => {});
          }
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('touchstart', unlockAudio);
      return () => {
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
      };
  }, []);

  // --- HOST/ADMIN SYNC BROADCASTER ---
  const broadcastFullSync = useCallback(() => {
      if ((jamRoleRef.current !== 'host' && jamRoleRef.current !== 'admin') || !ablyChannelRef.current) return;
      ablyChannelRef.current.publish('sync', {
          type: 'FULL_SYNC',
          senderId: clientIdRef.current,
          payload: {
              song: currentTrackRef.current,
              songDetails: songDetailsRef.current,
              audioUrl: audioUrlRef.current,
              streamBaseUrl: streamBaseUrlRef.current,
              lyrics: lyricsRef.current,
              syncType: syncTypeRef.current,
              canvasData: canvasDataRef.current,
              isVideoMode: isVideoModeRef.current,
              ytVideoId: ytVideoIdRef.current,
              isPlaying: isPlayingRef.current,
              time: isVideoModeRef.current ? videoStartTimeRef.current : (audioRef.current?.currentTime || 0),
              queue: upcomingQueueRef.current,
              playContext: playContextRef.current
          }
      });
  }, []);

  // Guest requesting Data if Missing
  useEffect(() => {
      if ((jamRole === 'guest' || jamRole === 'admin') && jamStatus === 'connected' && currentSong) {
          const trackId = currentTrackRef.current?.id || currentTrackRef.current?.track_id;
          
          if (requestedDataForTrackRef.current === trackId) return; // Prevent infinite request loop

          if (!canvasData || lyrics.length === 0 || !songDetails) {
              const timeout = setTimeout(() => {
                  if (ablyChannelRef.current) {
                      requestedDataForTrackRef.current = trackId; // Mark as requested
                      ablyChannelRef.current.publish('sync', { 
                          type: 'REQUEST_DATA',
                          senderId: clientIdRef.current,
                          trackId: trackId 
                      });
                  }
              }, 3000);
              return () => clearTimeout(timeout);
          }
      }
  }, [currentSong, canvasData, lyrics, songDetails, jamRole, jamStatus]);

  // --- AUTOMATION HEARTBEAT + METADATA CARRIER ---
  useEffect(() => {
      if (jamRole === 'host' && jamStatus === 'connected') {
          const interval = setInterval(() => {
              if (!ablyChannelRef.current) return;
              
              // Prevent heartbeat if host recently executed an action or received an authoritative FULL_SYNC
              if (Date.now() - localActionTimeRef.current < 8000) return;

              // Beam metadata for 35 seconds to guarantee perfect async payload loading on Guests
              const timeSinceStart = Date.now() - (songStartTrackingRef.current || 0);
              const shouldCarry = timeSinceStart < 35000 || !hasCachedCurrentSongRef.current;

              ablyChannelRef.current.publish('sync', {
                  type: 'HEARTBEAT',
                  senderId: clientIdRef.current,
                  trackId: currentTrackRef.current?.id || currentTrackRef.current?.track_id,
                  isPlaying: isPlayingRef.current,
                  time: isVideoModeRef.current ? videoStartTimeRef.current : (audioRef.current?.currentTime || 0),
                  isVideoMode: isVideoModeRef.current,
                  carryPayload: shouldCarry ? {
                      audioUrl: audioUrlRef.current,
                      streamBaseUrl: streamBaseUrlRef.current,
                      lyrics: lyricsRef.current,
                      syncType: syncTypeRef.current,
                      canvasData: canvasDataRef.current,
                      songDetails: songDetailsRef.current,
                      ytVideoId: ytVideoIdRef.current,
                      queue: upcomingQueueRef.current,
                      playContext: playContextRef.current
                  } : null
              });
          }, 20000); // 20 Seconds Heartbeat Lock
          return () => clearInterval(interval);
      }
  }, [jamRole, jamStatus]);

  // --- JIM JAM CONNECTION LOGIC ---
  const connectToAbly = async (roomId: string, role: 'host' | 'admin' | 'guest', customName: string) => {
      try {
          setJamStatus('connecting');
          const Ably = await loadAblyJS();
          const ABLY_KEY: string = "02RdCw.eCopUg:BoGqeU7MsjH0CSEh1acIjkB_O8We71t6tY8huz1wFho"; 
          
          const clientId = 'jam_' + Math.random().toString(36).substr(2, 9);
          clientIdRef.current = clientId;
          const ably = new Ably.Realtime.Promise({ key: ABLY_KEY, clientId });
          
          ably.connection.on('failed', () => {
              setJamStatus('disconnected');
              setJamError("Jim Jam connection failed. Please try again.");
          });

          await new Promise<void>((resolve, reject) => {
              ably.connection.once('connected', () => resolve());
              ably.connection.once('failed', () => reject(new Error("Connection Failed")));
          });

          const channel = ably.channels.get(`jim-jam-${roomId}`);
          await channel.attach();

          ablyClientRef.current = ably;
          ablyChannelRef.current = channel;
          localStorage.setItem(JAM_STORAGE_KEY, JSON.stringify({ roomId, role, name: customName, timestamp: Date.now() }));

          const defaultName = customName.trim() || (role === 'host' ? 'Host' : `Groover_${Math.floor(Math.random()*1000)}`);
          const currentAvatar = localStorage.getItem('jam_avatar') || '';

          channel.presence.subscribe(['enter', 'leave', 'update'], (msg: any) => {
              const p = msg.data;
              const action = msg.action;
              
              if (action === 'enter' || action === 'leave') {
                  const isEnter = action === 'enter';
                  setJamLogs(prev => {
                      const newLogs = [...prev, { id: Date.now(), text: `${p.name} ${isEnter ? 'joined the Jam.' : 'left.'}`}];
                      return newLogs.slice(-10);
                  });
              }

              // Update participant list safely
              channel.presence.get().then((result: any) => {
                  const members = Array.isArray(result) ? result : (result.items || []);
                  setJamParticipants(members.map((m: any) => ({ ...m.data, clientId: m.clientId })));
              });

              if (jamRoleRef.current === 'host' && action === 'enter' && p.role !== 'host') {
                  broadcastFullSync();
              }
          });

          await channel.presence.enter({
              clientId,
              name: defaultName,
              avatar: currentAvatar,
              role: role
          });

          // Role Assign Listener
          channel.subscribe('role_assign', (msg: any) => {
              if (msg.data.targetClientId === clientIdRef.current) {
                  setJamRole(msg.data.newRole);
                  localStorage.setItem(JAM_STORAGE_KEY, JSON.stringify({ roomId, role: msg.data.newRole, name: customName, timestamp: Date.now() }));
                  channel.presence.update({
                      clientId: clientIdRef.current,
                      name: customName,
                      avatar: currentAvatar,
                      role: msg.data.newRole
                  });
                  if (msg.data.newRole === 'host') setTimeout(() => broadcastFullSync(), 500);
              }
          });

          // Chat Listener
          channel.subscribe('chat_msg', (msg: any) => {
              setJamChatMessages(prev => [...prev, msg.data].slice(-50));
          });
          channel.subscribe('chat_config', (msg: any) => {
              setIsChatEnabled(msg.data.enabled);
          });

          // Kick User Listener
          channel.subscribe('kick_user', (msg: any) => {
              if (msg.data.targetClientId === clientIdRef.current) {
                  setJamError("You have been removed from the Jam session by the host.");
                  disconnectJam();
              }
          });

          // CENTRALIZED SYNC RECEIVER (Handles Host, Admin, and Guest syncing dynamically)
          channel.subscribe('sync', (msg: any) => {
              const data = msg.data;
              const currentRole = jamRoleRef.current;
              
              if (data.senderId === clientIdRef.current) return; // Ignore own sync broadcasts

              if (data.type === 'ROOM_CLOSED') {
                  setJamError("The host has ended the Jam session.");
                  disconnectJam();
                  return;
              }

              if (data.type === 'REQUEST_DATA') {
                  if (currentRole === 'host' || currentRole === 'admin') {
                      const currentId = currentTrackRef.current?.id || currentTrackRef.current?.track_id;
                      if (currentId === data.trackId) {
                          if (canvasDataRef.current || lyricsRef.current?.length > 0 || songDetailsRef.current) {
                              broadcastFullSync();
                          } else {
                              setTimeout(() => {
                                  const stillCurrentId = currentTrackRef.current?.id || currentTrackRef.current?.track_id;
                                  if (stillCurrentId === data.trackId && !canvasDataRef.current && (!lyricsRef.current || lyricsRef.current.length === 0)) {
                                      channel.publish('sync', { type: 'DENY_DATA', senderId: clientIdRef.current, trackId: data.trackId });
                                  } else if (stillCurrentId === data.trackId) {
                                      broadcastFullSync();
                                  }
                              }, 5000);
                          }
                      }
                  }
                  return;
              }

              if (data.type === 'DENY_DATA') {
                  if (currentTrackRef.current?.id === data.trackId || currentTrackRef.current?.track_id === data.trackId) {
                      setCanvasData(null);
                      setLyrics([]);
                  }
                  return;
              }

              // --- CONFLICT RESOLUTION ENGINE ---
              const isDriver = currentRole === 'admin' || currentRole === 'host';
              const recentlyActed = isDriver && (Date.now() - localActionTimeRef.current < 10000);

              // Ignore routine packets if we just performed a local action (like a song change) to stop reverting
              if (recentlyActed && ['HEARTBEAT', 'TIME', 'STATE', 'QUEUE_UPDATE'].includes(data.type)) {
                  return; 
              }

              // Apply sync payload universally based on message type
              if (data.type === 'DATA_UPDATE') {
                  const p = data.payload;
                  const currentId = currentTrackRef.current?.id || currentTrackRef.current?.track_id;
                  if (currentId === p.trackId) {
                      if (p.canvasData && p.canvasData !== canvasDataRef.current) setCanvasData(p.canvasData);
                      if (p.lyrics && p.lyrics !== lyricsRef.current) setLyrics(p.lyrics);
                      if (p.syncType) setSyncType(p.syncType);
                      if (p.songDetails) setSongDetails(p.songDetails);
                      if (p.ytVideoId) setYtVideoId(p.ytVideoId);
                  }
              } else if (data.type === 'QUEUE_UPDATE') {
                  setUpcomingQueue(data.payload.queue);
              } else if (data.type === 'FULL_SYNC') {
                  localActionTimeRef.current = Date.now(); // Respect the authoritative switch, lock out our own actions
                  const p = data.payload;
                  isSystemSongChangeRef.current = true; // Prevents local fetch and purge
                  
                  setSongDetails(p.songDetails);
                  setAudioUrl(p.audioUrl);
                  setStreamBaseUrl(p.streamBaseUrl);
                  setLyrics(p.lyrics);
                  setSyncType(p.syncType);
                  setCanvasData(p.canvasData);
                  setYtVideoId(p.ytVideoId);
                  setJamPlayContext(p.playContext);
                  if (p.queue) setUpcomingQueue(p.queue);
                  
                  if (p.isVideoMode !== isVideoModeRef.current) setIsVideoMode(p.isVideoMode);

                  let targetTime = p.time;
                  // Only add buffer offset explicitly on initial FULL_SYNC to avoid regular stutter
                  if (p.isPlaying) targetTime += 0.8; 
                  iframeInitialTimeRef.current = targetTime;

                  if (p.song && p.song.id !== currentTrackRef.current?.id) {
                      setCurrentSong(p.song); // Triggers useEffect, but isSystemSongChangeRef prevents fetch/purge
                  } else {
                      currentTrackRef.current = p.song;
                  }

                  setIsPlaying(p.isPlaying);
                  if (p.isVideoMode && videoIframeRef.current?.contentWindow) {
                      videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_SEEK', time: targetTime }, '*');
                      videoIframeRef.current.contentWindow.postMessage({ type: p.isPlaying ? 'MUSIC_PLAY' : 'MUSIC_PAUSE' }, '*');
                  } else if (!p.isVideoMode && audioRef.current) {
                      // Apply the 4.0 second tolerance to FULL_SYNC so it doesn't flicker current audio
                      const currentId = currentTrackRef.current?.id || currentTrackRef.current?.track_id;
                      const payloadId = p.song?.id || p.song?.track_id;
                      if (Math.abs(audioRef.current.currentTime - targetTime) > 4.0 || payloadId !== currentId) {
                          audioRef.current.currentTime = targetTime;
                          setCurrentTime(targetTime);
                      }
                      if (p.isPlaying) audioRef.current.play().catch(() => setJamPlayBlocked(true));
                      else audioRef.current.pause();
                  }
              } else if (data.type === 'HEARTBEAT' || data.type === 'TIME' || data.type === 'STATE') {
                  if (data.type === 'HEARTBEAT') {
                      const currentId = currentTrackRef.current?.id || currentTrackRef.current?.track_id;
                      if (data.trackId !== currentId && !data.carryPayload) return;
                      if (data.carryPayload) {
                          const cp = data.carryPayload;
                          if (cp.audioUrl && cp.audioUrl !== audioUrlRef.current) setAudioUrl(cp.audioUrl);
                          if (cp.streamBaseUrl && cp.streamBaseUrl !== streamBaseUrlRef.current) setStreamBaseUrl(cp.streamBaseUrl);
                          if (cp.lyrics && cp.lyrics.length !== lyricsRef.current.length) setLyrics(cp.lyrics);
                          if (cp.syncType && cp.syncType !== syncTypeRef.current) setSyncType(cp.syncType);
                          if (cp.canvasData && cp.canvasData.canvasUrl !== canvasDataRef.current?.canvasUrl) setCanvasData(cp.canvasData);
                          if (cp.songDetails && !songDetailsRef.current) setSongDetails(cp.songDetails);
                          if (cp.ytVideoId && cp.ytVideoId !== ytVideoIdRef.current) setYtVideoId(cp.ytVideoId);
                          if (cp.playContext && cp.playContext !== playContextRef.current) setJamPlayContext(cp.playContext);
                          if (cp.queue) setUpcomingQueue(cp.queue);
                      }
                  }

                  if (data.isVideoMode !== undefined && data.isVideoMode !== isVideoModeRef.current) {
                      setIsVideoMode(data.isVideoMode);
                  }

                  // Standardized Time alignment - strictly guarded against manual scrubbing
                  let targetTime = data.time;
                  
                  if (data.isVideoMode || isVideoModeRef.current) {
                      if (data.type === 'TIME' || (data.type === 'HEARTBEAT' && Math.abs(videoStartTimeRef.current - targetTime) > 4.0)) {
                          if (!isSeekingRef.current) {
                              videoIframeRef.current?.contentWindow?.postMessage({ type: 'MUSIC_SEEK', time: targetTime }, '*');
                          }
                      }
                      if (data.type === 'STATE' || data.type === 'HEARTBEAT') {
                          if (data.isPlaying !== isPlayingRef.current) {
                              setIsPlaying(data.isPlaying);
                              videoIframeRef.current?.contentWindow?.postMessage({ type: data.isPlaying ? 'MUSIC_PLAY' : 'MUSIC_PAUSE' }, '*');
                          }
                      }
                  } else {
                      if (data.type === 'TIME' || (data.type === 'HEARTBEAT' && audioRef.current && Math.abs(audioRef.current.currentTime - targetTime) > 4.0)) {
                          if (audioRef.current && !isSeekingRef.current) {
                              audioRef.current.currentTime = targetTime;
                              setCurrentTime(targetTime);
                          }
                      }
                      if (data.type === 'STATE' || data.type === 'HEARTBEAT') {
                          if (data.isPlaying !== isPlayingRef.current) {
                              setIsPlaying(data.isPlaying);
                              if (data.isPlaying) audioRef.current?.play().catch(() => setJamPlayBlocked(true));
                              else audioRef.current?.pause();
                          }
                      }
                  }
              }
          });

          setJamStatus('connected');
          const result = await channel.presence.get();
          const members = Array.isArray(result) ? result : (result.items || []);
          setJamParticipants(members.map((m: any) => ({ ...m.data, clientId: m.clientId })));

      } catch (e) {
          console.error("Jam Connect Error:", e);
          setJamStatus('disconnected');
          setJamRole(null);
          setJamRoomId(null);
          localStorage.removeItem(JAM_STORAGE_KEY);
          setJamError("Failed to connect to Jam server. Check Room ID.");
      }
  };

  const createJamRoom = () => {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      setJamRoomId(newRoomId);
      setJamRole('host');
      connectToAbly(newRoomId, 'host', jamName);
  };

  const joinJamRoom = () => {
      if (jamInputId.length < 6) return;
      setJamRoomId(jamInputId);
      setJamRole('guest');
      connectToAbly(jamInputId, 'guest', jamName);
  };

  const disconnectJam = () => {
      if (jamRole === 'host' && ablyChannelRef.current) {
          ablyChannelRef.current.publish('sync', { type: 'ROOM_CLOSED', senderId: clientIdRef.current });
      }
      if (ablyChannelRef.current) ablyChannelRef.current.presence.leave();
      if (ablyClientRef.current) ablyClientRef.current.close();
      
      ablyClientRef.current = null;
      ablyChannelRef.current = null;
      setJamStatus('disconnected');
      setJamRole(null);
      setJamRoomId(null);
      setJamParticipants([]);
      setJamLogs([]);
      setJamChatMessages([]);
      localStorage.removeItem(JAM_STORAGE_KEY);
      setShowJamMenu(false);
  };

  const assignRole = (targetClientId: string, newRole: string) => {
      if (jamRole !== 'host') return;
      ablyChannelRef.current.publish('role_assign', { targetClientId, newRole });
      if (newRole === 'host') {
          setJamRole('admin');
          ablyChannelRef.current.presence.update({
              clientId: clientIdRef.current,
              name: jamName,
              avatar: jamAvatar,
              role: 'admin'
          });
      }
  };

  const kickUser = (targetClientId: string) => {
      if (jamRole !== 'host') return;
      ablyChannelRef.current.publish('kick_user', { targetClientId });
  };

  const sendChat = (text: string) => {
      if (!text.trim() || !ablyChannelRef.current) return;
      ablyChannelRef.current.publish('chat_msg', {
          id: Date.now(),
          sender: jamName || 'Anonymous',
          avatar: jamAvatar,
          text: text.trim(),
          role: jamRole
      });
      setJamChatInput("");
  };

  const toggleChat = () => {
      const newState = !isChatEnabled;
      setIsChatEnabled(newState);
      if (ablyChannelRef.current) {
          ablyChannelRef.current.publish('chat_config', { enabled: newState });
      }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setJamName(e.target.value);
      localStorage.setItem('jam_name', e.target.value);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const size = 150;
                  canvas.width = size; canvas.height = size;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      const minDim = Math.min(img.width, img.height);
                      const sx = (img.width - minDim) / 2;
                      const sy = (img.height - minDim) / 2;
                      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
                      const base64 = canvas.toDataURL('image/jpeg', 0.8);
                      setJamAvatar(base64);
                      localStorage.setItem('jam_avatar', base64);
                  }
              };
              img.src = ev.target?.result as string;
          };
          reader.readAsDataURL(file);
      }
  };

  // Re-establish session if within 5 hours
  useEffect(() => {
      const session = localStorage.getItem(JAM_STORAGE_KEY);
      if (session) {
          try {
              const { roomId, role, name, timestamp } = JSON.parse(session);
              if (roomId && role && timestamp && (Date.now() - timestamp < 5 * 60 * 60 * 1000)) {
                  setJamRoomId(roomId);
                  setJamRole(role);
                  setJamName(name || '');
                  connectToAbly(roomId, role, name || '');
              } else {
                  localStorage.removeItem(JAM_STORAGE_KEY);
              }
          } catch (e) {}
      }
  }, []);

  const customSmoothScroll = useCallback((container: HTMLElement, targetPos: number, duration: number) => {
      if ((container as any)._scrollRaf) cancelAnimationFrame((container as any)._scrollRaf);
      const startPos = container.scrollTop;
      const distance = targetPos - startPos;
      let startTime: number | null = null;
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const animation = (currentTime: number) => {
          if (startTime === null) startTime = currentTime;
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          container.scrollTop = startPos + distance * easeInOutCubic(progress);
          if (elapsed < duration) (container as any)._scrollRaf = requestAnimationFrame(animation);
      };
      (container as any)._scrollRaf = requestAnimationFrame(animation);
  },[]);

  const closeMainPlayer = useCallback(() => {
    setIsExpanded(false);
    setShowQueue(false);
    setShowSettingsMenu(false);
    setShowTimerMenu(false);
  },[]);

  const openMainPlayer = () => {
      if (!isExpanded) { 
          setIsExpanded(true); setShowQueue(false); setShowSettingsMenu(false); setShowTimerMenu(false);
      }
  };
  
  const openSettings = (e: React.MouseEvent) => { e.stopPropagation(); setShowSettingsMenu(true); };
  const openQueue = () => { setShowQueue(true); };
  const openTimer = () => { setShowTimerMenu(true); };
  const closePlayerForNavigation = () => { closeMainPlayer(); };

  useEffect(() => {
      let isCurrent = true;
      const setupAudio = async () => {
          if (!audioRef.current || !audioUrl) return;
          if (audioUrl.includes('.m3u8')) {
              try {
                  const Hls = await loadHlsJS();
                  if (Hls.isSupported()) {
                      if (hlsRef.current) hlsRef.current.destroy();
                      const hls = new Hls();
                      hls.loadSource(audioUrl);
                      hls.attachMedia(audioRef.current);
                      hlsRef.current = hls;
                      if (isPlaying && !isVideoMode) {
                          const p = audioRef.current.play();
                          if (p !== undefined) p.catch(() => setJamPlayBlocked(true));
                      }
                  } else if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                      audioRef.current.src = audioUrl;
                      if (isPlaying && !isVideoMode) {
                          audioRef.current.play().catch(()=>setJamPlayBlocked(true));
                      }
                  }
              } catch(e) {}
          } else {
              if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
              audioRef.current.src = audioUrl;
              if (isPlaying && !isVideoMode) {
                  audioRef.current.play().catch(()=>setJamPlayBlocked(true));
              }
          }
      };
      if (isCurrent) setupAudio();
      return () => { isCurrent = false; };
  },[audioUrl]);

  const handleShareSong = async () => {
    setShowSettingsMenu(false); 
    try {
      const songTitleSlug = decodeEntities(displayTitle).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const sId = currentSong.track_id || currentSong.id || currentSong.entity_id || '';
      const shareUrl = `https://ayushgaana.vercel.app/play/song/${songTitleSlug}/${sId}`;

      if (navigator.share) {
        try { await navigator.share({ url: shareUrl }); } 
        catch(e) { await navigator.clipboard.writeText(shareUrl); alert("Link copied to clipboard!"); }
      } else { 
        await navigator.clipboard.writeText(shareUrl); alert("Link copied to clipboard!"); 
      }
    } catch (e) { console.error("Error sharing:", e); }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isVideoModeRef.current) {
        setIsVideoMode(false);
        if (audioRef.current) {
           audioRef.current.currentTime = videoStartTimeRef.current; 
           const playPromise = audioRef.current.play();
           if (playPromise !== undefined) playPromise.catch(()=>{});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  },[]);

  useEffect(() => {
    let interval: any;
    if (typeof sleepTimer === 'number' && sleepTimer > 0) {
        setTimerRemaining(sleepTimer * 60);
        interval = setInterval(() => {
            setTimerRemaining(prev => {
                if (prev !== null && prev <= 1) { setIsPlaying(false); setSleepTimer(null); if (audioRef.current) audioRef.current.pause(); return null; }
                return prev ? prev - 1 : null;
            });
        }, 1000);
    } else setTimerRemaining(null);
    return () => clearInterval(interval);
  },[sleepTimer]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
       const q = localStorage.getItem('audio_quality'); if (q) setSelectedQuality(q);
       const lf = localStorage.getItem('line_font_size'); if (lf) setLineFontSize(lf);
       const cf = localStorage.getItem('card_font_size'); if (cf) setCardFontSize(cf);
       const c = localStorage.getItem('canvas_enabled'); if (c !== null) { setIsCanvasEnabled(c === 'true'); isCanvasEnabledRef.current = c === 'true'; }
       const l = localStorage.getItem('lyrics_enabled'); if (l !== null) { setIsLyricsEnabled(l === 'true'); isLyricsEnabledRef.current = l === 'true'; }
       const ws = localStorage.getItem('word_sync_enabled'); if (ws !== null) setIsWordSyncEnabled(ws === 'true');
       const mws = localStorage.getItem('mini_word_sync_enabled'); if (mws !== null) setIsMiniWordSyncEnabled(mws === 'true');
       const lsr = localStorage.getItem('lyrics_server'); if (lsr !== null) setLyricsServer(lsr);

       const storedSong = localStorage.getItem('last_session_song');
       if (storedSong && !currentSong && !isSessionRestored) {
          try {
             const parsed = JSON.parse(storedSong);
             const storedQueue = localStorage.getItem('last_session_queue');
             if (storedQueue) setUpcomingQueue(JSON.parse(storedQueue));
             setCurrentSong(parsed); setIsPlaying(false); setIsSessionRestored(true);
             const storedTime = localStorage.getItem('last_session_time');
             if (storedTime) restoreTimeRef.current = parseFloat(storedTime);
          } catch(e) {}
       } else setIsSessionRestored(true);
    }
  },[currentSong, isSessionRestored, setCurrentSong, setUpcomingQueue]);

  useEffect(() => { isCanvasEnabledRef.current = isCanvasEnabled; },[isCanvasEnabled]);
  useEffect(() => { isLyricsEnabledRef.current = isLyricsEnabled; if (!isLyricsEnabled) setIsLyricsFullScreen(false); },[isLyricsEnabled]);
  useEffect(() => { if (currentSong) localStorage.setItem('last_session_song', JSON.stringify(currentSong)); },[currentSong]);
  useEffect(() => { if (upcomingQueue && upcomingQueue.length > 0) localStorage.setItem('last_session_queue', JSON.stringify(upcomingQueue)); },[upcomingQueue]);
  
  useEffect(() => { 
      setIsCanvasLoaded(false); 
  }, [canvasData?.canvasUrl]);

  const rawTitle = currentSong ? decodeEntities(currentSong.track_title || currentSong.title || currentSong.name || "Unknown") : "";
  const rawArtists = currentSong ? decodeEntities(getArtistsText(currentSong)) : "";
  const rawImage = currentSong ? getImageUrl(currentSong) : "";

  const displayTitle = songDetails?.track_title ? decodeEntities(songDetails.track_title) : rawTitle;
  const displayArtists = songDetails ? decodeEntities(getArtistsText(songDetails)) : rawArtists;
  const displayImage = songDetails?.artwork_large ? getImageUrl(songDetails) : rawImage;
  
  const updateTop30Cache = useCallback((song: any, maxPercent: number) => {
    if (!song) return;
    try {
      let top30 = JSON.parse(localStorage.getItem('top_30_songs') || '[]');
      const songId = song.id || song.track_id;
      const existingIdx = top30.findIndex((s: any) => (s.id || s.track_id) === songId);
      if (existingIdx !== -1) { if (maxPercent > top30[existingIdx].maxListenPercent) top30[existingIdx].maxListenPercent = maxPercent; } 
      else top30.push({ ...song, maxListenPercent: maxPercent });
      top30.sort((a: any, b: any) => b.maxListenPercent - a.maxListenPercent);
      if (top30.length > 30) top30 = top30.slice(0, 30);
      localStorage.setItem('top_30_songs', JSON.stringify(top30));
    } catch (e) {}
  },[]);

  const prefetchVideoId = async (songTitle: string, songArtists: string) => {
    try {
      const query = `${songTitle} ${songArtists.split(',').slice(0, 2).join(' ')} official music video`;
      let cachedVid = await getCache(`vid_id_${query}`);
      if (cachedVid) { prefetchedYtIdRef.current = cachedVid; return cachedVid; }

      const data = await fetchJina(`https://ayushvid.vercel.app/api?q=${encodeURIComponent(query)}`, { referrerPolicy: "no-referrer" });
      if (data?.top_result?.videoId) { 
        prefetchedYtIdRef.current = data.top_result.videoId;
        await setCache(`vid_id_${query}`, data.top_result.videoId);
        return data.top_result.videoId; 
      }
    } catch (err: any) {}
    return null;
  };

  useEffect(() => {
    if (streamBaseUrl) {
        const targetQ = selectedQuality === "16" ? "16" : selectedQuality === "64" ? "64" : selectedQuality === "320" ? "320" : "128";
        const finalUrl = streamBaseUrl.replace(/\/(\d+)\.mp4\.master\.m3u8/, `/${targetQ}.mp4.master.m3u8`);
        setAudioUrl(finalUrl);
    }
  },[streamBaseUrl, selectedQuality]);

  useEffect(() => {
    if (!currentSong) return;
    songStartTrackingRef.current = Date.now();
    
    // IF THIS SONG CHANGE IS TRIGGERED BY A SYNC EVENT:
    if (isSystemSongChangeRef.current) {
        isSystemSongChangeRef.current = false;
        currentTrackRef.current = currentSong;
        
        setIsCanvasLoaded(false); 
        setIsUiHidden(false);     
        
        return; // SKIP LOCAL FETCHING AND PURGING - SYNC ALREADY HANDLED IT
    }

    // Normal Guest protection - block local navigation unless via sync
    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') {
        setCurrentSong(currentTrackRef.current); // Revert
        return;
    }

    let isCurrent = true;
    const trackId = currentSong.track_id || currentSong.id || currentSong.entity_id;
    
    if (lastFetchedTrackIdRef.current === trackId) {
        currentTrackRef.current = currentSong;
        return;
    }
    lastFetchedTrackIdRef.current = trackId;

    const abortController = new AbortController();
    const signal = abortController.signal;

    fetchingRecsRef.current = false;
    mediaMetadataSetRef.current = false;
    hasCachedCurrentSongRef.current = false;

    if (currentTrackRef.current && (currentTrackRef.current.id || currentTrackRef.current.track_id) !== trackId) {
      updateTop30Cache(currentTrackRef.current, maxListenRef.current);
      if (!isNavigatingBackRef.current) {
          const trackToSave = { ...currentTrackRef.current, prefetchedYtId: ytVideoId || currentTrackRef.current.prefetchedYtId };
          setHistoryQueue(prev => {
            const newHist =[trackToSave, ...prev].filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => (t.id||t.track_id) === (v.id||v.track_id)) === i);
            const sliced = newHist.slice(0, 20); localStorage.setItem('recent_songs', JSON.stringify(sliced)); return sliced;
          });
      }
      isNavigatingBackRef.current = false;
    }
    currentTrackRef.current = currentSong; maxListenRef.current = 0;
    
    setYtVideoId(currentSong.ytVideoId || null);
    setSpotifyId(null); setSpotifyUrl(null); setLyrics([]); setSyncType(null); setCanvasData(null);
    setIsCanvasLoaded(false); setActiveLyricIndex(-1); setIsScrolledPastMain(false); setIsUiHidden(false);
    setSongDetails(null); prefetchedYtIdRef.current = currentSong.ytVideoId || null; setIsLyricsFullScreen(false);
    iframeInitialTimeRef.current = 0;
    setStreamBaseUrl(null);
    setBuffered(0);

    let sDetails: any = null;
    let skipSpotifyLyrics = false;

    const fetchStreamTask = async () => {
        setIsStreamLoading(true);
        try {
            let streamJson = await getCache(`gaana_stream_${trackId}`);
            if (!streamJson) {
                const streamRes = await fetchProtected(`https://gaanaayush.vercel.app/api/stream/${trackId}`, { referrerPolicy: "no-referrer", signal });
                if (streamRes.ok) {
                    streamJson = await streamRes.json();
                    if (streamJson?.data) await setCache(`gaana_stream_${trackId}`, streamJson);
                    else await setCache(`gaana_stream_${trackId}`, { notFound: true });
                }
            }
            if (!isCurrent || signal.aborted || streamJson?.notFound) return;
            if (streamJson?.data?.hlsUrl) setStreamBaseUrl(streamJson.data.hlsUrl);
            else if (streamJson?.data?.url) setAudioUrl(streamJson.data.url);
        } catch (e: any) { } finally {
            setIsStreamLoading(false);
        }
    };

    const fetchInfoTask = async () => {
        try {
            let infoJson = await getCache(`gaana_info_${trackId}`);
            if (!infoJson) {
                const infoRes = await fetchProtected(`https://gaanaayush.wonder945177.workers.dev/api/superserch/track/info?track_id=${trackId}`, { referrerPolicy: "no-referrer", signal });
                if (infoRes.ok) {
                    infoJson = await infoRes.json();
                    if (infoJson?.data) await setCache(`gaana_info_${trackId}`, infoJson);
                    else await setCache(`gaana_info_${trackId}`, { notFound: true });
                }
            }
            if (infoJson?.data && isCurrent && !signal.aborted) { 
                sDetails = infoJson.data; 
                setSongDetails(infoJson.data); 
            }

            const currentLyricsServer = localStorage.getItem('lyrics_server') || "Spotify"; 
            if (currentLyricsServer === "Gaana" && !signal.aborted) {
                let lrcJson = await getCache(`gaana_lrc_${trackId}`);
                if (!lrcJson) {
                    const lrcRes = await fetchProtected(`https://gaanaayush.vercel.app/api/lrc?id=${trackId}`, { referrerPolicy: "no-referrer", signal });
                    if (lrcRes.ok) {
                        lrcJson = await lrcRes.json();
                        if (lrcJson?.data) await setCache(`gaana_lrc_${trackId}`, lrcJson);
                        else await setCache(`gaana_lrc_${trackId}`, { notFound: true });
                    }
                }
                if (lrcJson?.data?.lyrics && isCurrent && !signal.aborted) {
                    const parsed: any[] =[];
                    lrcJson.data.lyrics.split('\n').forEach((line: string) => {
                        const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
                        if (match && match[3].trim()) parsed.push({ time: parseInt(match[1]) * 60 + parseFloat(match[2]), words: match[3].trim() });
                    });
                    if (parsed.length > 0) {
                        setLyrics(parsed);
                        setSyncType("LINE_SYNCED");
                        skipSpotifyLyrics = true;
                    }
                }
            }
        } catch (e: any) { }
    };

    const triggerSpotifyFallback = async (songData: any, skipLyrics: boolean = false) => {
       const cacheKey = `spotify_match_ak47_${trackId}`;
       let cachedMatch = await getCache(cacheKey);

       const execExtras = async (sId: string, sUrl: string) => {
           if (!isCurrent || signal.aborted) return;
           setSpotifyId(sId); setSpotifyUrl(sUrl);
           
           if (!isCanvasEnabledRef.current && (!isLyricsEnabledRef.current || skipLyrics)) return;
           
           try {
               let dataJson = await getCache(`spotify_data_${sId}`);
               if (!dataJson) {
                   dataJson = await fetchJina(`https://ayush-gamma-coral.vercel.app/api/data?trackId=${sId}`, { referrerPolicy: "no-referrer", signal });
                   if (dataJson && dataJson.success) await setCache(`spotify_data_${sId}`, dataJson);
                   else dataJson = { notFound: true };
               }
               if (isCurrent && dataJson && !dataJson.notFound && !signal.aborted) {
                   if (isCanvasEnabledRef.current && dataJson.data?.canvas?.canvasesList?.length > 0) {
                       setCanvasData(dataJson.data.canvas.canvasesList[0]);
                   }
                   if (isLyricsEnabledRef.current && !skipLyrics && dataJson.data?.lyrics?.lyrics?.lines) {
                       const parsedLyrics = dataJson.data.lyrics.lyrics.lines.map((l: any) => ({
                           time: Number(l.startTimeMs) / 1000,
                           words: l.words
                       }));
                       setLyrics(parsedLyrics);
                       setSyncType(dataJson.data.lyrics.lyrics.syncType);
                   }
               }
           } catch(e) {}
       };

       if (cachedMatch) { 
           if (!cachedMatch.notFound) await execExtras(cachedMatch.id, cachedMatch.url); 
           return; 
       }

       const searchTitle = decodeEntities(songData.track_title || songData.title || songData.name || "Unknown");
       const searchArtistsFull = decodeEntities(getArtistsText(songData));
       const searchArtist = searchArtistsFull ? searchArtistsFull.split(',').slice(0, 3).join(' ') : "";
       const query = `${searchTitle} ${searchArtist}`.trim();

       let matchFound = false;

       try {
           const auth = await getAuthData();
           if (auth && auth.accessToken && !signal.aborted) {
               const authRes = await fetchProtected(`https://ak47ayush.vercel.app/search?q=${encodeURIComponent(query)}&CID=${auth.clientId}&token=${auth.accessToken}&limit=25&offset=0`, { referrerPolicy: "no-referrer", signal });
               if (authRes.ok) {
                   const authJson = await authRes.json();
                   if (authJson && authJson.results && Array.isArray(authJson.results) && authJson.results.length > 0) {
                       const match = performAK47Matching(authJson.results, searchTitle, searchArtist);
                       if (match) {
                          const sId = match.id || match.spotify_url?.split('/track/')[1]?.split('?')[0] || match.external_urls?.spotify?.split('/track/')[1]?.split('?')[0];
                          const sUrl = match.spotify_url || match.external_urls?.spotify || `https://open.spotify.com/track/${sId}`;
                          if (sId) {
                              matchFound = true;
                              await setCache(cacheKey, { id: sId, url: sUrl });
                              await execExtras(sId, sUrl);
                              return;
                          }
                       }
                   }
               }
           }
       } catch (e: any) { }

       if (matchFound || signal.aborted) return;

       let matchData = null;
       const searchUrl = `https://${RAPID_API_HOST}/search?q=${encodeURIComponent(query)}&type=tracks&offset=0&limit=25&numberOfTopResults=5`;
       
       try {
           const response = await fetch(searchUrl, { method: 'GET', headers: { 'x-rapidapi-key': RAPID_KEYS[rapidKeyIdxRef.current], 'x-rapidapi-host': RAPID_API_HOST }, referrerPolicy: "no-referrer", signal });
           if (response.ok) { 
               matchData = await response.json(); 
           } else if ([429, 401, 403].includes(response.status)) {
               rapidKeyIdxRef.current = (rapidKeyIdxRef.current + 1) % RAPID_KEYS.length;
           }
       } catch (e: any) { 
           if (e.name !== 'AbortError') rapidKeyIdxRef.current = (rapidKeyIdxRef.current + 1) % RAPID_KEYS.length; 
       }
       
       if (!isCurrent || signal.aborted) return;

       if (matchData) {
          const match: any = performMatching(matchData, searchTitle, searchArtist);
          if (match) { 
             const newUrl = `https://open.spotify.com/track/${match.id}`;
             await setCache(cacheKey, { id: match.id, url: newUrl });
             await execExtras(match.id, newUrl);
          } else {
             await setCache(cacheKey, { notFound: true });
          }
       } else {
          await setCache(cacheKey, { notFound: true });
       }
    };

    const executeHeavyFetches = async () => {
        const searchTitle = decodeEntities(currentSong.track_title || currentSong.title || currentSong.name || "Unknown");
        const searchArtistsFull = decodeEntities(getArtistsText(currentSong));
        const searchArtist = searchArtistsFull ? searchArtistsFull.split(',').slice(0, 3).join(' ') : "";
        
        // Unleash Fast Parallel Processes
        fetchStreamTask(); 
        fetchInfoTask();
        getAuthData();

        if (isVideoModeRef.current) {
            setIsVideoLoading(true);
            prefetchVideoId(searchTitle, searchArtist).then(vid => {
                if (vid && isCurrent && !signal.aborted) setYtVideoId(vid);
                setIsVideoLoading(false);
            });
        } else {
            prefetchVideoId(searchTitle, searchArtist);
        }

        // Extremely fast 0.5s network clearance block for Vercel functions pacing (No playback block)
        await new Promise(r => setTimeout(r, 500));
        
        if (!isCurrent || signal.aborted) return;
        
        await triggerSpotifyFallback(sDetails || currentSong, skipSpotifyLyrics);
        
        // If Host or Admin, broadcast completion sync
        if ((jamRoleRef.current === 'host' || jamRoleRef.current === 'admin') && jamStatus === 'connected' && ablyChannelRef.current && isCurrent && !signal.aborted) {
            ablyChannelRef.current.publish('sync', {
                type: 'FULL_SYNC',
                senderId: clientIdRef.current,
                payload: {
                    song: currentTrackRef.current,
                    songDetails: songDetailsRef.current,
                    audioUrl: audioUrlRef.current,
                    streamBaseUrl: streamBaseUrlRef.current,
                    lyrics: lyricsRef.current,
                    syncType: syncTypeRef.current,
                    canvasData: canvasDataRef.current,
                    isVideoMode: isVideoModeRef.current,
                    ytVideoId: ytVideoIdRef.current,
                    isPlaying: isPlayingRef.current,
                    time: isVideoModeRef.current ? videoStartTimeRef.current : (audioRef.current?.currentTime || 0),
                    queue: upcomingQueueRef.current,
                    playContext: playContextRef.current
                }
            });
        }
    };

    executeHeavyFetches();

    return () => { 
        isCurrent = false; 
        abortController.abort(); 
    };
  },[currentSong]);

  useEffect(() => {
    if (queue && queue.length > 0) {
      if (queue.length === 1 && (queue[0].id||queue[0].track_id) === (currentSong?.id||currentSong?.track_id)) setUpcomingQueue([]);
      else {
        const idx = queue.findIndex((s: any) => (s.id||s.track_id) === (currentSong?.id||currentSong?.track_id));
        if (idx !== -1) setUpcomingQueue(queue.slice(idx + 1));
      }
    }
  },[queue]); 

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'YTP_TIME' && isVideoMode) {
        videoStartTimeRef.current = e.data.time; 
        if (!isSeekingRef.current && isExpanded) setCurrentTime(e.data.time);
        if (e.data.duration) {
          if (duration !== e.data.duration) setDuration(e.data.duration);
          if (!isSeekingRef.current && isExpanded) setProgress((e.data.time / e.data.duration) * 100);
        } else if (duration > 0 && !isSeekingRef.current && isExpanded) {
           setProgress((e.data.time / duration) * 100);
        }
      } else {
        let stateCode = null;
        if (e.data?.type === 'YTP_STATE') stateCode = e.data.state;
        else if (e.data?.event === 'onStateChange') stateCode = e.data.info;
        
        if (stateCode !== null) {
            if (stateCode === 1 || String(stateCode) === '1') { audioRef.current?.pause(); setIsPlaying(true); } 
            else if (stateCode === 2 || String(stateCode) === '2') { setIsPlaying(false); } 
            else if (stateCode === 0 || String(stateCode) === '0') { setTimeout(() => { playNextRef.current(true); }, 100); }
        } else if (e.data === 'ended' || e.data?.event === 'ended' || e.data?.type === 'ENDED') {
            setTimeout(() => { playNextRef.current(true); }, 100);
        }
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  },[isVideoMode, duration, upcomingQueue, isExpanded]);

  const handlePlayPauseToggle = (e?: any) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') return;

    localActionTimeRef.current = Date.now();
    const newState = !isPlaying;
    setIsPlaying(newState);
    
    if ((jamRoleRef.current === 'host' || jamRoleRef.current === 'admin') && jamStatus === 'connected' && ablyChannelRef.current) {
        ablyChannelRef.current.publish('sync', {
            type: 'STATE',
            senderId: clientIdRef.current,
            isPlaying: newState,
            time: isVideoModeRef.current ? videoStartTimeRef.current : (audioRef.current?.currentTime || 0),
            isVideoMode: isVideoModeRef.current
        });
    }

    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = newState ? 'playing' : 'paused';
    
    if (isVideoMode && videoIframeRef.current?.contentWindow) {
      videoIframeRef.current.contentWindow.postMessage({ type: newState ? 'MUSIC_PLAY' : 'MUSIC_PAUSE' }, '*');
    } else {
      if (newState) {
        const playPromise = audioRef.current?.play();
        if (playPromise !== undefined) playPromise.catch(()=>setJamPlayBlocked(true));
      } else audioRef.current?.pause();
    }
  };

  const toggleVideoMode = async (e?: React.MouseEvent) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') return;
    
    localActionTimeRef.current = Date.now();

    if (isVideoMode) {
      setIsVideoMode(false);
      if (audioRef.current) { 
        const audioDur = audioRef.current.duration || 0; setDuration(audioDur);
        const safeTime = (audioDur > 0 && currentTime > audioDur) ? audioDur - 2 : currentTime;
        audioRef.current.currentTime = safeTime; setCurrentTime(safeTime);
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) playPromise.catch(()=>setJamPlayBlocked(true));
        setIsPlaying(true);
      }
      setTimeout(() => broadcastFullSync(), 500); // Broadcast state change immediately
      return;
    }
    iframeInitialTimeRef.current = Math.floor(currentTime);
    if (prefetchedYtIdRef.current) {
      setYtVideoId(prefetchedYtIdRef.current); setIsVideoMode(true);
      if (audioRef.current) audioRef.current.pause(); setIsPlaying(false); 
      setTimeout(() => broadcastFullSync(), 500);
      return;
    }
    
    setIsVideoLoading(true);
    if (audioRef.current) audioRef.current.pause(); setIsPlaying(false);
    const newVid = await prefetchVideoId(displayTitle, displayArtists); 
    if (newVid) { setYtVideoId(newVid); setIsVideoMode(true); } 
    else if (audioRef.current) { audioRef.current.play().catch(()=>setJamPlayBlocked(true)); setIsPlaying(true); }
    setIsVideoLoading(false);
    
    setTimeout(() => broadcastFullSync(), 500); // Force sync network
  };

  useEffect(() => {
    if (!displayImage || displayImage.includes('via.placeholder.com')) {
      setDominantColor("rgb(83, 83, 83)"); return;
    }
    const img = new Image(); img.crossOrigin = "Anonymous"; 
    img.src = `https://wsrv.nl/?url=${encodeURIComponent(displayImage)}&w=50&h=50&output=jpg`;
    img.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 50; canvas.height = 50; 
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.drawImage(img, 0, 0, 50, 50);
      try {
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
          if (brightness > 30 && brightness < 210) { r += data[i]; g += data[i+1]; b += data[i+2]; count++; }
        }
        setDominantColor(count > 0 ? `rgb(${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)})` : "rgb(83, 83, 83)");
      } catch (e) { setDominantColor("rgb(30, 30, 30)"); }
    };
  },[displayImage]);

  useEffect(() => {
    if (audioRef.current && audioUrl && !audioUrl.includes('.m3u8')) {
      audioRef.current.volume = volume / 100;
    }
  },[isPlaying, audioUrl, volume, isVideoMode]);

  useEffect(() => {
    let timeoutId: any;
    const video = canvasVideoRef.current;
    if (!video) return;

    const shouldPlay = isPlaying && !isScrolledPastMain && isExpanded && !showQueue && !isVideoMode && !isLyricsFullScreen && isCanvasEnabled;
    if (shouldPlay) { if (video.paused) { timeoutId = setTimeout(() => { video.play().catch(() => {}); }, 150); } } 
    else { if (!video.paused) { video.pause(); } }
    return () => clearTimeout(timeoutId);
  },[isPlaying, isScrolledPastMain, isCanvasLoaded, isExpanded, showQueue, isVideoMode, isLyricsFullScreen, isCanvasEnabled, canvasData]);

  const playNext = (e?: any) => {
    const isAutoPlay = e === true; // Detect if called via automated onEnded event
    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') return;
    
    // Prevent Admin from auto-forcing the next song if it finishes; let the Host drive the timeline!
    if (isAutoPlay && jamRoleRef.current === 'admin' && jamStatus === 'connected') return;

    localActionTimeRef.current = Date.now();

    if (sleepTimer === 'end') { setIsPlaying(false); setSleepTimer(null); if (audioRef.current) audioRef.current.pause(); return; }
    if (isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*');
    
    if (repeatMode === 2 && audioRef.current) { 
      audioRef.current.currentTime = 0; setRepeatMode(0); const p = audioRef.current.play(); if (p!==undefined) p.catch(()=>setJamPlayBlocked(true)); return; 
    }
    if (isShuffle && upcomingQueue.length > 0) {
      const randomIdx = Math.floor(Math.random() * upcomingQueue.length); const nextSong = upcomingQueue[randomIdx];
      setUpcomingQueue(prev => prev.filter((_, i) => i !== randomIdx));
      setCurrentSong(nextSong); setIsPlaying(true); return;
    }
    if (upcomingQueue.length > 0) { 
      const nextSong = upcomingQueue[0]; setUpcomingQueue(prev => prev.slice(1)); setCurrentSong(nextSong); setIsPlaying(true); 
    } else if (repeatMode === 1 && queue && queue.length > 0) { 
      setCurrentSong(queue[0]); setIsPlaying(true); 
    } else { setIsPlaying(false); setProgress(0); }
  };

  const playPrev = () => {
    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') return;
    
    localActionTimeRef.current = Date.now();

    if (isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*');
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    if (historyQueue.length > 0) {
      isNavigatingBackRef.current = true;
      const prevSong = historyQueue[0]; setHistoryQueue(prev => prev.slice(1)); setUpcomingQueue(prev =>[currentSong, ...prev]);
      setCurrentSong(prevSong); setIsPlaying(true);
    } else {
      if (!queue || queue.length === 0) return;
      const idx = queue.findIndex((s: any) => (s.id||s.track_id) === (currentSong.id||currentSong.track_id));
      if (idx > 0) { isNavigatingBackRef.current = true; setCurrentSong(queue[idx - 1]); setIsPlaying(true); }
    }
  };

  useEffect(() => { playNextRef.current = playNext; playPrevRef.current = playPrev; isVideoModeRef.current = isVideoMode; },[playNext, playPrev, isVideoMode]);

  const syncPosition = useCallback(() => {
    if ('mediaSession' in navigator && audioRef.current) {
      const d = audioRef.current.duration; const c = audioRef.current.currentTime;
      if (d > 0 && c >= 0 && c <= d && !isNaN(d) && !isNaN(c)) {
        try { navigator.mediaSession.setPositionState({ duration: d, playbackRate: audioRef.current.playbackRate || 1, position: c }); } catch(e) {}
      }
    }
  },[]);

  useEffect(() => {
    if ('mediaSession' in navigator && displayTitle) {
       try {
           navigator.mediaSession.metadata = new MediaMetadata({ title: displayTitle, artist: displayArtists, album: playContext?.name || 'App', artwork: displayImage ?[{ src: displayImage, sizes: '512x512', type: 'image/jpeg' }] :[] });
       } catch (e) {}
       
       navigator.mediaSession.setActionHandler('play', () => {
          setIsPlaying(true); navigator.mediaSession.playbackState = 'playing';
          if (isVideoModeRef.current && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_PLAY' }, '*');
          else if (audioRef.current) { const p = audioRef.current.play(); if (p !== undefined) p.catch(()=>setJamPlayBlocked(true)); }
       });
       navigator.mediaSession.setActionHandler('pause', () => {
          setIsPlaying(false); navigator.mediaSession.playbackState = 'paused';
          if (isVideoModeRef.current && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_PAUSE' }, '*');
          else if (audioRef.current) audioRef.current.pause();
       });
       navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current());
       navigator.mediaSession.setActionHandler('nexttrack', () => playNextRef.current());
       navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && audioRef.current) { audioRef.current.currentTime = details.seekTime; setCurrentTime(details.seekTime); syncPosition(); }
       });
    }
  },[displayTitle, displayArtists, displayImage, playContext, currentSong]);

  useEffect(() => { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'; },[isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isVideoMode) {
      const c = audioRef.current.currentTime; const d = audioRef.current.duration;
      
      if (audioRef.current.buffered.length > 0 && d > 0) {
         const bufferedEnd = audioRef.current.buffered.end(audioRef.current.buffered.length - 1);
         setBuffered((bufferedEnd / d) * 100);
      }

      const now = Date.now();
      if (!isSeekingRef.current && now - lastTimeUpdateRef.current < 250) {
         if (isLyricsEnabled && syncType === "LINE_SYNCED" && lyrics.length > 0 && isExpanded) {
            let activeIdx = -1;
            const offsetTime = c + 0.4;
            for (let i = 0; i < lyrics.length; i++) { if (lyrics[i].time <= offsetTime) activeIdx = i; else break; }
            if (activeIdx !== activeLyricIndex) setActiveLyricIndex(activeIdx);
         }
         return; 
      }
      lastTimeUpdateRef.current = now;
      
      setCurrentTime(c); setDuration(d || 0);
      
      if (d > 0 && !isSeekingRef.current && isExpanded) {
        const currentPercent = (c / d) * 100;
        setProgress(currentPercent);
        if (currentPercent > maxListenRef.current) maxListenRef.current = currentPercent;

        if (currentPercent >= 98 && !hasCachedCurrentSongRef.current && audioUrl && !audioUrl.startsWith('blob:') && !audioUrl.includes('.m3u8')) {
            hasCachedCurrentSongRef.current = true;
            (async () => {
                try {
                    const audioRes = await fetch(audioUrl, { referrerPolicy: "no-referrer" });
                    if (audioRes.ok) {
                        const blob = await audioRes.blob();
                        await setCache(`audio_${currentSong.id||currentSong.track_id}_${selectedQuality}`, blob, true);
                    }
                } catch(e) {}
            })();
        }
      }

      if (c > 0 && Math.abs(c - (parseFloat(localStorage.getItem('last_session_time')||'0'))) > 2) localStorage.setItem('last_session_time', c.toString());

      if (isLyricsEnabled && syncType === "LINE_SYNCED" && lyrics.length > 0 && !isSeekingRef.current) {
        let activeIdx = -1;
        const offsetTime = c + 0.4; 
        for (let i = 0; i < lyrics.length; i++) { if (lyrics[i].time <= offsetTime) activeIdx = i; else break; }
        if (activeIdx !== activeLyricIndex) setActiveLyricIndex(activeIdx);
      }
    }
  };

  useEffect(() => {
    if (!isWordSyncEnabled || !isLyricsEnabled || isVideoMode || activeLyricIndex < 0 || !lyrics[activeLyricIndex] || !isExpanded) return;
    let animationFrameId: number;
    const updateProgress = () => {
        if (audioRef.current) {
            const currentTime = audioRef.current.currentTime + 0.4;
            const currentLineTime = lyrics[activeLyricIndex].time;
            let nextLineTime = lyrics[activeLyricIndex + 1]?.time || currentLineTime + 4;
            const duration = nextLineTime - currentLineTime;
            const elapsed = currentTime - currentLineTime;
            const rawProgress = duration > 0 ? (elapsed / duration) * 100 : 100;
            const boundedProgress = Math.max(0, Math.min(100, rawProgress));

            const processContainer = (container: HTMLElement | null, selector: string, activeSyncEnabled: boolean) => {
                if (!container || !activeSyncEnabled) return;
                const words = container.querySelectorAll(selector) as NodeListOf<HTMLElement>;
                if (!words.length) return;
                
                let totalChars = 0;
                if (container.dataset.activeIdx !== activeLyricIndex.toString()) {
                    words.forEach(w => totalChars += (w.textContent || '').length);
                    container.dataset.totalChars = totalChars.toString();
                    container.dataset.activeIdx = activeLyricIndex.toString();
                } else totalChars = parseInt(container.dataset.totalChars || '0', 10);
                
                if (totalChars === 0) return;
                
                let charAccumulator = 0;
                words.forEach((wordNode: any) => {
                    const wordLen = (wordNode.textContent || '').length;
                    const wordStartPct = (charAccumulator / totalChars) * 100;
                    const wordEndPct = ((charAccumulator + wordLen) / totalChars) * 100;

                    if (boundedProgress >= wordEndPct) {
                        if (wordNode._lastProg !== 120) { wordNode._lastProg = 120; wordNode.style.setProperty('--p', '120%'); }
                    } else if (boundedProgress <= wordStartPct) {
                        if (wordNode._lastProg !== -15) { wordNode._lastProg = -15; wordNode.style.setProperty('--p', '-15%'); }
                    } else {
                        const localProgress = ((boundedProgress - wordStartPct) / (wordEndPct - wordStartPct)) * 120;
                        if (Math.abs((wordNode._lastProg || 0) - localProgress) > 1.0) {
                            wordNode._lastProg = localProgress; wordNode.style.setProperty('--p', `${localProgress.toFixed(1)}%`);
                        }
                    }
                    charAccumulator += wordLen;
                });
            };

            processContainer(fullActiveLyricRef.current, '.lyric-word-sync', isWordSyncEnabled);
            processContainer(activeLyricRef.current, '.lyric-word-sync', isWordSyncEnabled);
            processContainer(miniActiveLyricRef.current, '.lyric-word-sync', isMiniWordSyncEnabled);
        }
        if (isPlaying && isExpanded) animationFrameId = requestAnimationFrame(updateProgress);
    };

    if (isPlaying && isExpanded) animationFrameId = requestAnimationFrame(updateProgress);
    else updateProgress(); 

    return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); };
  },[isWordSyncEnabled, isMiniWordSyncEnabled, isLyricsEnabled, isVideoMode, activeLyricIndex, lyrics, isPlaying, isExpanded]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrolled = e.currentTarget.scrollTop > 100;
    if (scrolled !== isScrolledPastMain) setIsScrolledPastMain(scrolled);
  },[isScrolledPastMain]);

  useEffect(() => {
    if (isSeekingRef.current || !isExpanded) return; 
    if (activeLyricRef.current && lyricsContainerRef.current) customSmoothScroll(lyricsContainerRef.current, activeLyricRef.current.offsetTop - lyricsContainerRef.current.offsetTop - 20, 800);
    if (fullActiveLyricRef.current && fullLyricsContainerRef.current) customSmoothScroll(fullLyricsContainerRef.current, fullActiveLyricRef.current.offsetTop - fullLyricsContainerRef.current.offsetTop - (fullLyricsContainerRef.current.clientHeight / 2) + 60, 800);
  },[activeLyricIndex, isLyricsFullScreen, isExpanded, customSmoothScroll]);

  const handleLyricClick = (time: number) => {
    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') return;
    localActionTimeRef.current = Date.now();
    
    if (isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_SEEK', time: time }, '*');
    else if (audioRef.current && duration > 0) { audioRef.current.currentTime = time; setCurrentTime(time); syncPosition(); }
    
    if ((jamRoleRef.current === 'host' || jamRoleRef.current === 'admin') && jamStatus === 'connected' && ablyChannelRef.current) {
        ablyChannelRef.current.publish('sync', { type: 'TIME', senderId: clientIdRef.current, time: time, isVideoMode: isVideoModeRef.current });
    }
  };

  const handleSeekStart = (e?: any) => { 
    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') { if (e?.preventDefault) e.preventDefault(); return; }
    isSeekingRef.current = true; 
  };
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') return;
    const val = parseFloat(e.target.value); setProgress(val);
    const newTime = (val / 100) * duration; setCurrentTime(newTime);
    if (isLyricsEnabled && syncType === "LINE_SYNCED" && lyrics.length > 0) {
      let activeIdx = -1;
      const offsetTime = newTime + 0.4; 
      for (let i = 0; i < lyrics.length; i++) { if (lyrics[i].time <= offsetTime) activeIdx = i; else break; }
      if (activeIdx !== activeLyricIndex) setActiveLyricIndex(activeIdx);
    }
  };

  const handleSeekEnd = (e: React.SyntheticEvent<HTMLInputElement>) => {
    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') return;
    isSeekingRef.current = false;
    localActionTimeRef.current = Date.now();
    const val = parseFloat(e.currentTarget.value); const newTime = (val / 100) * duration;
    
    if ((jamRoleRef.current === 'host' || jamRoleRef.current === 'admin') && jamStatus === 'connected' && ablyChannelRef.current) {
        ablyChannelRef.current.publish('sync', { type: 'TIME', senderId: clientIdRef.current, time: newTime, isVideoMode: isVideoModeRef.current });
    }

    if (isVideoMode && videoIframeRef.current?.contentWindow) {
      videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_SEEK', time: newTime }, '*');
      videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*');
    } else if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = newTime; syncPosition();
      if (isPlaying) { const p = audioRef.current.play(); if (p !== undefined) p.catch(()=>setJamPlayBlocked(true)); }
    }
  };

  const updateDOM = useCallback(() => {
    if (!queueContainerRef.current) return;
    const { activeIndex, startY, currentY, startScrollTop } = dragRef.current;
    const diff = currentY - startY + (queueContainerRef.current.scrollTop - startScrollTop);
    const targetIndex = Math.max(0, Math.min(upcomingQueue.length - 1, activeIndex + Math.round(diff / 60)));
    dragRef.current.targetIndex = targetIndex;

    const items = queueContainerRef.current.querySelectorAll('.queue-item');
    items.forEach((item: any, i) => {
        if (i === activeIndex) {
            item.style.transform = `translateY(${diff}px) scale(1.02)`;
            item.style.zIndex = '50'; item.style.transition = 'none'; item.style.backgroundColor = 'rgba(255,255,255,0.1)'; item.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
        } else {
            let t = 0;
            if (activeIndex < i && targetIndex >= i) t = -60; else if (activeIndex > i && targetIndex <= i) t = 60;
            item.style.transform = t !== 0 ? `translateY(${t}px)` : 'none';
            item.style.zIndex = '1'; item.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'; item.style.backgroundColor = 'transparent'; item.style.boxShadow = 'none';
        }
    });
  },[upcomingQueue.length]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent, index: number) => {
    if (isQueueEditMode || isGuestLocked) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragRef.current = { activeIndex: index, startY: clientY, currentY: clientY, startScrollTop: queueContainerRef.current?.scrollTop || 0, scrollSpeed: 0, rafId: 0, targetIndex: index };
    setDragActiveIndex(index);
    const scrollLoop = () => {
        if (dragRef.current.scrollSpeed !== 0 && queueContainerRef.current) { queueContainerRef.current.scrollTop += dragRef.current.scrollSpeed; updateDOM(); }
        dragRef.current.rafId = requestAnimationFrame(scrollLoop);
    };
    dragRef.current.rafId = requestAnimationFrame(scrollLoop);
  };

  const handleDragMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (dragRef.current.activeIndex === -1) return;
    e.preventDefault(); 
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    dragRef.current.currentY = clientY;

    if (queueContainerRef.current) {
        const rect = queueContainerRef.current.getBoundingClientRect();
        if (clientY < rect.top + 80) dragRef.current.scrollSpeed = -12; else if (clientY > rect.bottom - 80) dragRef.current.scrollSpeed = 12; else dragRef.current.scrollSpeed = 0;
    }
    updateDOM();
  },[updateDOM]);

  const handleDragEnd = useCallback(() => {
    cancelAnimationFrame(dragRef.current.rafId);
    const { activeIndex, targetIndex } = dragRef.current;
    if (queueContainerRef.current) {
        const items = queueContainerRef.current.querySelectorAll('.queue-item');
        items.forEach((item: any) => { item.style.transform = ''; item.style.zIndex = ''; item.style.transition = ''; item.style.backgroundColor = ''; item.style.boxShadow = ''; });
    }
    if (activeIndex !== -1 && targetIndex !== -1 && activeIndex !== targetIndex) {
      localActionTimeRef.current = Date.now();
      setUpcomingQueue(prev => { 
          const arr =[...prev]; const[moved] = arr.splice(activeIndex, 1); arr.splice(targetIndex, 0, moved); 
          if ((jamRoleRef.current === 'host' || jamRoleRef.current === 'admin') && jamStatus === 'connected' && ablyChannelRef.current) {
              ablyChannelRef.current.publish('sync', { type: 'QUEUE_UPDATE', senderId: clientIdRef.current, payload: { queue: arr } });
          }
          return arr; 
      });
    }
    dragRef.current.activeIndex = -1; setDragActiveIndex(null);
  },[jamStatus]);

  useEffect(() => {
    if (dragActiveIndex !== null) {
       window.addEventListener('touchmove', handleDragMove, { passive: false }); window.addEventListener('touchend', handleDragEnd);
       window.addEventListener('mousemove', handleDragMove); window.addEventListener('mouseup', handleDragEnd);
       return () => { window.removeEventListener('touchmove', handleDragMove); window.removeEventListener('touchend', handleDragEnd); window.removeEventListener('mousemove', handleDragMove); window.removeEventListener('mouseup', handleDragEnd); };
    }
  },[dragActiveIndex, handleDragMove, handleDragEnd]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { 
      const diff = e.touches[0].clientX - touchStartX.current; 
      if (diff > 0 && !isExpanded && !showQueue) setSwipeX(diff); 
  };
  const handleTouchEnd = () => { 
      if (swipeX > window.innerWidth * 0.4 && !isExpanded && !showQueue) { 
          setCurrentSong(null); setIsPlaying(false); closeMainPlayer(); 
      } 
      setSwipeX(0); 
  };

  const executeMp3PackerDownload = async (url: string, quality: string) => {
    setDlState({ type: "music", status: "downloading", progress: 0, packStep: "Fetching Audio..." });
    try {
      await loadLameJS();
      setDlState(prev => ({...prev, packStep: "Downloading Media...", progress: 10}));
      
      const[audioResp, imgResp] = await Promise.all([ fetch(url, { referrerPolicy: "no-referrer" }), fetch(displayImage || "https://via.placeholder.com/500", { referrerPolicy: "no-referrer" }) ]);
      const audioFileBuffer = await audioResp.arrayBuffer();
      const coverBuffer = await imgResp.arrayBuffer();

      setDlState(prev => ({...prev, progress: 30, packStep: "Decoding Audio..."}));
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(audioFileBuffer);

      setDlState(prev => ({...prev, progress: 40, packStep: "Encoding to MP3..."}));
      await new Promise(r => setTimeout(r, 10)); 
      
      const channels = 1; 
      const sampleRate = audioBuffer.sampleRate;
      const kbps = parseInt(quality.replace('kbps','')) || 128;
      const mp3encoder = new (window as any).lamejs.Mp3Encoder(channels, sampleRate, kbps);
      
      let samples = audioBuffer.getChannelData(0); 
      const buffer = new Int16Array(samples.length);
      for (let i = 0, len = samples.length; i < len; i++) { let s = samples[i]; buffer[i] = s < 0 ? s * 32768 : s * 32767; }

      const mp3Data =[];
      const blockSize = 1152 * 500; 
      let lastYield = Date.now();
      
      for (let i = 0; i < buffer.length; i += blockSize) {
          const chunk = buffer.subarray(i, i + blockSize);
          const mp3buf = mp3encoder.encodeBuffer(chunk);
          if (mp3buf.length > 0) mp3Data.push(mp3buf);
          if (Date.now() - lastYield > 250) { 
              setDlState(prev => ({...prev, progress: 40 + Math.floor((i / buffer.length) * 50)}));
              await new Promise(r => setTimeout(r, 0)); lastYield = Date.now();
          }
      }
      const endBuf = mp3encoder.flush();
      if (endBuf.length > 0) mp3Data.push(endBuf);

      const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
      setDlState(prev => ({...prev, progress: 95, packStep: "Injecting Metadata..."}));
      const mp3ArrayBuffer = await mp3Blob.arrayBuffer();

      const cleanTitle = decodeEntities(displayTitle);
      const cleanArtist = decodeEntities(displayArtists);
      const cleanAlbum = decodeEntities(songDetails?.album_title || displayTitle);

      const taggedBuffer = NativeID3.tag({ audio: mp3ArrayBuffer, image: coverBuffer, title: cleanTitle, artist: cleanArtist, album: cleanAlbum });

      setDlState(prev => ({...prev, progress: 100, packStep: "Complete!"}));
      const finalBlob = new Blob([taggedBuffer], { type: 'audio/mp3' });
      const dlUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement('a'); a.href = dlUrl; a.download = `${cleanTitle} - ${cleanArtist}.mp3`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });

    } catch (e) {
      console.warn("Packer failed, using raw fallback", e);
      const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.download = `${decodeEntities(displayTitle)} - ${decodeEntities(displayArtists)}.m4a`; 
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });
    }
  };

  const executeBlobDownload = async (url: string, filename: string, isVideoMux: boolean = false) => {
    try {
      setDlState(prev => ({...prev, status: "downloading", progress: 0, packStep: "Downloading..."}));
      const res = await fetch(url, { referrerPolicy: "no-referrer" });
      const contentLength = res.headers.get('content-length');
      const total = parseInt(contentLength || '0', 10);
      let loaded = 0;
      
      if (!res.body) throw new Error("No body stream");
      const reader = res.body.getReader();
      const chunks =[];
      
      while(true) {
         const {done, value} = await reader.read();
         if (done) break;
         chunks.push(value);
         loaded += value.length;
         if (total) setDlState(prev => ({...prev, progress: Math.round((loaded/total)*100)}));
      }

      if (isVideoMux) { setDlState(prev => ({...prev, status: "merging", packStep: "Merging..."})); await new Promise(r => setTimeout(r, 2800)); }

      const blob = new Blob(chunks);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = decodeEntities(filename);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });
    } catch (e) {
      const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.download = decodeEntities(filename); 
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });
    }
  };

const downloadLrcFile = () => {
    if (!lyrics || lyrics.length === 0 || syncType !== "LINE_SYNCED") return false;

    const cleanTitle = decodeEntities(displayTitle);
    const cleanArtist = decodeEntities(displayArtists);
    const cleanAlbum = decodeEntities(songDetails?.album_title || displayTitle);
    const lenStr = formatTime(duration > 0 ? duration : (Number(songDetails?.duration) || 0));

    let lrcContent = `[ar:${cleanArtist}]\n[al:${cleanAlbum}]\n[ti:${cleanTitle}]\n[au:${cleanArtist}]\n[length:${lenStr}]\n`;

    lyrics.forEach((line: any) => {
        const t = Number(line.time) || 0;
        const [secPart, msPart] = t.toFixed(2).split('.');
        const mins = Math.floor(Number(secPart) / 60).toString().padStart(2, '0');
        const secs = (Number(secPart) % 60).toString().padStart(2, '0');
        
        lrcContent += `[${mins}:${secs}.${msPart}]${line.words || ""}\n`;
    });

    const safeFileName = `${cleanTitle}`.replace(/[/\\:*?<>|]/g, "").trim();
    const finalName = `${safeFileName}.lrc`;

    const data: any[] = [];
    data.push(lrcContent);
    const properties = { type: 'plain/text' }; 
    
    let fileObj;
    try {
        fileObj = new File(data, finalName, properties);
    } catch (e) {
        fileObj = new Blob(data, properties);
    }

    const url = (window.URL || window.webkitURL).createObjectURL(fileObj);
    const a = document.createElement('a');
    
    a.target = '_blank';
    a.download = finalName;
    a.href = url;

    a.click();
    
    setTimeout(() => (window.URL || window.webkitURL).revokeObjectURL(url), 3000);
    return true; 
  };

  const executeApiMusicDownload = (optUrl: string) => {
      setDlState({ type: "music", status: "downloading", progress: 100, packStep: "Starting Download via Server..." });
      try {
          const cleanTitle = encodeURIComponent(decodeEntities(displayTitle));
          const cleanArtist = encodeURIComponent(decodeEntities(displayArtists));
          const cleanAlbum = encodeURIComponent(decodeEntities(songDetails?.album_title || displayTitle));
          const cleanImg = encodeURIComponent(displayImage || "https://via.placeholder.com/500");
          const m3u8Safe = encodeURIComponent(optUrl);

          const composerStr = (songDetails?.composers && songDetails.composers.length > 0) 
              ? songDetails.composers.map((c: any) => c.name).join(", ") 
              : "Ayush Kumar Yadav"; 
          
          const yearStr = songDetails?.release_date ? songDetails.release_date.split("-")[0] : "";
          const genreStr = songDetails?.tags?.[0]?.tag_name || "";

          const cleanComposer = encodeURIComponent(decodeEntities(composerStr));
          const cleanYear = encodeURIComponent(yearStr);
          const cleanGenre = encodeURIComponent(decodeEntities(genreStr));

          const downloadApiUrl = `https://ayushdownload.vercel.app/api/dl?url=${m3u8Safe}&format=mp3&title=${cleanTitle}&artist=${cleanArtist}&album=${cleanAlbum}&imageUrl=${cleanImg}&composer=${cleanComposer}&year=${cleanYear}&genre=${cleanGenre}`;
          const hasLrc = downloadLrcFile();

          const delayTime = hasLrc ? 3000 : 0;

          setTimeout(() => {
              const a = document.createElement("a");
              a.href = downloadApiUrl;
              document.body.appendChild(a); 
              a.click();
              document.body.removeChild(a);

              setTimeout(() => setDlState({ type: null, status: "idle" }), 1500);
          }, delayTime);

      } catch (e) {
          console.error("Download API failed", e);
          setDlState({ type: null, status: "idle" });
      }
  };

  const handleDownloadMusicInit = async () => { 
      setShowSettingsMenu(false);
      let opts: any[] =[];
      const durSecs = duration > 0 ? duration : (Number(songDetails?.duration) || 0);

      if (streamBaseUrl) {['16', '64', '128', '320'].forEach(q => {
              let sizeStr = "";
              if (durSecs > 0) {
                  const bitrate = parseInt(q);
                  const sizeMB = (durSecs * bitrate) / 8 / 1024;
                  sizeStr = `${sizeMB.toFixed(1)}MB`;
              }
              opts.push({ 
                  url: streamBaseUrl.replace(/\/(\d+)\.mp4\.master\.m3u8/, `/${q}.mp4.master.m3u8`), 
                  quality: `${q}kbps`, 
                  label: QUALITY_MAP[q] || `${q}kbps`, 
                  num: parseInt(q),
                  size: sizeStr
              });
          });
      } else if (audioUrl && !audioUrl.includes('.m3u8')) {
          opts.push({ url: audioUrl, quality: `128kbps`, label: `128kbps`, num: 128, size: "" });
      } else {
          try {
             const fetchLink = encodeURIComponent(currentSong.url || currentSong.perma_url || "");
             const res = await fetchProtected(`https://ayushm-psi.vercel.app/api/songs?link=${fetchLink}`, { referrerPolicy: "no-referrer" });
             const json = await res.json();
             if (json.data?.[0]?.downloadUrl) {
                 opts = json.data[0].downloadUrl.map((u:any) => {
                     const numStr = (u.quality || "").replace(/\D/g, '');
                     const qNum = parseInt(numStr) || 128;
                     let sStr = "";
                     if (durSecs > 0 && qNum > 0) {
                         const sizeMB = (durSecs * qNum) / 8 / 1024;
                         sStr = `${sizeMB.toFixed(1)}MB`;
                }
                     return { url: u.url, quality: u.quality, label: u.quality, num: qNum, size: sStr };
                 });
             }
          } catch(e) {}
      }
      setDlState({ type: "music", status: "options", options: opts.sort((a, b) => b.num - a.num) });
  };
  
  const handleDownloadVideoInit = () => { 
      setShowSettingsMenu(false); 
      setDlState({ type: "video", status: "servers" }); 
  };

  const triggerVideoServer = async (serverNum: number) => {
    setDlState({ type: "video", status: "verifying", server: serverNum });
    setTimeout(async () => {
      setDlState(prev => prev.type === "video" ? { ...prev, status: "connecting" } : prev);
      try {
        const targetVid = ytVideoId || await prefetchVideoId(displayTitle, displayArtists);
        if (!targetVid) throw new Error("Video not found");
        const res = await fetchProtected(`https://serverayush.vercel.app/api/cnd?id=${targetVid}&v=${serverNum}`, { referrerPolicy: "no-referrer" });
        const data = await res.json();
        const mixed = data.VideoWithAudio ||[];
        const formatOptions = mixed.map((v:any) => ({ ...v, label: `${v.quality} Video`, isMuxed: true }));
        setDlState({ type: "video", status: "options", options: formatOptions, server: serverNum });
      } catch (e) {
        setDlState({ type: null, status: "idle" });
        setJamError("Failed to connect to video server. Please try again.");
      }
    }, 6000);
  };

  let albumRoute = `/album/${songDetails?.album_id || ''}`;
  if (songDetails?.albumseokey) albumRoute = `/album/${songDetails.albumseokey}`;

  const getCardFontSizeClass = (isFS: boolean) => {
      const s = cardFontSize;
      if (isFS) return s === "Small" ? "text-[28px]" : s === "Large" ? "text-[40px]" : "text-[34px]";
      return s === "Small" ? "text-[20px]" : s === "Large" ? "text-[30px]" : "text-[24px]";
  };

  const getLineFontSize = () => lineFontSize === "Small" ? "text-[14px]" : lineFontSize === "Large" ? "text-[20px]" : "text-[16px]";
  const showTinyBanner = ((isCanvasLoaded && isCanvasEnabled && !isVideoMode && !isLyricsFullScreen && canvasData?.canvasUrl) || isVideoMode || isLyricsFullScreen);

  const songDnaArtists = useMemo(() => {
    if (!songDetails) return[];
    const map = new Map();
    const addRole = (arr: any[], roleName: string) => {
        if (!Array.isArray(arr)) return;
        arr.forEach(artist => {
            if (!artist || !artist.name) return;
            const key = artist.seokey || artist.id || artist.name;
            if (map.has(key)) {
                if (!map.get(key).roles.includes(roleName)) map.get(key).roles.push(roleName);
            } else {
                map.set(key, { ...artist, roles:[roleName] });
            }
        });
    };
    addRole(songDetails.singers, "Singer");
    addRole(songDetails.composers, "Composer");
    addRole(songDetails.lyricist, "Lyricist");
    addRole(songDetails.cast, "Cast");
    return Array.from(map.values());
  }, [songDetails]);

  const RenderedMiniLyrics = useMemo(() => {
    if (!isLyricsEnabled || isLyricsFullScreen || syncType !== "LINE_SYNCED" || lyrics.length === 0 || isVideoMode) return null;
    return (
       <div className="relative w-full h-full flex justify-start items-center">
         {lyrics.map((line: any, idx: number) => {
            const diff = idx - activeLyricIndex;
            if (Math.abs(diff) > 1) return null;
            let transform = '', op = 0;
            if (diff === 0) { transform = 'translateY(0px) scale(1)'; op = 1; }
            else if (diff > 0) { transform = 'translateY(35px) scale(0.9)'; op = 0; } 
            else return null; 
            
            return (
               <div key={idx} ref={diff === 0 ? miniActiveLyricRef : null} className={`absolute left-0 w-full text-left pr-2 no-select-text font-extrabold drop-shadow-xl leading-snug transition-all duration-[1500ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${getLineFontSize()}`} style={{ transform, opacity: op, color: 'white', zIndex: diff === 0 ? 10 : 1, transformOrigin: 'left center' }}>
                 {isMiniWordSyncEnabled ? (line.words || "♪").split(' ').map((word: string, wIdx: number, arr: any[]) => <span key={wIdx} className="lyric-word-sync inline-block">{word}{wIdx < arr.length - 1 ? '\u00A0' : ''}</span>) : (line.words || "♪")}
               </div>
            );
         })}
       </div>
    );
  },[lyrics, activeLyricIndex, isLyricsEnabled, isLyricsFullScreen, syncType, isVideoMode, isMiniWordSyncEnabled, lineFontSize]);

  const RenderedLyrics = useMemo(() => {
    if (!isLyricsEnabled) return null;
    return lyrics.map((line: any, idx: number) => {
      const isActive = idx === activeLyricIndex;
      const isPast = idx < activeLyricIndex;
      const isFuture = idx > activeLyricIndex;
      const fzClass = getCardFontSizeClass(isLyricsFullScreen);
      
      const activeClasses = `text-white ${fzClass} font-black drop-shadow-2xl leading-tight opacity-100`;
      const pastClasses = `text-white ${fzClass} font-bold hover:text-white/80 leading-tight opacity-50 -translate-y-2`;
      const futureClasses = `text-black/80 ${fzClass} font-black drop-shadow-md leading-tight opacity-70 translate-y-3`;

      return (
        <p key={idx} ref={isActive ? (isLyricsFullScreen ? fullActiveLyricRef : activeLyricRef) : null} onClick={() => { if (syncType === "LINE_SYNCED" && !isVideoMode) handleLyricClick(line.time); }} className={`cursor-pointer transition-all duration-[800ms] ease-out origin-left no-select-text transform ${isActive ? activeClasses : isPast ? pastClasses : futureClasses}`}>
           {isWordSyncEnabled ? (line.words || "♪").split(' ').map((word: string, wIdx: number, arr: any[]) => <span key={wIdx} className={isActive ? "lyric-word-sync inline-block" : "inline-block"}>{word}{wIdx < arr.length - 1 ? '\u00A0' : ''}</span>) : (line.words || "♪")}
        </p>
      )
    });
  },[lyrics, activeLyricIndex, isLyricsFullScreen, isLyricsEnabled, cardFontSize, isWordSyncEnabled, syncType, isVideoMode]);

  const RenderedQueue = useMemo(() => {
    return upcomingQueue.map((track: any, index: number) => {
      const isSelected = selectedQueueItems.includes(index);
      return (
        <div key={(track.id||track.track_id||track.entity_id) + index} data-index={index} className={`queue-item flex items-center justify-between w-full group p-2 rounded-lg cursor-pointer relative bg-transparent hover:bg-white/5`}>
          {isQueueEditMode && (
            <div className="flex-shrink-0 mr-3 pl-1" onClick={(e) => {
               e.stopPropagation();
               setSelectedQueueItems(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
            }}>
               <div className={`w-[22px] h-[22px] rounded-full border-[2px] flex items-center justify-center transition-colors ${isSelected ? 'bg-[#1db954] border-[#1db954]' : 'border-white/40'}`}>
                  {isSelected && <Check size={14} className="text-black stroke-[3px]" />}
               </div>
            </div>
          )}

          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0" onClick={() => { 
             if(isQueueEditMode) { setSelectedQueueItems(prev => prev.includes(index) ? prev.filter(i => i !== index) :[...prev, index]); return; }
             if (jamRoleRef.current === 'guest' && jamStatus === 'connected') return;
             
             localActionTimeRef.current = Date.now();
             // Allow Host/Admin to naturally change song, effect will handle sync
             setCurrentSong(track); setUpcomingQueue((prev: any) => prev.filter((_: any, i: number) => i !== index)); setIsPlaying(true); 
          }}>
            <div className="w-[44px] h-[44px] flex-shrink-0 rounded-[4px] bg-[#282828] overflow-hidden"><img draggable={false} src={getImageUrl(track) || "https://via.placeholder.com/150"} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" /></div>
            <div className="flex flex-col min-w-0 pr-2 overflow-hidden"><span className="text-[15px] font-bold text-white truncate">{decodeEntities(track.track_title || track.title || track.name)}</span><span className="text-[13px] font-medium text-white/60 truncate">{decodeEntities(getArtistsText(track))}</span></div>
          </div>

          {!isQueueEditMode && (
             <div className={`flex-shrink-0 px-3 py-2 text-white/50 touch-none ${isGuestLocked ? 'opacity-20 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`} onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, index); }}><Menu size={20} /></div>
          )}
        </div>
      );
    });
  },[upcomingQueue, selectedQueueItems, isQueueEditMode, setCurrentSong, setUpcomingQueue, setIsPlaying, isGuestLocked, jamStatus]);

  const formatSleepTimerStr = (secs: number) => { const m = Math.floor(secs / 60); const s = secs % 60; return `${m}:${s < 10 ? '0' : ''}${s}`; };

  if (!currentSong) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        * { -webkit-tap-highlight-color: transparent; }
        .player-root { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: pan-y; }
        img, video, canvas { pointer-events: none; -webkit-touch-callout: none; user-select: none; }
        @keyframes spotify-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-spotify-marquee { animation: spotify-marquee 12s linear infinite; display: inline-block; white-space: nowrap; }
        .mask-edges { mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); }
        .mask-edges-vertical { mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%); }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; border-radius: 4px; }
        input[type=range]:focus { outline: none; }
        .mobile-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); }
        .mobile-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #fff; margin-top: -4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 0; }
        .no-select { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; pointer-events: none; }
        .no-select-text { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
        .queue-item { transform-origin: center; will-change: transform; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
        .lyric-word-sync { background: linear-gradient(to right, #ffffff calc(var(--p, 0%) - 15%), rgba(255,255,255,0.2) var(--p, 0%)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: transparent; will-change: background; transform: translateZ(0); }
        
        @keyframes spin-buffer { 100% { transform: rotate(360deg); } }
        
        .spotify-spinner {
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,1) 100%);
            -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2.5px));
            mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2.5px));
            animation: spin-buffer 1s linear infinite;
        }
        
        .spotify-spinner-mini {
            position: absolute;
            inset: -6px;
            border-radius: 50%;
            background: conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,1) 100%);
            -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 1.5px));
            mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 1.5px));
            animation: spin-buffer 1s linear infinite;
        }
      `}} />

      <audio 
        ref={audioRef} autoPlay={isPlaying && !isVideoMode} 
        onEnded={() => playNext(true)} 
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsAudioBuffering(true)}
        onPlaying={() => setIsAudioBuffering(false)}
        onCanPlay={() => setIsAudioBuffering(false)}
        crossOrigin="anonymous" 
        onLoadedMetadata={() => { 
           const dur = audioRef.current?.duration || 0; setDuration(dur); 
           if (restoreTimeRef.current !== null && restoreTimeRef.current > 0) { audioRef.current!.currentTime = restoreTimeRef.current; setCurrentTime(restoreTimeRef.current); restoreTimeRef.current = null; } 
           syncPosition();
        }} 
      />

      <div className={`player-root fixed inset-0 z-[99999] text-white transition-all duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isExpanded ? "translate-y-0 opacity-100 overflow-hidden" : "translate-y-full opacity-0 pointer-events-none"}`}>
        
        {isCanvasLoaded && !isScrolledPastMain && !showQueue && !isVideoMode && !isLyricsFullScreen && isCanvasEnabled && (
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setIsUiHidden(!isUiHidden)} />
        )}
        <div className="absolute inset-0 z-0 pointer-events-none transition-all duration-700" style={{ backgroundColor: dominantColor, backgroundImage: isLyricsFullScreen ? 'none' : 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)' }} />
        
        {canvasData?.canvasUrl && !isVideoMode && isCanvasEnabled && (
          <div className={`absolute inset-0 z-0 bg-transparent pointer-events-none transition-opacity duration-700 ${isCanvasLoaded && !isScrolledPastMain && !showQueue && !isLyricsFullScreen ? 'opacity-100' : 'opacity-0'}`}>
            <video ref={canvasVideoRef} src={canvasData.canvasUrl} loop muted playsInline onLoadedData={() => setIsCanvasLoaded(true)} className="absolute inset-0 w-full h-full object-cover" />
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 transition-opacity duration-500 ${isUiHidden ? 'opacity-0' : 'opacity-100'}`} />
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 transition-opacity duration-500 ${isUiHidden ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        )}

        <div className={`absolute inset-0 z-20 overflow-x-hidden scrollbar-hide flex flex-col pointer-events-none ${isLyricsFullScreen ? 'overflow-y-hidden' : 'overflow-y-auto'}`} onScroll={handleScroll}>
          
          <div className="w-full flex flex-col flex-shrink-0 pointer-events-auto transition-all duration-500" style={{ height: isLyricsFullScreen ? '100%' : undefined, minHeight: isLyricsFullScreen ? '100%' : '100dvh' }}>
            
            <div className={`flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex-shrink-0 w-full ${isLyricsFullScreen ? 'mt-0' : 'mt-4'}`}>
              <button onClick={() => { if (isLyricsFullScreen) setIsLyricsFullScreen(false); else closeMainPlayer(); }} className="p-2 -ml-2 text-white active:opacity-50 drop-shadow-md pointer-events-auto"><ChevronDown size={28} /></button>
              <div className="flex flex-col items-center flex-1 min-w-0 px-2 drop-shadow-md no-select-text">
                <span className="text-[10px] tracking-widest text-white/70 uppercase truncate w-full text-center font-medium">Playing from {displayContext?.type || 'App'}</span>
                <span className="text-[13px] font-bold text-white truncate w-full text-center mt-[2px]">{decodeEntities(displayContext?.name || 'Gaana Selection')}</span>
              </div>
              <button onClick={openSettings} className="p-2 -mr-2 text-white active:opacity-50 drop-shadow-md pointer-events-auto"><MoreHorizontal size={24} /></button>
            </div>

            <div className={`flex-1 min-h-0 w-full flex items-center justify-center relative z-30 transition-all duration-500 ${isLyricsFullScreen ? 'px-0 py-0 flex-col items-stretch justify-start' : (isVideoMode ? 'px-4 py-2' : 'px-8 py-2')}`}>
              {isLyricsFullScreen && isLyricsEnabled ? (
                <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden pointer-events-auto transition-colors duration-700 bg-transparent">
                  <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-4 pb-[30vh] flex flex-col gap-8 w-full h-full mask-edges-vertical" ref={fullLyricsContainerRef}>
                     {lyrics.length > 0 && (syncType !== "LINE_SYNCED" || isVideoMode) && (
                         <div className="flex items-center gap-3 mb-2 px-1 opacity-70"><span className="px-2.5 py-[3px] bg-white/20 rounded text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">Unsynced</span></div>
                     )}
                     {RenderedLyrics}
                  </div>
                </div>
              ) : isVideoMode && ytVideoId ? (
                <div className="w-full aspect-video max-w-[600px] max-h-[50vh] relative bg-black shadow-[0_15px_40px_rgba(0,0,0,0.5)] rounded-[12px] transition-all duration-500 overflow-hidden mx-auto pointer-events-auto" style={{ transform: 'translateZ(0)' }}>
                  <iframe referrerPolicy="no-referrer" ref={videoIframeRef} src={`https://ayushcom.vercel.app/?vid=${ytVideoId}&t=${iframeInitialTimeRef.current}`} style={{ width: "100%", height: "100%", border: "none", pointerEvents: 'auto', borderRadius: '12px' }} allow="autoplay; fullscreen; picture-in-picture" />
                </div>
              ) : (
                <div className={`relative bg-[#282828] rounded-[8px] shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isCanvasLoaded && isCanvasEnabled ? 'opacity-0 scale-75 pointer-events-none hidden' : 'opacity-100 scale-100 block'}`} style={{ width: '100%', aspectRatio: '1/1', maxWidth: '380px', maxHeight: '50vh' }}>
                  {displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />}
                </div>
              )}
            </div>

            <div className={`w-full px-5 pt-2 flex flex-col justify-end flex-shrink-0 transition-all duration-500 pointer-events-auto ${isLyricsFullScreen ? 'mb-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]' : (isCanvasActive ? 'mb-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]' : 'mb-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]')}`}>
              
              <div className={`transition-all duration-500 w-full relative overflow-hidden flex items-center justify-start mask-edges-vertical ${isUiHidden && !isVideoMode ? 'max-h-0 opacity-0 mb-0' : (isLyricsFullScreen ? 'hidden' : 'mb-3 opacity-100 min-h-[75px]')}`}>
                {RenderedMiniLyrics}
              </div>

              <div className={`transition-all duration-500 flex items-center justify-between drop-shadow-md w-full no-select-text ${isLyricsFullScreen ? 'mb-2 scale-[0.8] origin-bottom-left' : (isCanvasActive ? 'mb-3' : 'mb-5')}`}>
                <div className="flex items-center gap-3 overflow-hidden pr-4 flex-1 min-w-0 w-full max-w-full">
                  {showTinyBanner && displayImage && !isLyricsFullScreen && (<img draggable={false} src={displayImage} className="w-[48px] h-[48px] rounded-md shadow-md flex-shrink-0 no-select pointer-events-none" alt="tiny cover" />)}
                  <div className="flex flex-col flex-1 min-w-0 w-full overflow-hidden">
                    <MarqueeText text={displayTitle} className="text-[22px] font-bold text-white tracking-tight drop-shadow-md w-full" />
                    <MarqueeText text={displayArtists} className="text-[15px] font-medium text-[#b3b3b3] mt-1 drop-shadow-md w-full" />
                  </div>
                </div>
                {!isLyricsFullScreen && <button onClick={handleLikeClick} className="flex-shrink-0 ml-2 active:scale-75 transition-transform pointer-events-auto"><Heart size={26} fill={isSongLiked ? "#1db954" : "none"} color={isSongLiked ? "#1db954" : "white"} /></button>}
              </div>

              <div className={`w-full flex flex-col gap-1 relative drop-shadow-md ${isLyricsFullScreen ? 'mb-2 scale-[0.95] origin-bottom' : (isCanvasActive ? 'mb-3' : 'mb-5')}`}>
                <input type="range" min="0" max="100" value={duration > 0 ? progress : 0} onChange={handleSeekChange} onPointerDown={handleSeekStart} onPointerUp={handleSeekEnd} onTouchStart={handleSeekStart} onTouchEnd={handleSeekEnd} className={`w-full mobile-slider relative z-10 ${isGuestLocked ? 'pointer-events-none opacity-80' : 'pointer-events-auto'}`} style={{ background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.3) ${progress}%, rgba(255,255,255,0.3) ${buffered}%, rgba(255,255,255,0.1) ${buffered}%)` }} />
                <div className="flex items-center justify-between text-[11px] font-medium text-[#a7a7a7] mt-1 w-full pointer-events-none no-select-text"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
              </div>

              <div className={`flex flex-col w-full transition-all duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${isUiHidden && !isVideoMode ? 'max-h-0 opacity-0 translate-y-6 pointer-events-none' : (isLyricsFullScreen ? 'max-h-[64px] opacity-100 translate-y-0 pointer-events-auto scale-[0.85] origin-bottom' : 'max-h-[140px] opacity-100 translate-y-0 pointer-events-auto')}`}>
                <div className={`flex items-center justify-between w-full px-1 drop-shadow-md no-select-text ${isLyricsFullScreen ? 'mb-0' : (isCanvasActive ? 'mb-2' : 'mb-5')}`}>
                  <button onClick={() => { localActionTimeRef.current = Date.now(); setIsShuffle(!isShuffle); if(isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*'); }} className={`active:opacity-50 pointer-events-auto ${isShuffle ? 'text-[#1db954]' : 'text-white'}`}><Shuffle size={24} /></button>
                  <button onClick={playPrev} className={`text-white active:opacity-50 pointer-events-auto ${isGuestLocked ? 'opacity-30' : ''}`}><SkipBack size={36} fill="white" stroke="white" /></button>
                  
                  <div className="relative flex items-center justify-center">
                      {isBuffering && <div className="spotify-spinner pointer-events-none z-0" />}
                      <button ref={nextBtnRef} onClick={handlePlayPauseToggle} className={`w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-transform shadow-lg relative z-10 ${isGuestLocked ? 'pointer-events-none opacity-80' : 'pointer-events-auto'}`}>
                         {isPlaying ? <Pause fill="black" stroke="black" size={26} /> : <Play fill="black" stroke="black" size={28} className="translate-x-[2px]" />}
                      </button>
                  </div>
                  
                  <button id="next-song-btn" onClick={() => playNext()} className={`text-white active:opacity-50 pointer-events-auto ${isGuestLocked ? 'opacity-30' : ''}`}><SkipForward size={36} fill="white" stroke="white" /></button>
                  <button onClick={() => { localActionTimeRef.current = Date.now(); setRepeatMode((prev) => (prev + 1) % 3); if(isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*'); }} className={`active:opacity-50 relative pointer-events-auto ${repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'}`}><Repeat size={24} />{repeatMode === 2 && <span className="absolute -top-1 -right-1 bg-[#1db954] text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">1</span>}</button>
                </div>
                {!isLyricsFullScreen && (
                  <div className={`flex items-center justify-between text-[#b3b3b3] w-full px-1 drop-shadow-md pointer-events-auto ${isCanvasActive ? 'mt-2 mb-1' : ''}`}>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleVideoMode} className={`active:opacity-50 transition-colors ${isVideoMode ? 'text-[#1db954]' : 'text-[#b3b3b3]'} ${isGuestLocked ? 'pointer-events-none opacity-50' : ''}`}>{isVideoLoading ? <Loader2 size={20} className="animate-spin" /> : <MonitorPlay size={20} />}</button>
                        <button onClick={(e) => { e.stopPropagation(); setShowJamMenu(true); }} className={`active:opacity-50 transition-colors ${jamStatus === 'connected' ? 'text-[#1db954]' : 'text-[#b3b3b3]'}`}>
                            <Users size={20} className={jamStatus === 'connected' ? "animate-pulse" : ""} />
                        </button>
                    </div>
                    <div className="flex items-center gap-6">
                        {jamStatus === 'connected' && (
                            <button onClick={(e) => { e.stopPropagation(); setShowChat(!showChat); }} className={`active:opacity-50 relative transition-colors ${showChat ? 'text-[#1db954]' : 'text-white/80'}`}>
                                {isChatEnabled ? <MessageCircle size={20} /> : <MessageCircleOff size={20} className="opacity-50" />}
                            </button>
                        )}
                        <button onClick={openQueue} className="active:opacity-50 text-white"><ListMusic size={20} /></button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className={`w-full px-5 pb-24 flex flex-col gap-6 pointer-events-auto transition-opacity duration-500 ${isUiHidden && !isVideoMode ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isLyricsFullScreen ? 'hidden' : 'block'}`}>
            {isLyricsEnabled && lyrics.length > 0 && !isLyricsFullScreen && (
              <div className="rounded-2xl p-6 w-full mx-auto shadow-2xl relative overflow-hidden transition-colors duration-500 border border-white/10" style={{ backgroundColor: dominantColor }}>
                <div className="absolute inset-0 bg-black/5 z-0 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between mb-6 sticky top-0 bg-transparent no-select-text">
                   <h3 className="text-white font-bold text-[18px] flex items-center">
                     Lyrics
                     {(syncType !== "LINE_SYNCED" || isVideoMode) && <span className="ml-3 px-2 py-[2px] bg-white/20 rounded text-[9px] font-bold text-white uppercase tracking-wider border border-white/10">Unsynced</span>}
                   </h3>
                   <button onClick={() => setIsLyricsFullScreen(true)} className="p-2 text-white/80 hover:text-white rounded-full bg-black/30 pointer-events-auto"><Maximize2 size={16} /></button>
                </div>
                <div className="relative z-10 flex flex-col gap-5 max-h-[300px] overflow-y-auto scrollbar-hide pb-10" ref={lyricsContainerRef}>{RenderedLyrics}</div>
              </div>
            )}

            {songDnaArtists.length > 0 && (
                <div className="w-full mt-4">
                    <h3 className="text-white font-extrabold text-[18px] mb-4 drop-shadow-md no-select-text flex items-center gap-2">
                        <Sparkles size={18} className="text-[#1db954]" /> Song DNA
                    </h3>
                    <div className={`flex flex-wrap ${songDnaArtists.length <= 4 ? 'justify-center' : 'justify-start'} gap-x-4 gap-y-8 pb-4 pointer-events-auto`}>
                        {songDnaArtists.map((artist: any, idx: number) => (
                            <SongDnaCard key={artist.seokey || artist.id || idx} artist={artist} closePlayer={closePlayerForNavigation} isFew={songDnaArtists.length <= 4} />
                        ))}
                    </div>
                </div>
            )}

            {songDetails?.album_title && (
              <Link prefetch={false} href={albumRoute} onClick={closePlayerForNavigation} className="w-full mt-2 bg-[#1e1e1e]/60 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 hover:bg-[#2a2a2a]/80 transition-colors border border-white/10 shadow-xl relative overflow-hidden group no-select-text pointer-events-auto">
                <div className="absolute inset-0 z-0 pointer-events-none opacity-30" style={{ backgroundColor: dominantColor }} />
                {displayImage && <img draggable={false} src={displayImage} className="w-[64px] h-[64px] rounded-md object-cover relative z-10 shadow-md border border-white/5 group-hover:scale-105 transition-transform no-select pointer-events-none" alt="Album Cover" />}
                <div className="flex flex-col relative z-10 flex-1 pr-2"><span className="text-white/60 text-[11px] uppercase tracking-widest font-bold mb-1 drop-shadow-sm">Album</span><span className="text-white font-bold text-[16px] line-clamp-1 drop-shadow-md">{decodeEntities(songDetails.album_title)}</span></div><div className="relative z-10 text-white/50 group-hover:text-white transition-colors pl-2"><ChevronDown size={20} className="-rotate-90" /></div>
              </Link>
            )}

            {songDetails && (
              <div className="w-full mt-2 rounded-3xl p-6 flex flex-col gap-6 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group no-select-text bg-[#0B132B]/90 backdrop-blur-xl">
                {displayImage && (
                  <div className="absolute inset-0 z-0 bg-cover bg-center opacity-20 blur-3xl group-hover:scale-110 transition-transform duration-[1500ms] ease-out mix-blend-screen" style={{ backgroundImage: `url(${displayImage})` }} />
                )}
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#040A18]/95 via-[#0B132B]/85 to-[#040A18]/95 pointer-events-none" />
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#1db954]/10 rounded-full blur-[80px] pointer-events-none" />
                
                <h3 className="text-white font-extrabold text-[20px] drop-shadow-md relative z-10 flex items-center gap-2">
                   <Sparkles size={20} className="text-[#1db954]" /> About Track
                </h3>
                
                <div className="relative z-10 grid grid-cols-2 gap-y-4 gap-x-4">
                  {songDetails.popularity && (
                    <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] shadow-inner backdrop-blur-md">
                      <div className="flex items-center gap-2 text-white/50">
                        <Hash size={14} className="text-[#1db954]/80" />
                        <span className="font-bold text-[10px] uppercase tracking-widest">Play Count</span>
                      </div>
                      <span className="text-white font-black text-[16px] tracking-tight">{Number(songDetails.popularity).toLocaleString('en-US')}</span>
                    </div>
                  )}
                  {songDetails.duration && (
                    <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] shadow-inner backdrop-blur-md">
                      <div className="flex items-center gap-2 text-white/50">
                        <Clock size={14} className="text-[#1db954]/80" />
                        <span className="font-bold text-[10px] uppercase tracking-widest">Duration</span>
                      </div>
                      <span className="text-white font-black text-[16px] tracking-tight">{formatTime(Number(songDetails.duration))}</span>
                    </div>
                  )}
                  {songDetails.release_date && (
                    <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] shadow-inner backdrop-blur-md">
                      <div className="flex items-center gap-2 text-white/50">
                        <Calendar size={14} className="text-[#1db954]/80" />
                        <span className="font-bold text-[10px] uppercase tracking-widest">Released</span>
                      </div>
                      <span className="text-white font-black text-[16px] tracking-tight">{songDetails.release_date}</span>
                    </div>
                  )}
                  {songDetails.language && (
                    <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] shadow-inner backdrop-blur-md">
                      <div className="flex items-center gap-2 text-white/50">
                        <Globe size={14} className="text-[#1db954]/80" />
                        <span className="font-bold text-[10px] uppercase tracking-widest">Language</span>
                      </div>
                      <span className="text-white font-black text-[16px] tracking-tight capitalize">{songDetails.language}</span>
                    </div>
                  )}
                  {songDetails.vendor && (
                    <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] shadow-inner backdrop-blur-md col-span-2">
                      <div className="flex items-center gap-2 text-white/50">
                        <Disc3 size={14} className="text-[#1db954]/80" />
                        <span className="font-bold text-[10px] uppercase tracking-widest">Label</span>
                      </div>
                      <span className="text-white font-black text-[16px] tracking-tight line-clamp-1">{decodeEntities(songDetails.vendor)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- LIVE CHAT OVERLAY --- */}
        {showChat && (
            <div className="absolute bottom-[80px] right-5 z-[100] w-[320px] max-w-[calc(100vw-40px)] flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right scale-100 opacity-100 h-[400px] max-h-[50vh] bg-[#000000]/80 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.7)] pointer-events-auto">
                <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5 shadow-sm">
                    <span className="font-bold text-white flex items-center gap-2"><MessageCircle size={16} className="text-[#1db954]"/> Live Chat</span>
                    <div className="flex items-center gap-2">
                        {jamRole === 'host' && (
                            <button onClick={toggleChat} className={`text-xs font-bold px-2 py-1 rounded transition-colors ${isChatEnabled ? 'text-red-400 hover:bg-red-400/20 bg-red-400/10' : 'text-[#1db954] hover:bg-[#1db954]/20 bg-[#1db954]/10'}`}>
                                {isChatEnabled ? 'Disable' : 'Enable'}
                            </button>
                        )}
                        <button onClick={() => setShowChat(false)} className="text-white/50 hover:text-white"><X size={16}/></button>
                    </div>
                </div>

                {isChatEnabled ? (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide" ref={chatContainerRef}>
                            {jamChatMessages.map(msg => (
                                <div key={msg.id} className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full shrink-0 border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center text-xs font-bold shadow-md">
                                        {msg.avatar ? <img src={msg.avatar} className="w-full h-full object-cover" /> : msg.sender.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col bg-white/5 rounded-2xl rounded-tl-sm px-4 py-2 border border-white/5 shadow-sm max-w-[85%]">
                                        <span className="text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 opacity-80 mb-0.5" style={{ color: msg.role === 'host' ? '#1db954' : msg.role === 'admin' ? '#3b82f6' : 'white' }}>
                                            {msg.sender} {msg.role === 'host' && <Crown size={10} />} {msg.role === 'admin' && <Shield size={10} />}
                                        </span>
                                        <span className="text-[13px] font-medium text-white leading-snug">{msg.text}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t border-white/10 bg-white/5">
                            <form onSubmit={(e) => { e.preventDefault(); sendChat(jamChatInput); }} className="flex gap-2">
                                <input value={jamChatInput} onChange={e => setJamChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:bg-white/20 transition-colors" />
                                <button type="submit" disabled={!jamChatInput.trim()} className="bg-[#1db954] disabled:opacity-50 text-black px-4 rounded-xl font-bold flex items-center justify-center transition-opacity"><Send size={16}/></button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <MessageCircleOff size={40} className="text-white/30 mb-3" />
                        <p className="text-white/60 font-medium text-sm">The Host has disabled Live Chat.</p>
                    </div>
                )}
            </div>
        )}

        {/* --- JAM ERROR MODAL --- */}
        {jamError && (
            <div className="absolute inset-0 z-[100020] bg-black/80 flex items-center justify-center p-6 backdrop-blur-md pointer-events-auto" onClick={() => setJamError(null)}>
                <div className="w-full max-w-sm bg-[#121212] border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                    <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">Connection Issue</h3>
                    <p className="text-white/60 font-medium text-sm mb-6">{jamError}</p>
                    <button onClick={() => setJamError(null)} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors">Dismiss</button>
                </div>
            </div>
        )}

        {/* --- JIM JAM MODAL MENU --- */}
        {showJamMenu && (
          <div className="absolute inset-0 z-[100010] bg-black/60 flex items-center justify-center p-6 backdrop-blur-md pointer-events-auto" onClick={() => setShowJamMenu(false)}>
             <div className="w-full max-w-sm bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300 origin-center" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-white font-black text-2xl flex items-center gap-2"><Radio size={26} className="text-[#1db954] animate-pulse"/> Jim Jam</h4>
                    <button onClick={() => setShowJamMenu(false)} className="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-colors rounded-full p-2"><X size={20}/></button>
                </div>

                {jamStatus === 'disconnected' ? (
                    <div className="flex flex-col gap-5 mt-2">
                        <div className="flex justify-center mb-2">
                            <label className="relative cursor-pointer group">
                                <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/20 overflow-hidden flex items-center justify-center bg-white/5 group-hover:border-[#1db954] transition-colors relative z-10 shadow-lg shadow-black/50">
                                    {jamAvatar ? <img src={jamAvatar} className="w-full h-full object-cover" /> : <Users size={32} className="text-white/30" />}
                                </div>
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-20">
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest text-center leading-tight">Upload<br/>Avatar</span>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            </label>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1">Display Name (Optional)</span>
                            <input type="text" placeholder="e.g. Ayush" value={jamName} onChange={handleNameChange} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white font-bold text-center focus:outline-none focus:border-[#1db954] transition-colors" maxLength={15} />
                        </div>

                        <button onClick={createJamRoom} className="w-full py-4 px-4 rounded-2xl bg-[#1db954] text-black font-extrabold text-[15px] hover:bg-[#1ed760] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(29,185,84,0.3)] flex items-center justify-center gap-3 mt-4">
                            <Radio size={22} /> Start a Jam Session
                        </button>
                        
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink-0 mx-4 text-white/40 text-xs font-bold uppercase tracking-widest">Or join existing</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input type="text" placeholder="ROOM CODE" value={jamInputId} onChange={e => setJamInputId(e.target.value.toUpperCase())} className="w-full sm:flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white font-black tracking-[0.2em] text-center focus:outline-none focus:border-[#1db954] transition-colors uppercase" maxLength={6} />
                            <button onClick={joinJamRoom} disabled={jamInputId.length < 6} className="w-full sm:w-auto bg-white/10 text-[#1db954] font-bold px-6 py-3.5 rounded-2xl disabled:opacity-50 hover:bg-[#1db954] hover:text-black transition-colors">Join</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5 items-center py-2">
                        {jamStatus === 'connecting' ? (
                            <div className="flex flex-col items-center gap-5 py-10">
                                <Loader2 size={40} className="text-[#1db954] animate-spin" />
                                <p className="text-white/70 font-medium animate-pulse text-center">Tuning into frequency...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-5 w-full">
                                <div className="bg-gradient-to-br from-white/10 to-transparent border border-white/10 shadow-inner rounded-3xl w-full p-6 flex flex-col items-center gap-1 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#1db954]/20 rounded-full blur-[40px] pointer-events-none" />
                                    <p className="text-[#1db954] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 relative z-10">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#1db954] animate-pulse"></span> Live Room
                                    </p>
                                    <p className="text-white font-black text-4xl tracking-[0.2em] drop-shadow-lg relative z-10 mt-1">{jamRoomId}</p>
                                    <p className="text-white/50 text-xs font-medium mt-2 relative z-10">Share this code with friends</p>
                                </div>
                                
                                <div className="w-full flex flex-col gap-2 mt-2">
                                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1 flex justify-between">Participants <span>{jamParticipants.length} Online</span></span>
                                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto scrollbar-hide w-full px-1">
                                        {jamParticipants.map((p, i) => (
                                            <div key={i} className="flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors p-3 rounded-xl border border-white/5 w-full group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-md" style={{ backgroundColor: p.role === 'host' ? '#1db95420' : p.role === 'admin' ? '#3b82f620' : '#ffffff10', color: p.role === 'host' ? '#1db954' : p.role === 'admin' ? '#3b82f6' : 'white' }}>
                                                        {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : p.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0 pr-2">
                                                        <span className="text-white font-bold text-[14px] truncate flex items-center gap-1">
                                                            {p.name} 
                                                            {p.clientId === clientIdRef.current && <span className="text-[10px] text-white/50 font-medium">(You)</span>}
                                                        </span>
                                                        <span className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1" style={{ color: p.role === 'host' ? '#1db954' : p.role === 'admin' ? '#3b82f6' : 'rgba(255,255,255,0.4)' }}>
                                                            {p.role === 'host' ? <><Crown size={10} /> Host</> : p.role === 'admin' ? <><Shield size={10} /> Admin</> : 'Guest'}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {jamRole === 'host' && p.clientId !== clientIdRef.current && (
                                                    <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                                                        <button onClick={() => assignRole(p.clientId, p.role === 'admin' ? 'guest' : 'admin')} className="text-white hover:text-[#3b82f6] p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title={p.role === 'admin' ? "Remove Admin" : "Make Admin"}>
                                                            <Shield size={16} />
                                                        </button>
                                                        <button onClick={() => assignRole(p.clientId, 'host')} className="text-white hover:text-[#1db954] p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Make Host">
                                                            <Crown size={16} />
                                                        </button>
                                                        <button onClick={() => kickUser(p.clientId)} className="text-white hover:text-red-500 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Remove from Jam">
                                                            <UserMinus size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex w-full gap-3 mt-4">
                                    {jamRole === 'host' ? (
                                        <>
                                            <button onClick={() => { navigator.clipboard.writeText(jamRoomId!); alert("Room ID Copied!"); }} className="flex-1 flex items-center justify-center gap-2 text-white font-bold text-sm bg-white/10 hover:bg-white/20 py-4 rounded-2xl transition-colors"><Copy size={18}/> Copy</button>
                                            <button onClick={disconnectJam} className="flex-1 py-4 rounded-2xl bg-[#ff4444]/10 hover:bg-[#ff4444]/20 text-[#ff4444] font-bold text-sm transition-colors flex justify-center items-center gap-2"><LogOut size={18}/> End Jam</button>
                                        </>
                                    ) : (
                                        <button onClick={disconnectJam} className="w-full py-4 rounded-2xl bg-[#ff4444]/10 hover:bg-[#ff4444]/20 text-[#ff4444] font-bold text-sm transition-colors flex justify-center items-center gap-2"><LogOut size={18}/> Leave Jam</button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
             </div>
          </div>
        )}

        <div className={`absolute inset-0 z-[100000] bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto flex flex-col justify-end ${showSettingsMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowSettingsMenu(false)}>
          <div className={`w-full bg-[#121212] rounded-t-[28px] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-2xl border-t border-white/10 flex flex-col max-h-[85vh] ${showSettingsMenu ? 'translate-y-0' : 'translate-y-full'}`} onClick={e => e.stopPropagation()}>
             <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
                 <h3 className="text-white font-extrabold text-[22px] flex items-center gap-2"><Settings2 size={24}/> Settings</h3>
                 <button onClick={() => setShowSettingsMenu(false)} className="text-white/60 p-2 hover:text-white bg-white/5 rounded-full"><ChevronDown size={20} /></button>
             </div>

             <div className="px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] flex flex-col gap-6 overflow-y-auto scrollbar-hide flex-1">
                <div className="flex flex-col gap-3">
                   <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider pl-1">Actions</span>
                   <div className="flex flex-col bg-[#1e1e1e] rounded-[16px] overflow-hidden">
                      <button onClick={handleShareSong} className="w-full flex items-center justify-between px-5 py-4 transition-colors active:bg-white/10 border-b border-white/5">
                        <div className="flex flex-col items-start text-left"><span className="text-white font-bold text-[15px]">Share Song</span><span className="text-white/50 text-[12px] font-medium mt-0.5">Share exact link</span></div><Share2 size={22} className="text-white/80" />
                      </button>
                      <div className="flex w-full divide-x divide-white/5">
                        <button onClick={handleDownloadMusicInit} className="flex-1 flex flex-col items-center justify-center py-4 transition-colors active:bg-white/10 hover:bg-white/5 group"><Download size={22} className="text-white/80 mb-1 group-hover:text-[#1db954] transition-colors" /><span className="text-white font-bold text-[14px]">Music</span></button>
                        <button onClick={handleDownloadVideoInit} className="flex-1 flex flex-col items-center justify-center py-4 transition-colors active:bg-white/10 hover:bg-white/5 group"><Video size={22} className="text-white/80 mb-1 group-hover:text-[#1db954] transition-colors" /><span className="text-white font-bold text-[14px]">Video</span></button>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col gap-3">
                   <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider pl-1">Audio Quality</span>
                   <div className="flex bg-[#1e1e1e] rounded-[16px] overflow-x-auto hide-scrollbar p-2 gap-2">
                      {['16', '64', '128', '320'].map((q) => (
                         <button key={q} onClick={() => { setSelectedQuality(q); localStorage.setItem('audio_quality', q); restoreTimeRef.current = audioRef.current?.currentTime || 0; setShowSettingsMenu(false); }} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[14px] font-bold transition-all ${selectedQuality === q ? 'bg-[#1db954] text-black shadow-md' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                            {QUALITY_MAP[q] || `${q} kbps`}
                         </button>
                      ))}
                   </div>
                </div>

                <div className="flex flex-col gap-3">
                   <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider pl-1">Lyrics Server</span>
                   <div className="flex bg-[#1e1e1e] rounded-[16px] overflow-hidden p-2 gap-2">
                      <button onClick={() => { setLyricsServer('Spotify'); localStorage.setItem('lyrics_server', 'Spotify'); setShowSettingsMenu(false); }} className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-bold transition-all ${lyricsServer === 'Spotify' ? 'bg-[#1db954] text-black shadow-md' : 'bg-white/5 text-white hover:bg-white/10'}`}>Spotify</button>
                      <button onClick={() => { setLyricsServer('Gaana'); localStorage.setItem('lyrics_server', 'Gaana'); setShowSettingsMenu(false); }} className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-bold transition-all ${lyricsServer === 'Gaana' ? 'bg-[#1db954] text-black shadow-md' : 'bg-white/5 text-white hover:bg-white/10'}`}>Gaana</button>
                   </div>
                </div>

                <div className="flex flex-col gap-3">
                   <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider pl-1">Lyrics & Visuals</span>
                   <div className="flex flex-col bg-[#1e1e1e] rounded-[16px] overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <span className="text-white font-bold text-[15px]">Show Lyrics</span>
                        <button onClick={() => { setIsLyricsEnabled(!isLyricsEnabled); localStorage.setItem('lyrics_enabled', (!isLyricsEnabled).toString()); }} className={`w-11 h-[26px] rounded-full relative transition-colors duration-300 flex items-center ${isLyricsEnabled ? 'bg-[#1db954]' : 'bg-[#535353]'}`}><div className={`w-[22px] h-[22px] bg-white rounded-full absolute shadow-md transition-transform duration-300 ${isLyricsEnabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} /></button>
                      </div>
                      
                      {isLyricsEnabled && (
                        <div className="flex flex-col gap-4 px-5 py-4 border-b border-white/5 bg-black/10">
                          <span className="text-white/70 font-bold text-[13px] tracking-wide uppercase">Font Sizes</span>
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-[13px] font-medium">Above Title (Mini)</span>
                            <div className="flex bg-white/5 rounded-lg p-1">
                              {['Small', 'Medium', 'Large'].map(sz => (
                                <button key={`line-${sz}`} onClick={() => { setLineFontSize(sz); localStorage.setItem('line_font_size', sz); }} className={`px-3 py-1 rounded-md text-[12px] font-bold transition-all ${lineFontSize === sz ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}>{sz}</button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-[13px] font-medium">Card / Fullscreen</span>
                            <div className="flex bg-white/5 rounded-lg p-1">
                              {['Small', 'Medium', 'Large'].map(sz => (
                                <button key={`card-${sz}`} onClick={() => { setCardFontSize(sz); localStorage.setItem('card_font_size', sz); }} className={`px-3 py-1 rounded-md text-[12px] font-bold transition-all ${cardFontSize === sz ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}>{sz}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <div className="flex flex-col">
                           <span className="text-white font-bold text-[15px]">Word Sync (Card)</span>
                           <span className="text-white/50 text-[11px]">Syncs full screen & card lyrics</span>
                        </div>
                        <button onClick={() => { setIsWordSyncEnabled(!isWordSyncEnabled); localStorage.setItem('word_sync_enabled', (!isWordSyncEnabled).toString()); }} className={`w-11 h-[26px] rounded-full relative transition-colors duration-300 flex items-center ${isWordSyncEnabled ? 'bg-[#1db954]' : 'bg-[#535353]'}`}><div className={`w-[22px] h-[22px] bg-white rounded-full absolute shadow-md transition-transform duration-300 ${isWordSyncEnabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} /></button>
                      </div>
                      
                      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <div className="flex flex-col">
                           <span className="text-white font-bold text-[15px]">Word Sync (Mini)</span>
                           <span className="text-white/50 text-[11px]">Syncs the lyrics above title</span>
                        </div>
                        <button onClick={() => { setIsMiniWordSyncEnabled(!isMiniWordSyncEnabled); localStorage.setItem('mini_word_sync_enabled', (!isMiniWordSyncEnabled).toString()); }} className={`w-11 h-[26px] rounded-full relative transition-colors duration-300 flex items-center ${isMiniWordSyncEnabled ? 'bg-[#1db954]' : 'bg-[#535353]'}`}><div className={`w-[22px] h-[22px] bg-white rounded-full absolute shadow-md transition-transform duration-300 ${isMiniWordSyncEnabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} /></button>
                      </div>

                      <div className="flex items-center justify-between px-5 py-4">
                        <span className="text-white font-bold text-[15px]">Show Canvas</span>
                        <button onClick={() => { setIsCanvasEnabled(!isCanvasEnabled); localStorage.setItem('canvas_enabled', (!isCanvasEnabled).toString()); }} className={`w-11 h-[26px] rounded-full relative transition-colors duration-300 flex items-center ${isCanvasEnabled ? 'bg-[#1db954]' : 'bg-[#535353]'}`}><div className={`w-[22px] h-[22px] bg-white rounded-full absolute shadow-md transition-transform duration-300 ${isCanvasEnabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} /></button>
                      </div>
                   </div>
                </div>

             </div>
          </div>
        </div>

        <div className={`absolute inset-0 z-[100005] bg-black/80 backdrop-blur-md transition-opacity duration-300 flex items-center justify-center p-6 ${dlState.type !== null ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setDlState({ type: null, status: "idle" })}>
           <div className={`w-full max-w-sm bg-[#181818] rounded-2xl shadow-2xl border border-white/10 p-6 flex flex-col gap-4 transform transition-transform duration-500 ${dlState.type !== null ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white flex items-center justify-between">
                {dlState.type === "video" ? "Download Video" : "Download Music"}
                <button onClick={() => setDlState({ type: null, status: "idle" })} className="p-1 rounded-full bg-white/10 hover:bg-white/20"><X size={18} /></button>
              </h3>
              
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                <img src={displayImage} className="w-12 h-12 rounded-md object-cover" />
                <div className="flex flex-col flex-1 overflow-hidden"><span className="text-white font-bold text-sm truncate">{displayTitle}</span><span className="text-white/60 font-medium text-xs truncate">{displayArtists}</span></div>
              </div>

              {dlState.status === "servers" && (
                <div className="flex flex-col gap-3 py-2">
                  <p className="text-white/70 text-sm mb-1 text-center font-medium">Select Download Server</p>
                  <button onClick={() => triggerVideoServer(1)} className="w-full flex items-center justify-between py-3 px-4 rounded-lg bg-[#282828] hover:bg-[#333] transition-colors border border-white/5 active:scale-95 text-white">
                     <div className="flex items-center gap-2"><Server size={18} className="text-[#1db954]"/> <span className="font-bold">Server 1</span></div><span className="text-xs text-white/50">Standard</span>
                  </button>
                  <button onClick={() => triggerVideoServer(2)} className="w-full flex items-center justify-between py-3 px-4 rounded-lg bg-[#282828] hover:bg-[#333] transition-colors border border-white/5 active:scale-95 text-white">
                     <div className="flex items-center gap-2"><Server size={18} className="text-[#1db954]"/> <span className="font-bold">Server 2</span></div><span className="text-xs text-white/50">Fast</span>
                  </button>
                </div>
              )}

              {dlState.status === "verifying" && (<div className="py-6 flex flex-col items-center gap-3"><Loader2 className="animate-spin text-[#1db954]" size={32} /><p className="text-white/70 font-medium text-sm animate-pulse">Verifying You...</p></div>)}
              {dlState.status === "connecting" && (<div className="py-6 flex flex-col items-center gap-3"><Loader2 className="animate-spin text-[#1db954]" size={32} /><p className="text-white/70 font-medium text-sm animate-pulse">Connecting to Server {dlState.server}...</p></div>)}
              
              {dlState.status === "downloading" && (
                <div className="py-6 flex flex-col items-center gap-4">
                  <div className="w-full bg-[#333] rounded-full h-2 overflow-hidden"><div className="bg-[#1db954] h-2 transition-all duration-300" style={{width: `${dlState.progress}%`}}></div></div>
                  <p className="text-white font-bold">{dlState.progress}%</p>
                  <p className="text-white/50 text-xs">{dlState.packStep || "Downloading Data..."}</p>
                </div>
              )}

              {dlState.status === "merging" && (<div className="py-6 flex flex-col items-center gap-3"><Loader2 className="animate-spin text-[#1db954]" size={32} /><p className="text-white/70 font-medium text-sm animate-pulse">Merging Video & Audio...</p></div>)}

              {dlState.status === "options" && dlState.type === "video" && (
                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
                  <p className="text-xs text-white/50 mb-2 text-center">Available perfect formats with complete audio merged.</p>
                  {dlState.options?.map((opt:any, i:number) => (
                    <button key={i} onClick={() => executeBlobDownload(opt.url, `${displayTitle} - ${displayArtists}_${opt.quality}.mp4`, true)} className="w-full flex items-center justify-between p-3 rounded-lg bg-[#282828] hover:bg-[#333] transition-colors border border-white/5 active:scale-95 text-left">
                      <div className="flex flex-col"><span className="text-white font-bold text-sm">{opt.label}</span><span className="text-white/50 text-xs">{opt.size}</span></div><Download size={18} className="text-[#1db954]" />
                    </button>
                  ))}
                </div>
              )}

              {dlState.status === "options" && dlState.type === "music" && (
                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
                  <p className="text-xs text-white/50 mb-2 text-center">Download true MP3 with injected Cover Art & Metadata.</p>
                  {dlState.options?.map((opt:any, i:number) => (
                    <button key={i} onClick={() => executeApiMusicDownload(opt.url)} className="w-full flex items-center justify-between p-3 rounded-lg bg-[#282828] hover:bg-[#333] transition-colors border border-white/5 active:scale-95 text-left">
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-sm">Download {opt.label}</span>
                            {opt.size && <span className="text-white/50 text-xs">{opt.size}</span>}
                        </div>
                        <Download size={18} className="text-[#1db954]" />
                    </button>
                  ))}
                </div>
              )}
           </div>
        </div>

        {showTimerMenu && (
          <div className="absolute inset-0 z-[100010] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm pointer-events-auto" onClick={() => setShowTimerMenu(false)}>
             <div className="w-full max-w-sm bg-[#282828] rounded-2xl p-6 shadow-2xl flex flex-col gap-2 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <h4 className="text-white font-bold text-lg mb-2 flex justify-between items-center">Sleep Timer <button onClick={() => setShowTimerMenu(false)} className="text-white/50 hover:text-white"><X size={20}/></button></h4>
                {[5, 15, 30, 45, 60].map(mins => (
                   <button key={mins} onClick={() => { setSleepTimer(mins); setShowTimerMenu(false); }} className={`py-3 px-4 rounded-lg flex justify-between items-center transition-colors ${sleepTimer === mins ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                      <span className="font-medium">{mins} minutes</span>{sleepTimer === mins && <Check size={18} />}
                   </button>
                ))}
                <button onClick={() => { setSleepTimer('end'); setShowTimerMenu(false); }} className={`py-3 px-4 rounded-lg flex justify-between items-center transition-colors ${sleepTimer === 'end' ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                   <span className="font-medium">End of track</span>{sleepTimer === 'end' && <Check size={18} />}
                </button>
                <button onClick={() => { setSleepTimer(null); setShowTimerMenu(false); }} className="py-3 px-4 rounded-lg text-white/50 hover:bg-white/5 text-left mt-2 border border-white/10 transition-colors">
                   Turn off timer
                </button>
             </div>
          </div>
        )}

        <div className={`absolute inset-0 z-[60] bg-[#121212] transition-transform duration-300 flex flex-col pointer-events-auto ${showQueue ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 sticky top-0 bg-[#121212] z-20 shadow-md no-select-text">
            <button onClick={() => { setIsQueueEditMode(false); setShowQueue(false); }} className="p-2 -ml-2 text-white/80 active:opacity-50"><ChevronDown size={28} /></button>
            <span className="text-[15px] font-bold text-white">Queue</span>
            {isQueueEditMode ? (
               <button onClick={() => { setIsQueueEditMode(false); setSelectedQueueItems([]); }} className="text-[14px] font-bold text-[#1db954] active:opacity-50">Done</button>
            ) : (
               <button onClick={() => setIsQueueEditMode(true)} className="text-[14px] font-medium text-white/80 active:opacity-50">Edit</button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto px-5 pb-32 no-select-text relative scrollbar-hide" ref={queueContainerRef}>
            <span className="text-[14px] font-medium text-white/60 block mb-6 uppercase tracking-wider">Playing from {displayContext?.type || 'App'}</span>
            <div className="flex items-center justify-between w-full mb-8">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-12 h-12 flex-shrink-0 rounded-[4px] bg-[#282828] overflow-hidden">{displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />}</div>
                <div className="flex flex-col min-w-0 pr-2 overflow-hidden"><span className="text-[16px] font-bold text-[#1db954] truncate">{displayTitle}</span><span className="text-[14px] font-medium text-white/60 truncate">{displayArtists}</span></div>
              </div>
            </div>
            
            <span className="text-[16px] font-bold text-white block mb-4">Next in queue</span>
            <div className="flex flex-col relative">{RenderedQueue}</div>
          </div>
          
          <div className="absolute bottom-0 left-0 w-full bg-[#181818] border-t border-[#282828] pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 px-6 flex justify-between items-center z-20 no-select-text shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
            {isQueueEditMode ? (
                <div className="flex items-center justify-between w-full">
                    <button onClick={() => {
                        if (selectedQueueItems.length === 0) return;
                        localActionTimeRef.current = Date.now();
                        setUpcomingQueue(prev => {
                            const arr = [...prev]; 
                            const toMove = selectedQueueItems.map(idx => prev[idx]);
                            const remaining = arr.filter((_, i) => !selectedQueueItems.includes(i));
                            const newArr = [...toMove, ...remaining];
                            if ((jamRoleRef.current === 'host' || jamRoleRef.current === 'admin') && jamStatus === 'connected' && ablyChannelRef.current) {
                                ablyChannelRef.current.publish('sync', { type: 'QUEUE_UPDATE', senderId: clientIdRef.current, payload: { queue: newArr } });
                            }
                            return newArr;
                        });
                        setSelectedQueueItems([]); setIsQueueEditMode(false);
                    }} className="text-white font-bold text-[13px] bg-white/10 px-4 py-2 rounded-full active:bg-white/20 transition-colors">Move to Top</button>
                    <span className="text-white/50 text-[12px] font-bold">{selectedQueueItems.length} Selected</span>
                    <button onClick={() => {
                        if (selectedQueueItems.length === 0) return;
                        localActionTimeRef.current = Date.now();
                        setUpcomingQueue(prev => {
                            const newArr = prev.filter((_, i) => !selectedQueueItems.includes(i));
                            if ((jamRoleRef.current === 'host' || jamRoleRef.current === 'admin') && jamStatus === 'connected' && ablyChannelRef.current) {
                                ablyChannelRef.current.publish('sync', { type: 'QUEUE_UPDATE', senderId: clientIdRef.current, payload: { queue: newArr } });
                            }
                            return newArr;
                        });
                        setSelectedQueueItems([]); setIsQueueEditMode(false);
                    }} className="text-[#ff4444] font-bold text-[13px] bg-[#ff4444]/10 px-4 py-2 rounded-full active:bg-[#ff4444]/20 transition-colors">Remove</button>
                </div>
            ) : (
                <>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer" onClick={() => { localActionTimeRef.current = Date.now(); setIsShuffle(!isShuffle); }}><Shuffle size={24} className={isShuffle ? 'text-[#1db954]' : 'text-white/70'} /><span className={`text-[11px] font-medium ${isShuffle ? 'text-[#1db954]' : 'text-white/70'}`}>Shuffle</span></div>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer" onClick={() => { localActionTimeRef.current = Date.now(); setRepeatMode((prev) => (prev + 1) % 3); }}><div className="relative"><Repeat size={24} className={repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'} />{repeatMode === 2 && <span className="absolute -top-1 -right-1 bg-[#1db954] text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">1</span>}</div><span className={`text-[11px] font-medium ${repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'}`}>Repeat</span></div>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer text-white/70" onClick={openTimer}><div className={`relative ${sleepTimer ? 'text-[#1db954]' : 'text-white/70'}`}><Timer size={24} /></div><span className={`text-[11px] font-medium ${sleepTimer ? 'text-[#1db954]' : 'text-white/70'}`}>{timerRemaining ? formatSleepTimerStr(timerRemaining) : sleepTimer === 'end' ? 'Track End' : 'Timer'}</span></div>
                </>
            )}
          </div>
        </div>
      </div>

      <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={openMainPlayer} className={`fixed bottom-[65px] left-[8px] right-[8px] h-[56px] rounded-[6px] z-[99990] cursor-pointer overflow-hidden transition-all duration-[400ms] shadow-md no-select-text ${isExpanded ? 'opacity-0 pointer-events-none translate-y-6 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`} style={{ backgroundColor: dominantColor, transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined, transition: swipeX === 0 && !isExpanded ? 'transform 0.4s ease-out, opacity 0.4s' : 'none' }}>
        <div className="absolute inset-0 bg-black/25 z-0 pointer-events-none" />
        <div className="relative z-10 w-full h-full flex items-center px-2">
          <div className="w-[40px] h-[40px] flex-shrink-0 rounded-[4px] shadow-sm overflow-hidden bg-[#282828] relative mr-3">
            {displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />}
          </div>
          <div className="flex flex-col flex-1 min-w-0 pr-3 justify-center"><MarqueeText text={displayTitle} className="text-[13px] font-bold text-white leading-tight mb-[2px] w-full" /><MarqueeText text={displayArtists} className="text-[12px] font-medium text-white/70 leading-tight w-full" /></div>
          <div className="flex items-center gap-4 flex-shrink-0 pr-2 text-white">
            <button className="active:scale-75 transition-transform flex items-center justify-center w-[20px] h-[20px]" onClick={(e) => { e.stopPropagation(); setShowJamMenu(true); }}><Users size={20} className={jamStatus === 'connected' ? "text-[#1db954]" : ""} /></button>
            <button className="active:scale-75 transition-transform flex items-center justify-center w-[20px] h-[20px]" onClick={toggleVideoMode}><MonitorPlay size={20} className={isVideoMode ? "text-[#1db954]" : ""} /></button>
            
            <button className="active:scale-75 transition-transform flex items-center justify-center w-[24px] h-[24px] relative" onClick={handlePlayPauseToggle}>
               {isBuffering && <div className="spotify-spinner-mini pointer-events-none z-0" />}
               {isPlaying ? <Pause fill="white" stroke="white" size={24} /> : <Play fill="white" stroke="white" size={24} className="translate-x-[1px]" />}
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/10 rounded-full z-20 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-white/40 transition-all duration-300" style={{ width: `${buffered}%` }} />
            <div className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </>
  );
}
