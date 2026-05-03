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

// --- 5-HOUR INDEXEDDB CACHE ENGINE (Audio & APIs) ---
const DB_NAME = "GrooveCacheDB";
const STORE_NAME = "caches";
const CACHE_EXPIRY_MS = 5 * 60 * 60 * 1000;

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
      const response = await fetch('https://serverayush.vercel.app/api/auth');
      const data = await response.json();
      if (typeof window !== "undefined") localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch (error) { return null; } finally { ongoingAuthPromise = null; }
  })();
  return ongoingAuthPromise;
};

const getAuthData = async () => {
  const cachedAuth = getCachedAuth();
  if (cachedAuth) return cachedAuth;
  return await fetchNewAuthToken();
};

// --- ADVANCED HTML ENTITY DECODER & PARSER ---
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
      if (Array.isArray(data?.singers)) names = data.singers.map((a: any) => a.name);
      else if (Array.isArray(data?.artist)) names = data.artist.map((a: any) => a.name);
      else if (Array.isArray(data?.artists)) names = data.artists.map((a: any) => a.name);
      else if (typeof data?.artists === "string") names = data.artists.split(",").map((n: string) => n.trim());
      else if (data?.primaryArtists) names = typeof data.primaryArtists === 'string' ? data.primaryArtists.split(",") : data.primaryArtists.map((a:any)=>a.name);
  }
  return names.length > 0 ? Array.from(new Set(names)).join(", ") : "Unknown Artist";
};

const getImageUrl = (item: any) => {
  if (!item) return "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  let img = item.artwork_large || item.artwork_web || item.atw || item.artwork || item.image || item;
  if (typeof img === "string" && img.trim() !== "") return img.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500").replace("50x50", "500x500").split('?')[0];
  if (Array.isArray(img) && img[0]?.url) return (img[img.length - 1]?.url || img[0]?.url).split('?')[0];
  return "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
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

const RAPID_KEYS =["d1edce158amshec139440d20658ap1f2545jsnbb7da9add82f", "6cf7f03014msh787c51a713c0264p15c20djsna1f9a9f6a378", "13d48f6bb8msh459c11b91bdcc44p110f4ejsn099443894115"];
const RAPID_API_HOST = "spotify81.p.rapidapi.com";

// --- AUDIO EQ PRESETS ---
const EQ_FREQUENCIES =[32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const ENHANCED_EQ =[-2, 2, -1, -5, -7, -3, 0, 0, -4, -1];
const ORIGINAL_EQ =[0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const Q_LABELS: Record<string, string> = { "16": "Low", "64": "Medium", "128": "High", "320": "HD" };

// --- AK47 / SPOTIFY MATCHER ENGINE ---
const performAK47Matching = (results: any[], targetTrack: string, targetArtist: string): any => {
    if (!results || results.length === 0) return null;
    const clean = (s: string) => decodeEntities(s || "").toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
    const tTitle = clean(targetTrack); const tArtist = clean(targetArtist);
    let bestMatch = null; let highestScore = 0;

    results.forEach((track) => {
        if (!track) return;
        const rTitle = clean(track.song_name); const rArtists = clean(track.artist);
        let score = 0; let artistMatched = false;

        if (tArtist.length > 0) {
            if (rArtists === tArtist) { score += 100; artistMatched = true; }
            else if (rArtists.includes(tArtist) || tArtist.includes(rArtists)) { score += 80; artistMatched = true; }
            if (!artistMatched) score = 0;
        } else score += 50;

        if (score > 0) {
            if (rTitle === tTitle) score += 100;
            else if (rTitle.startsWith(tTitle) || tTitle.startsWith(rTitle)) score += 80;
            else if (rTitle.includes(tTitle) || tTitle.includes(rTitle)) score += 50;
        }
        if (score > highestScore) { highestScore = score; bestMatch = track; }
    });
    return highestScore > 0 ? bestMatch : results[0];
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
  return highestScore > 0 ? bestMatch : (apiData.tracks[0].data || apiData.tracks[0]);
};

// --- NATIVE ID3 TAGGER & MP3 ENGINE ---
const NativeID3 = {
  tag: function(data: any) {
      const frames: Uint8Array[] =[];
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

const loadHlsJS = () => new Promise((resolve, reject) => {
  if ((window as any).Hls) return resolve((window as any).Hls);
  const script = document.createElement('script');
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js";
  script.onload = () => resolve((window as any).Hls);
  script.onerror = reject;
  document.head.appendChild(script);
});

// --- FLICKER-FREE MEMOIZED MARQUEE ---
const MarqueeText = React.memo(({ text, className = "" }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

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
  const { 
    currentSong, isPlaying, setIsPlaying, setCurrentSong, 
    queue, upcomingQueue, setUpcomingQueue, historyQueue, setHistoryQueue,
    playContext, likedSongs, toggleLikeSong 
  } = useAppContext();
  
  const[audioUrl, setAudioUrl] = useState("");
  const[streamBaseUrl, setStreamBaseUrl] = useState<string | null>(null);
  const[loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const[duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  
  // MODAL/UI STATES
  const[isExpanded, setIsExpanded] = useState(false);
  const[showQueue, setShowQueue] = useState(false);
  const[showSettingsMenu, setShowSettingsMenu] = useState(false);
  const[showTimerMenu, setShowTimerMenu] = useState(false);
  
  const activeOverlayRef = useRef<'player' | 'settings' | 'queue' | 'timer' | 'none'>('none');

  const [dominantColor, setDominantColor] = useState("#0B1320"); 
  const[isScrolledPastMain, setIsScrolledPastMain] = useState(false);
  const[isUiHidden, setIsUiHidden] = useState(false); 
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); 
  
  const [dragActiveIndex, setDragActiveIndex] = useState<number | null>(null);
  const dragRef = useRef({ activeIndex: -1, startY: 0, currentY: 0, startScrollTop: 0, scrollSpeed: 0, rafId: 0, targetIndex: -1 });
  const [isQueueEditMode, setIsQueueEditMode] = useState(false);
  const[selectedQueueItems, setSelectedQueueItems] = useState<number[]>([]); 

  const [sleepTimer, setSleepTimer] = useState<number | 'end' | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  
  const currentTrackRef = useRef<any>(null);
  const maxListenRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0); 
  const isNavigatingBackRef = useRef(false);
  
  const rapidKeyIdxRef = useRef(0);
  const [spotifyId, setSpotifyId] = useState<string | null>(null);
  const[spotifyUrl, setSpotifyUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<any[]>([]);
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
  const playNextRef = useRef<() => void>(() => {});
  
  const canvasVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<any>(null);
  const queueContainerRef = useRef<HTMLDivElement>(null);
  const isSeekingRef = useRef(false);
  const [songDetails, setSongDetails] = useState<any>(null);

  // Video State Maintained (Original Feature intact)
  const [isVideoMode, setIsVideoMode] = useState(false);
  const[ytVideoId, setYtVideoId] = useState<string | null>(null);
  const prefetchedYtIdRef = useRef<string | null>(null); 
  const iframeInitialTimeRef = useRef<number>(0); 
  const videoStartTimeRef = useRef<number>(0);    
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const videoIframeRef = useRef<HTMLIFrameElement>(null);

  const [selectedQuality, setSelectedQuality] = useState("320");
  const[lineFontSize, setLineFontSize] = useState("Medium");
  const[cardFontSize, setCardFontSize] = useState("Medium");
  const[isCanvasEnabled, setIsCanvasEnabled] = useState(true);
  const[isLyricsEnabled, setIsLyricsEnabled] = useState(true);
  const[isWordSyncEnabled, setIsWordSyncEnabled] = useState(true);
  const[isMiniWordSyncEnabled, setIsMiniWordSyncEnabled] = useState(true);
  const[swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const restoreTimeRef = useRef<number | null>(null);

  const isCanvasEnabledRef = useRef(true);
  const isLyricsEnabledRef = useRef(true);

  // BACKGROUND AUDIO EQ STATE
  const[isAudioEnhanced, setIsAudioEnhanced] = useState(true);
  const audioCtxRef = useRef<any>(null);
  const isAudioPremiumSetupRef = useRef(false);
  const eqBandsRef = useRef<any[]>([]);

  const[dlState, setDlState] = useState<{type: "music" | "video" | null, status: string, options?: any[], progress?: number, packStep?: string, server?: number}>({type: null, status: "idle", progress: 0, server: 1});

  const isSongLiked = likedSongs.some((s: any) => s && (s.id || s.track_id) === (currentSong?.id || currentSong?.track_id));
  const handleLikeClick = (e: any) => { e.stopPropagation(); toggleLikeSong(currentSong); };

  // --- CUSTOM BUTTERY AUTO-SCROLL FOR LYRICS ENGINE ---
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

  // --- ROBUST MODAL HISTORY ROUTING ---
  useEffect(() => {
      const handlePopState = (e: PopStateEvent) => {
          const state = e.state?.modal;
          
          if (state === 'settings') { setShowSettingsMenu(true); activeOverlayRef.current = 'settings'; }
          else if (state === 'queue') { setShowQueue(true); activeOverlayRef.current = 'queue'; }
          else if (state === 'timer') { setShowTimerMenu(true); activeOverlayRef.current = 'timer'; }
          else if (state === 'player') { 
              setIsExpanded(true); setShowQueue(false); setShowSettingsMenu(false); setShowTimerMenu(false); 
              activeOverlayRef.current = 'player'; 
          }
          else {
              setIsExpanded(false); setShowQueue(false); setShowSettingsMenu(false); setShowTimerMenu(false);
              activeOverlayRef.current = 'none';
          }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  },[]);

  const openMainPlayer = () => {
      if (!isExpanded) { setIsExpanded(true); activeOverlayRef.current = 'player'; window.history.pushState({ modal: 'player' }, ''); }
  };
  const closePlayerForNavigation = () => { setIsExpanded(false); setShowQueue(false); setShowSettingsMenu(false); setShowTimerMenu(false); activeOverlayRef.current = 'none'; };

  const openSettings = (e: React.MouseEvent) => { e.stopPropagation(); setShowSettingsMenu(true); activeOverlayRef.current = 'settings'; window.history.pushState({ modal: 'settings' }, ''); };
  const openQueue = () => { setShowQueue(true); activeOverlayRef.current = 'queue'; window.history.pushState({ modal: 'queue' }, ''); };
  const openTimer = () => { setShowTimerMenu(true); activeOverlayRef.current = 'timer'; window.history.pushState({ modal: 'timer' }, ''); };

  // --- DEEP AUDIO EQ ENGINE ---
  const ensureAudioActive = useCallback(() => {
      if (!audioRef.current || isAudioPremiumSetupRef.current) return;
      try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) return;
          const ctx = new AudioContextClass();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaElementSource(audioRef.current);
          let previousNode: AudioNode = source;
          const bands: any[] =[];
          
          const savedAe = localStorage.getItem('audio_enhanced');
          const isEnh = savedAe !== null ? savedAe === 'true' : isAudioEnhanced;
          const currentEQ = isEnh ? ENHANCED_EQ : ORIGINAL_EQ;

          EQ_FREQUENCIES.forEach((freq, i) => {
              let filter = ctx.createBiquadFilter();
              filter.type = "peaking"; filter.frequency.value = freq; filter.Q.value = 1.41; filter.gain.value = currentEQ[i];
              previousNode.connect(filter); previousNode = filter; bands.push(filter);
          });
          eqBandsRef.current = bands;

          const limiter = ctx.createDynamicsCompressor();
          limiter.threshold.value = -1.0; limiter.knee.value = 0.0; limiter.ratio.value = 20.0; limiter.attack.value = 0.005; limiter.release.value = 0.050;  
          previousNode.connect(limiter); limiter.connect(ctx.destination);
          
          isAudioPremiumSetupRef.current = true;
      } catch(e) { isAudioPremiumSetupRef.current = true; }
  }, [isAudioEnhanced]);

  useEffect(() => {
      if (eqBandsRef.current.length > 0 && audioCtxRef.current) {
          const targetEQ = isAudioEnhanced ? ENHANCED_EQ : ORIGINAL_EQ;
          targetEQ.forEach((val, i) => { if (eqBandsRef.current[i]) eqBandsRef.current[i].gain.setTargetAtTime(val, audioCtxRef.current.currentTime, 0.1); });
          if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      }
      localStorage.setItem('audio_enhanced', isAudioEnhanced.toString());
  },[isAudioEnhanced]);

  // SLEEP TIMER
  useEffect(() => {
    let interval: any;
    if (typeof sleepTimer === 'number' && sleepTimer > 0) {
        setTimerRemaining(sleepTimer * 60);
        interval = setInterval(() => {
            setTimerRemaining(prev => {
                if (prev !== null && prev <= 1) { setIsPlaying(false); setSleepTimer(null); audioRef.current?.pause(); return null; }
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
       const ae = localStorage.getItem('audio_enhanced'); if (ae !== null) setIsAudioEnhanced(ae === 'true');
    }
  },[]);

  useEffect(() => { isCanvasEnabledRef.current = isCanvasEnabled; },[isCanvasEnabled]);
  useEffect(() => { isLyricsEnabledRef.current = isLyricsEnabled; if (!isLyricsEnabled) setIsLyricsFullScreen(false); },[isLyricsEnabled]);

  const rawTitle = currentSong ? decodeEntities(currentSong.track_title || currentSong.title || currentSong.name || "Unknown") : "";
  const rawArtists = currentSong ? decodeEntities(getArtistsText(currentSong)) : "";
  const rawImage = currentSong ? getImageUrl(currentSong) : "";

  const displayTitle = songDetails?.track_title ? decodeEntities(songDetails.track_title) : rawTitle;
  const displayArtists = songDetails ? decodeEntities(getArtistsText(songDetails)) : rawArtists;
  const displayImage = songDetails ? getImageUrl(songDetails) : rawImage;

  // HLS Stream Initializer
  useEffect(() => {
     const initAudioStream = async () => {
        if (!audioRef.current || !audioUrl) return;

        if (audioUrl.includes('.m3u8')) {
           if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
              audioRef.current.src = audioUrl;
           } else {
              const HlsObj: any = await loadHlsJS();
              if (HlsObj.isSupported()) {
                 if (hlsRef.current) { hlsRef.current.destroy(); }
                 const hls = new HlsObj();
                 hls.loadSource(audioUrl);
                 hls.attachMedia(audioRef.current);
                 hlsRef.current = hls;
              }
           }
        } else {
           audioRef.current.src = audioUrl;
        }

        if (isPlaying && !isVideoMode) {
           ensureAudioActive();
           audioRef.current.play().catch(()=>{});
        }
     };
     initAudioStream();
  },[audioUrl, isPlaying, ensureAudioActive, isVideoMode]);

  const prefetchVideoId = async (songTitle: string, songArtists: string) => {
    try {
      const query = `${songTitle} ${songArtists.split(',').slice(0, 2).join(' ')} official music video`;
      let cachedVid = await getCache(`vid_id_${query}`);
      if (cachedVid) { prefetchedYtIdRef.current = cachedVid; return cachedVid; }

      const fallbackRes = await fetch(`https://ayushvid.vercel.app/api?q=${encodeURIComponent(query)}`);
      const data = await fallbackRes.json();
      if (data?.top_result?.videoId) { 
        prefetchedYtIdRef.current = data.top_result.videoId;
        await setCache(`vid_id_${query}`, data.top_result.videoId);
        return data.top_result.videoId; 
      }
    } catch (err) {}
    return null;
  };

  // MAIN TRACK CHANGE HOOK & GAANA STREAM ENGINE
  useEffect(() => {
    if (!currentSong) return;
    let isCurrent = true;
    
    const trackId = currentSong.track_id || currentSong.id || currentSong.entity_id;

    if (currentTrackRef.current && (currentTrackRef.current.id || currentTrackRef.current.track_id) !== trackId) {
      if (!isNavigatingBackRef.current) {
          setHistoryQueue(prev => {
            const newHist =[currentTrackRef.current, ...prev].filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => (t.id||t.track_id) === (v.id||v.track_id)) === i);
            const sliced = newHist.slice(0, 20); localStorage.setItem('recent_songs', JSON.stringify(sliced)); return sliced;
          });
      }
      isNavigatingBackRef.current = false;
    }
    currentTrackRef.current = currentSong; maxListenRef.current = 0;
    
    setYtVideoId(currentSong.ytVideoId || null);
    setSpotifyId(null); setLyrics([]); setSyncType(null); setCanvasData(null);
    setIsCanvasLoaded(false); setActiveLyricIndex(-1); setIsScrolledPastMain(false); setIsUiHidden(false);
    setIsLyricsFullScreen(false); setStreamBaseUrl(null); prefetchedYtIdRef.current = null;
    iframeInitialTimeRef.current = 0;

    const instantTitle = decodeEntities(currentSong.track_title || currentSong.title || currentSong.name || "Unknown");
    const instantArtists = decodeEntities(getArtistsText(currentSong));

    if (currentSong.ytVideoId || currentSong.prefetchedYtId) {
      prefetchedYtIdRef.current = currentSong.ytVideoId || currentSong.prefetchedYtId;
      setYtVideoId(prefetchedYtIdRef.current);
    } else {
      setIsVideoLoading(isVideoMode); videoStartTimeRef.current = 0;
      prefetchVideoId(instantTitle, instantArtists).then((vid) => {
         if (!isCurrent) return;
         if (vid) setYtVideoId(vid);
         else if (isVideoMode) { setIsVideoMode(false); audioRef.current?.play().catch(()=>{}); setIsPlaying(true); }
         setIsVideoLoading(false);
      });
    }

    // Fetch Gaana Details, Stream, and Native Lyrics
    const fetchGaanaData = async () => {
      setLoading(true);
      
      const targetQ = selectedQuality;

      try {
         // 1. Info
         let sDetails = null;
         const infoRes = await fetch(`https://gaanaayush.vercel.app/api/superserch/track/info?track_id=${trackId}`);
         const infoJson = await infoRes.json();
         if (infoJson.data) { sDetails = infoJson.data; if (isCurrent) setSongDetails(infoJson.data); }

         // 2. Stream
         const streamRes = await fetch(`https://gaanaayush.vercel.app/api/stream/${trackId}`);
         const streamJson = await streamRes.json();
         let finalUrl = "";
         if (streamJson.data?.hlsUrl) {
            setStreamBaseUrl(streamJson.data.hlsUrl);
            finalUrl = streamJson.data.hlsUrl.replace(/(16|64|128|320)\.mp4\.master\.m3u8/, `${targetQ}.mp4.master.m3u8`);
         } else if (streamJson.data?.url) {
            finalUrl = streamJson.data.url;
         }

         if (finalUrl && isCurrent) setAudioUrl(finalUrl);

         // 3. Lyrics
         if (isLyricsEnabledRef.current) {
            const lrcRes = await fetch(`https://gaanaayush.vercel.app/api/lrc?id=${trackId}`);
            const lrcJson = await lrcRes.json();
            if (lrcJson.data?.lyrics && isCurrent) {
               const parsed: any[] =[];
               lrcJson.data.lyrics.split('\n').forEach((line: string) => {
                  const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
                  if (match && match[3].trim()) {
                     parsed.push({ time: parseInt(match[1]) * 60 + parseFloat(match[2]), words: match[3].trim() });
                  }
               });
               if (parsed.length > 0) { setLyrics(parsed); setSyncType("LINE_SYNCED"); }
               else triggerSpotifyFallback(sDetails || currentSong);
            } else triggerSpotifyFallback(sDetails || currentSong);
         } else triggerSpotifyFallback(sDetails || currentSong);

      } catch (e) { triggerSpotifyFallback(currentSong); }
      if (isCurrent) setLoading(false);
    };

    const triggerSpotifyFallback = async (songData: any) => {
       const sTitle = decodeEntities(songData?.track_title || songData?.title || songData?.name || "");
       const sArtist = getArtistsText(songData).split(',')[0].trim();
       const query = `${sTitle} ${sArtist}`.trim();
       
       try {
         // FIRST TRY: AK47
         const auth = await getAuthData();
         if (auth && auth.accessToken) {
             const authRes = await fetch(`https://ak47ayush.vercel.app/search?q=${encodeURIComponent(query)}&CID=${auth.clientId}&token=${auth.accessToken}&limit=10&offset=0`);
             if (authRes.ok && isCurrent) {
                 const authJson = await authRes.json();
                 if (authJson.results && authJson.results.length > 0) {
                     const match = performAK47Matching(authJson.results, sTitle, sArtist);
                     if (match && match.id) {
                         setSpotifyId(match.id);
                         fetchCanvasAndLyrics(match.id);
                         return;
                     }
                 }
             }
         }

         // SECOND TRY: RapidAPI
         const searchUrl = `https://${RAPID_API_HOST}/search?q=${encodeURIComponent(query)}&type=tracks&limit=10`;
         const response = await fetch(searchUrl, { headers: { 'x-rapidapi-key': RAPID_KEYS[0], 'x-rapidapi-host': RAPID_API_HOST } });
         if (response.ok && isCurrent) { 
            const data = await response.json(); 
            const match = performMatching(data, sTitle, sArtist);
            if (match && match.id) {
               setSpotifyId(match.id);
               fetchCanvasAndLyrics(match.id);
            }
         }
       } catch (e) {}
    };

    const fetchCanvasAndLyrics = async (sId: string) => {
       if (isCanvasEnabledRef.current) {
          try {
             const canvasRes = await fetch(`https://ayush-gamma-coral.vercel.app/api/canvas?trackId=${sId}`);
             if (canvasRes.ok) {
                const canvasJson = await canvasRes.json();
                if (canvasJson?.canvasesList?.length > 0) setCanvasData(canvasJson.canvasesList[0]);
             }
          } catch(e){}
       }
       if (isLyricsEnabledRef.current && lyrics.length === 0) {
           try {
              const lyricsRes = await fetch(`https://lyr-nine.vercel.app/api/lyrics?url=https://open.spotify.com/track/${sId}&format=lrc`);
              if (lyricsRes.ok) {
                 const lyricsJson = await lyricsRes.json();
                 if (lyricsJson.lines) {
                    setLyrics(lyricsJson.lines.map((l:any) => ({ time: parseTimeTag(l.timeTag), words: l.words })));
                    setSyncType(lyricsJson.syncType);
                 }
              }
           } catch(e){}
       }
    };

    fetchGaanaData();
    return () => { isCurrent = false; };
  }, [currentSong, selectedQuality]);

  useEffect(() => {
    if (queue && queue.length > 0) {
      if (queue.length === 1 && (queue[0].id||queue[0].track_id) === (currentSong?.id||currentSong?.track_id)) setUpcomingQueue([]);
      else {
        const idx = queue.findIndex((s: any) => (s.id||s.track_id) === (currentSong?.id||currentSong?.track_id));
        if (idx !== -1) setUpcomingQueue(queue.slice(idx + 1));
      }
    }
  },[queue]); 

  // ROBUST VIDEO AUTO-NEXT CLICKER
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
            else if (stateCode === 0 || String(stateCode) === '0') { setTimeout(() => { if (nextBtnRef.current) nextBtnRef.current.click(); else playNextRef.current(); }, 100); }
        } else if (e.data === 'ended' || e.data?.event === 'ended' || e.data?.type === 'ENDED') {
            setTimeout(() => { if (nextBtnRef.current) nextBtnRef.current.click(); else playNextRef.current(); }, 100);
        }
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  },[isVideoMode, duration, upcomingQueue, isExpanded]);

  const handlePlayPauseToggle = (e?: any) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const newState = !isPlaying;
    setIsPlaying(newState);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = newState ? 'playing' : 'paused';
    
    if (isVideoMode && videoIframeRef.current?.contentWindow) {
      videoIframeRef.current.contentWindow.postMessage({ type: newState ? 'MUSIC_PLAY' : 'MUSIC_PAUSE' }, '*');
    } else {
      if (newState) {
        ensureAudioActive();
        const playPromise = audioRef.current?.play();
        if (playPromise !== undefined) playPromise.catch(()=>{});
      } else audioRef.current?.pause();
    }
  };

  const toggleVideoMode = async (e?: React.MouseEvent) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isVideoMode) {
      setIsVideoMode(false);
      if (audioRef.current) { 
        const audioDur = audioRef.current.duration || 0; setDuration(audioDur);
        const safeTime = (audioDur > 0 && currentTime > audioDur) ? audioDur - 2 : currentTime;
        audioRef.current.currentTime = safeTime; setCurrentTime(safeTime);
        ensureAudioActive();
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) playPromise.catch(()=>{});
        setIsPlaying(true);
      }
      return;
    }
    iframeInitialTimeRef.current = Math.floor(currentTime);
    if (prefetchedYtIdRef.current) {
      setYtVideoId(prefetchedYtIdRef.current); setIsVideoMode(true);
      if (audioRef.current) audioRef.current.pause(); setIsPlaying(false); return;
    }
    setIsVideoLoading(true);
    if (audioRef.current) audioRef.current.pause(); setIsPlaying(false);
    const newVid = await prefetchVideoId(displayTitle, displayArtists);
    if (newVid) { setYtVideoId(newVid); setIsVideoMode(true); } 
    else if (audioRef.current) { ensureAudioActive(); audioRef.current.play().catch(()=>{}); setIsPlaying(true); }
    setIsVideoLoading(false);
  };

  useEffect(() => {
    if (!displayImage) return;
    const img = new Image(); img.crossOrigin = "Anonymous"; img.src = displayImage + "?cb=" + Date.now();
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
        setDominantColor(count > 0 ? `rgb(${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)})` : "#0B1320");
      } catch (e) { setDominantColor("#131D30"); }
    };
  }, [displayImage]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    let timeoutId: any;
    const video = canvasVideoRef.current;
    if (!video) return;

    const shouldPlay = isPlaying && !isScrolledPastMain && isExpanded && !showQueue && !isLyricsFullScreen && isCanvasEnabled;
    if (shouldPlay) { if (video.paused) { timeoutId = setTimeout(() => { video.play().catch(() => {}); }, 150); } } 
    else { if (!video.paused) { video.pause(); } }
    return () => clearTimeout(timeoutId);
  },[isPlaying, isScrolledPastMain, isCanvasLoaded, isExpanded, showQueue, isLyricsFullScreen, isCanvasEnabled, canvasData]);

  const playNext = () => {
    if (sleepTimer === 'end') { setIsPlaying(false); setSleepTimer(null); audioRef.current?.pause(); return; }
    if (repeatMode === 2 && audioRef.current) { 
      audioRef.current.currentTime = 0; setRepeatMode(0); ensureAudioActive(); audioRef.current.play().catch(()=>{}); return; 
    }
    if (isShuffle && upcomingQueue.length > 0) {
      const randomIdx = Math.floor(Math.random() * upcomingQueue.length); const nextSong = upcomingQueue[randomIdx];
      setUpcomingQueue(prev => prev.filter((_, i) => i !== randomIdx));
      setCurrentSong(nextSong); setIsPlaying(true); 
      return;
    }
    if (upcomingQueue.length > 0) { 
      const nextSong = upcomingQueue[0]; setUpcomingQueue(prev => prev.slice(1)); setCurrentSong(nextSong); setIsPlaying(true); 
    } else if (repeatMode === 1 && queue && queue.length > 0) { 
      setCurrentSong(queue[0]); setIsPlaying(true); 
    } else { setIsPlaying(false); setProgress(0); }
  };

  const playPrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    if (historyQueue.length > 0) {
      isNavigatingBackRef.current = true;
      const prevSong = historyQueue[0]; setHistoryQueue(prev => prev.slice(1)); setUpcomingQueue(prev =>[currentSong, ...prev]);
      setCurrentSong(prevSong); setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const c = audioRef.current.currentTime; const d = audioRef.current.duration;
      const now = Date.now();
      if (!isSeekingRef.current && now - lastTimeUpdateRef.current < 250) return;
      lastTimeUpdateRef.current = now;
      setCurrentTime(c); setDuration(d || 0);
      
      if (d > 0 && !isSeekingRef.current && isExpanded) {
        setProgress((c / d) * 100);
      }

      if (isLyricsEnabled && syncType === "LINE_SYNCED" && lyrics.length > 0 && !isSeekingRef.current) {
        let activeIdx = -1;
        const offsetTime = c + 0.4; 
        for (let i = 0; i < lyrics.length; i++) { if (lyrics[i].time <= offsetTime) activeIdx = i; else break; }
        if (activeIdx !== activeLyricIndex) setActiveLyricIndex(activeIdx);
      }
    }
  };

  // APPLE-MUSIC STYLE WORD SYNC ENGINE
  useEffect(() => {
    if (!isWordSyncEnabled || !isLyricsEnabled || activeLyricIndex < 0 || !lyrics[activeLyricIndex]) return;
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

            const processContainer = (container: HTMLElement | null, activeSyncEnabled: boolean) => {
                if (!container || !activeSyncEnabled) return;
                const words = container.querySelectorAll('.lyric-word-sync') as NodeListOf<HTMLElement>;
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
                        if (Math.abs((wordNode._lastProg || 0) - localProgress) > 0.5) {
                            wordNode._lastProg = localProgress; wordNode.style.setProperty('--p', `${localProgress.toFixed(1)}%`);
                        }
                    }
                    charAccumulator += wordLen;
                });
            };

            processContainer(fullActiveLyricRef.current, isWordSyncEnabled);
            processContainer(activeLyricRef.current, isWordSyncEnabled);
            processContainer(miniActiveLyricRef.current, isMiniWordSyncEnabled);
        }
        if (isPlaying && isExpanded) animationFrameId = requestAnimationFrame(updateProgress);
    };

    if (isPlaying && isExpanded) animationFrameId = requestAnimationFrame(updateProgress);
    else updateProgress(); 

    return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); };
  },[isWordSyncEnabled, isMiniWordSyncEnabled, isLyricsEnabled, activeLyricIndex, lyrics, isPlaying, isExpanded]);

  useEffect(() => {
    if (isSeekingRef.current || !isExpanded) return; 
    if (activeLyricRef.current && lyricsContainerRef.current) customSmoothScroll(lyricsContainerRef.current, activeLyricRef.current.offsetTop - lyricsContainerRef.current.offsetTop - 20, 800);
    if (fullActiveLyricRef.current && fullLyricsContainerRef.current) customSmoothScroll(fullLyricsContainerRef.current, fullActiveLyricRef.current.offsetTop - fullLyricsContainerRef.current.clientHeight / 2 + 60, 800);
  },[activeLyricIndex, isLyricsFullScreen, isExpanded, customSmoothScroll]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value); setProgress(val);
    const newTime = (val / 100) * duration; setCurrentTime(newTime);
  };
  const handleSeekStart = () => { isSeekingRef.current = true; };
  const handleSeekEnd = (e: React.SyntheticEvent<HTMLInputElement>) => {
    isSeekingRef.current = false;
    const val = parseFloat(e.currentTarget.value); const newTime = (val / 100) * duration;
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = newTime;
      if (isPlaying) { ensureAudioActive(); audioRef.current.play().catch(()=>{}); }
    }
  };

  // SPOTIFY DRAG QUEUE ENGINE
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
            item.style.zIndex = '50'; item.style.transition = 'none'; item.style.backgroundColor = 'rgba(255,255,255,0.1)';
        } else {
            let t = 0;
            if (activeIndex < i && targetIndex >= i) t = -60; else if (activeIndex > i && targetIndex <= i) t = 60;
            item.style.transform = t !== 0 ? `translateY(${t}px)` : 'none';
            item.style.zIndex = '1'; item.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'; item.style.backgroundColor = 'transparent';
        }
    });
  }, [upcomingQueue.length]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent, index: number) => {
    if (isQueueEditMode) return;
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
  }, [updateDOM]);

  const handleDragEnd = useCallback(() => {
    cancelAnimationFrame(dragRef.current.rafId);
    const { activeIndex, targetIndex } = dragRef.current;
    if (queueContainerRef.current) {
        const items = queueContainerRef.current.querySelectorAll('.queue-item');
        items.forEach((item: any) => { item.style.transform = ''; item.style.zIndex = ''; item.style.transition = ''; item.style.backgroundColor = ''; });
    }
    if (activeIndex !== -1 && targetIndex !== -1 && activeIndex !== targetIndex) {
      setUpcomingQueue(prev => { const arr = [...prev]; const [moved] = arr.splice(activeIndex, 1); arr.splice(targetIndex, 0, moved); return arr; });
    }
    dragRef.current.activeIndex = -1; setDragActiveIndex(null);
  },[]);

  useEffect(() => {
    if (dragActiveIndex !== null) {
       window.addEventListener('touchmove', handleDragMove, { passive: false }); window.addEventListener('touchend', handleDragEnd);
       window.addEventListener('mousemove', handleDragMove); window.addEventListener('mouseup', handleDragEnd);
       return () => { window.removeEventListener('touchmove', handleDragMove); window.removeEventListener('touchend', handleDragEnd); window.removeEventListener('mousemove', handleDragMove); window.removeEventListener('mouseup', handleDragEnd); };
    }
  },[dragActiveIndex, handleDragMove, handleDragEnd]);


  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { const diff = e.touches[0].clientX - touchStartX.current; if (diff > 0 && !showQueue && !showSettingsMenu && !isExpanded) setSwipeX(diff); };
  const handleTouchEnd = () => { if (swipeX > window.innerWidth * 0.45 && !showQueue && !isExpanded) { setCurrentSong(null); setIsPlaying(false); setSwipeX(0); } else setSwipeX(0); };

  // NATIVE MP3 PACKER DOWNLOAD
  const executeDownload = async (trackId: string, quality: string) => {
    setDlState({ type: "music", status: "downloading", progress: 0, packStep: "Fetching Stream Info..." });
    try {
      await loadLameJS();
      const streamRes = await fetch(`https://gaanaayush.vercel.app/api/stream/${trackId}`);
      const streamJson = await streamRes.json();
      const segments = streamJson.data?.segments;
      
      if (!segments || segments.length === 0) throw new Error("No segments");
      setDlState(prev => ({...prev, packStep: "Downloading Media Segments...", progress: 10}));

      let combinedBuffer = new Uint8Array(0);
      for (let i = 0; i < segments.length; i++) {
          let segUrl = segments[i].url;
          if(quality !== "128") segUrl = segUrl.replace(/\/128\//g, `/${quality}/`);
          
          const res = await fetch(segUrl);
          const ab = await res.arrayBuffer();
          const tmp = new Uint8Array(combinedBuffer.length + ab.byteLength);
          tmp.set(combinedBuffer, 0);
          tmp.set(new Uint8Array(ab), combinedBuffer.length);
          combinedBuffer = tmp;
          setDlState(prev => ({...prev, progress: 10 + Math.floor((i / segments.length) * 20)}));
      }

      setDlState(prev => ({...prev, progress: 35, packStep: "Decoding Audio..."}));
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(combinedBuffer.buffer);

      setDlState(prev => ({...prev, progress: 45, packStep: "Encoding to MP3..."}));
      await new Promise(r => setTimeout(r, 10)); 
      
      const channels = 1; 
      const sampleRate = audioBuffer.sampleRate;
      const kbps = parseInt(quality) || 128;
      const mp3encoder = new (window as any).lamejs.Mp3Encoder(channels, sampleRate, kbps);
      
      let samples = audioBuffer.getChannelData(0); 
      const buffer = new Int16Array(samples.length);
      for (let i = 0; i < samples.length; i++) buffer[i] = samples[i] < 0 ? samples[i] * 32768 : samples[i] * 32767;

      const mp3Data: any[] =[]; // Fully fixes type errors
      const blockSize = 1152 * 500; 
      let lastYield = Date.now();
      
      for (let i = 0; i < buffer.length; i += blockSize) {
          const chunk = buffer.subarray(i, i + blockSize);
          const mp3buf = mp3encoder.encodeBuffer(chunk);
          if (mp3buf.length > 0) mp3Data.push(mp3buf);
          if (Date.now() - lastYield > 250) { 
              setDlState(prev => ({...prev, progress: 45 + Math.floor((i / buffer.length) * 45)}));
              await new Promise(r => setTimeout(r, 0)); lastYield = Date.now();
          }
      }
      const endBuf = mp3encoder.flush();
      if (endBuf.length > 0) mp3Data.push(endBuf);

      const mp3Blob = new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' });
      setDlState(prev => ({...prev, progress: 95, packStep: "Injecting Metadata..."}));
      
      const imgResp = await fetch(displayImage || "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg");
      const coverBuffer = await imgResp.arrayBuffer();

      const taggedBuffer = NativeID3.tag({ audio: await mp3Blob.arrayBuffer(), image: coverBuffer, title: displayTitle, artist: displayArtists, album: songDetails?.album_title || displayTitle });

      setDlState(prev => ({...prev, progress: 100, packStep: "Complete!"}));
      const finalBlob = new Blob([taggedBuffer], { type: 'audio/mp3' });
      const dlUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement('a'); a.href = dlUrl; a.download = `${displayTitle} - ${displayArtists}.mp3`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });

    } catch (e) {
      alert("Download failed.");
      setDlState({ type: null, status: "idle" });
    }
  };

  const handleDownloadMusicInit = () => { 
      let opts: any[] = [];['16', '64', '128', '320'].forEach(q => {
          opts.push({ quality: `${q}kbps`, label: `${Q_LABELS[q]} - ${q}kbps`, num: parseInt(q) });
      });
      setDlState({ type: "music", status: "options", options: opts.sort((a, b) => b.num - a.num) });
      window.history.back(); 
  };

  const getLineFontSize = () => lineFontSize === "Small" ? "text-[14px]" : lineFontSize === "Large" ? "text-[20px]" : "text-[16px]";
  const getCardFontSizeClass = (isFS: boolean) => {
      const s = cardFontSize;
      if (isFS) return s === "Small" ? "text-[28px]" : s === "Large" ? "text-[40px]" : "text-[34px]";
      return s === "Small" ? "text-[20px]" : s === "Large" ? "text-[30px]" : "text-[24px]";
  };

  const RenderedMiniLyrics = useMemo(() => {
    if (!isLyricsEnabled || isLyricsFullScreen || syncType !== "LINE_SYNCED" || lyrics.length === 0) return null;
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
               <div key={idx} ref={diff === 0 ? miniActiveLyricRef : null} className={`absolute left-0 w-full text-left pr-2 font-extrabold drop-shadow-xl leading-snug transition-all duration-[1500ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${getLineFontSize()}`} style={{ transform, opacity: op, color: 'white', zIndex: diff === 0 ? 10 : 1, transformOrigin: 'left center' }}>
                 {isMiniWordSyncEnabled ? line.words.split(' ').map((w: string, i: number, a: any[]) => <span key={i} className="lyric-word-sync inline">{w}{i < a.length - 1 ? ' ' : ''}</span>) : line.words}
               </div>
            );
         })}
       </div>
    );
  },[lyrics, activeLyricIndex, isLyricsEnabled, isLyricsFullScreen, syncType, isMiniWordSyncEnabled, lineFontSize]);

  const RenderedLyrics = useMemo(() => {
    if (!isLyricsEnabled) return null;
    return lyrics.map((line: any, idx: number) => {
      const isActive = idx === activeLyricIndex;
      const isPast = idx < activeLyricIndex;
      const fzClass = getCardFontSizeClass(isLyricsFullScreen);
      
      const activeClasses = `text-white ${fzClass} font-black drop-shadow-2xl leading-tight opacity-100`;
      const pastClasses = `text-white ${fzClass} font-bold hover:text-white/80 leading-tight opacity-50 -translate-y-2`;
      const futureClasses = `text-blue-200/50 ${fzClass} font-black drop-shadow-md leading-tight opacity-70 translate-y-3`;

      return (
        <p key={idx} ref={isActive ? (isLyricsFullScreen ? fullActiveLyricRef : activeLyricRef) : null} onClick={() => { if (syncType === "LINE_SYNCED") { audioRef.current!.currentTime = line.time; setCurrentTime(line.time); } }} className={`cursor-pointer transition-all duration-[800ms] ease-out origin-left transform ${isActive ? activeClasses : isPast ? pastClasses : futureClasses}`}>
           {isWordSyncEnabled ? line.words.split(' ').map((w: string, i: number, a: any[]) => <span key={i} className={isActive ? "lyric-word-sync inline" : "inline"}>{w}{i < a.length - 1 ? ' ' : ''}</span>) : line.words}
        </p>
      )
    });
  },[lyrics, activeLyricIndex, isLyricsFullScreen, isLyricsEnabled, cardFontSize, isWordSyncEnabled, syncType]);

  const renderEntityRow = (title: string, entities: any[]) => {
      if (!entities || entities.length === 0) return null;
      return (
         <div className="w-full mt-5">
           <h3 className="text-white font-extrabold text-[16px] mb-3 drop-shadow-md">{title}</h3>
           <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-2">
             {entities.map((ent: any, i: number) => {
                const img = getImageUrl(ent);
                return (
                  <Link key={i} href={`/artist/${ent.seokey}`} onClick={closePlayerForNavigation} className="flex flex-col items-center gap-2 flex-shrink-0 w-[110px] group no-select-text">
                     <div className="w-[110px] h-[110px] rounded-full overflow-hidden relative shadow-lg border border-[#1e293b]">
                        <img src={img} className="w-full h-full object-cover" onError={(e) => e.currentTarget.src='https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg'} />
                     </div>
                     <span className="text-white/90 text-[13px] text-center font-bold line-clamp-2 leading-tight">{decodeEntities(ent.name)}</span>
                  </Link>
                )
             })}
           </div>
         </div>
      );
  };

  const RenderedQueue = useMemo(() => {
    return upcomingQueue.map((track: any, index: number) => {
      const isSelected = selectedQueueItems.includes(index);
      return (
        <div key={(track.track_id || track.id) + index} data-index={index} className={`queue-item flex items-center justify-between w-full group p-2 rounded-lg cursor-pointer relative bg-transparent hover:bg-white/5`}>
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
             setCurrentSong(track); setUpcomingQueue((prev: any) => prev.filter((_: any, i: number) => i !== index)); setIsPlaying(true); 
          }}>
            <div className="w-[44px] h-[44px] flex-shrink-0 rounded-[4px] bg-[#131D30] overflow-hidden border border-[#1e293b]"><img src={getImageUrl(track)} alt="cover" className="w-full h-full object-cover" /></div>
            <div className="flex flex-col min-w-0 pr-2 overflow-hidden"><span className="text-[15px] font-bold text-white truncate">{decodeEntities(track.track_title || track.title || track.name)}</span><span className="text-[13px] font-medium text-blue-200/50 truncate">{decodeEntities(getArtistsText(track))}</span></div>
          </div>

          {!isQueueEditMode && (
             <div className="flex-shrink-0 px-3 py-2 cursor-grab active:cursor-grabbing text-blue-200/50 touch-none" onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, index); }}>
                 <Menu size={20} />
             </div>
          )}
        </div>
      );
    });
  },[upcomingQueue, selectedQueueItems, isQueueEditMode, setCurrentSong, setUpcomingQueue, setIsPlaying, handleDragStart]);

  if (!currentSong) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        * { -webkit-tap-highlight-color: transparent; }
        .player-root { touch-action: pan-y; }
        .mask-edges { mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); }
        .mask-edges-vertical { mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; border-radius: 4px; }
        input[type=range]:focus { outline: none; }
        .mobile-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); }
        .mobile-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #fff; margin-top: -4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 0; }
        .lyric-word-sync { background: linear-gradient(to right, #ffffff calc(var(--p, 0%) - 15%), rgba(255,255,255,0.2) var(--p, 0%)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: transparent; will-change: background; }
      `}} />

      <audio ref={audioRef} crossOrigin="anonymous" onEnded={playNext} onTimeUpdate={handleTimeUpdate} onPlay={ensureAudioActive} onPlaying={ensureAudioActive} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} />

      <div className={`player-root fixed inset-0 z-[99999] text-white transition-all duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isExpanded ? "translate-y-0 opacity-100 overflow-hidden" : "translate-y-full opacity-0 pointer-events-none"}`}>
        
        {isCanvasLoaded && isCanvasEnabled && <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setIsUiHidden(!isUiHidden)} />}
        <div className="absolute inset-0 z-0 pointer-events-none transition-all duration-700" style={{ backgroundColor: dominantColor, backgroundImage: isLyricsFullScreen ? 'none' : 'linear-gradient(to bottom, rgba(11,19,32,0.1) 0%, rgba(11,19,32,0.9) 100%)' }} />
        
        {canvasData?.canvasUrl && isCanvasEnabled && (
          <div className={`absolute inset-0 z-0 bg-transparent pointer-events-none transition-opacity duration-700 ${isCanvasLoaded && !isScrolledPastMain && !showQueue && !isLyricsFullScreen ? 'opacity-100' : 'opacity-0'}`}>
            <video ref={canvasVideoRef} src={canvasData.canvasUrl} loop muted autoPlay playsInline onLoadedData={() => setIsCanvasLoaded(true)} className="absolute inset-0 w-full h-full object-cover" />
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B1320]/90 transition-opacity duration-500 ${isUiHidden ? 'opacity-0' : 'opacity-100'}`} />
          </div>
        )}

        <div className={`absolute inset-0 z-20 overflow-x-hidden scrollbar-hide flex flex-col pointer-events-none ${isLyricsFullScreen ? 'overflow-y-hidden' : 'overflow-y-auto'}`} onScroll={(e) => setIsScrolledPastMain(e.currentTarget.scrollTop > 100)}>
          
          <div className="w-full flex flex-col flex-shrink-0 pointer-events-auto transition-all duration-500" style={{ height: isLyricsFullScreen ? '100%' : undefined, minHeight: isLyricsFullScreen ? '100%' : '100dvh' }}>
            
            <div className={`flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex-shrink-0 w-full ${isLyricsFullScreen ? 'mt-0' : 'mt-4'}`}>
              <button onClick={() => { if (isLyricsFullScreen) setIsLyricsFullScreen(false); else window.history.back(); }} className="p-2 -ml-2 text-white active:opacity-50 drop-shadow-md pointer-events-auto"><ChevronDown size={28} /></button>
              <div className="flex flex-col items-center flex-1 min-w-0 px-2 drop-shadow-md">
                <span className="text-[10px] tracking-widest text-blue-200/70 uppercase truncate w-full text-center font-bold">Playing from {playContext?.type || 'App'}</span>
                <span className="text-[13px] font-extrabold text-white truncate w-full text-center mt-[2px]">{decodeEntities(playContext?.name || 'Gaana Selection')}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); window.history.pushState({ modal: 'settings' }, ''); activeOverlayRef.current = 'settings'; }} className="p-2 -mr-2 text-white active:opacity-50 drop-shadow-md pointer-events-auto"><MoreHorizontal size={24} /></button>
            </div>

            <div className={`flex-1 min-h-0 w-full flex items-center justify-center relative z-30 transition-all duration-500 ${isLyricsFullScreen ? 'px-0 py-0 flex-col items-stretch justify-start' : 'px-8 py-2'}`}>
              {isLyricsFullScreen && isLyricsEnabled ? (
                <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden pointer-events-auto transition-colors duration-700 bg-transparent">
                  <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-4 pb-[30vh] flex flex-col gap-8 w-full h-full mask-edges-vertical" ref={fullLyricsContainerRef}>
                     {lyrics.length > 0 && syncType !== "LINE_SYNCED" && <span className="px-2.5 py-[3px] bg-white/20 rounded text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">Unsynced</span>}
                     {RenderedLyrics}
                  </div>
                </div>
              ) : (
                <div className={`relative bg-[#131D30] border border-[#1e293b] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isCanvasLoaded && isCanvasEnabled ? 'opacity-0 scale-75 pointer-events-none hidden' : 'opacity-100 scale-100 block'}`} style={{ width: '100%', aspectRatio: '1/1', maxWidth: '380px', maxHeight: '50vh' }}>
                  {loading && <div className="absolute inset-0 z-10 bg-[#0B1320]/60 flex items-center justify-center"><Loader2 size={40} className="animate-spin text-[#1db954]" /></div>}
                  {displayImage && <img src={displayImage} alt="cover" className="w-full h-full object-cover" />}
                </div>
              )}
            </div>

            <div className={`w-full px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 flex flex-col justify-end flex-shrink-0 transition-opacity duration-500 pointer-events-auto ${isLyricsFullScreen ? 'mb-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]' : 'mb-2'}`}>
              <div className={`transition-all duration-500 w-full relative overflow-hidden flex items-center justify-start mask-edges-vertical ${isUiHidden ? 'max-h-0 opacity-0 mb-0' : (isLyricsFullScreen ? 'hidden' : 'mb-3 opacity-100 min-h-[75px]')}`}>
                {RenderedMiniLyrics}
              </div>

              <div className={`transition-all duration-500 flex items-center justify-between drop-shadow-md w-full ${isLyricsFullScreen ? 'mb-2 scale-[0.8] origin-bottom-left' : 'mb-5'}`}>
                <div className="flex items-center gap-3 overflow-hidden pr-4 flex-1 min-w-0 w-full max-w-full">
                  {(isCanvasLoaded && isCanvasEnabled && !isLyricsFullScreen) && displayImage && (<img src={displayImage} className="w-[48px] h-[48px] rounded-md shadow-md flex-shrink-0 border border-[#1e293b]" alt="tiny cover" />)}
                  <div className="flex flex-col flex-1 min-w-0 w-full overflow-hidden">
                    <MarqueeText text={displayTitle} className="text-[22px] font-extrabold text-white tracking-tight drop-shadow-md w-full" />
                    <MarqueeText text={displayArtists} className="text-[15px] font-medium text-blue-200/60 mt-1 drop-shadow-md w-full" />
                  </div>
                </div>
                {!isLyricsFullScreen && <button onClick={handleLikeClick} className="flex-shrink-0 ml-2 active:scale-75 transition-transform"><Heart size={26} fill={isSongLiked ? "#1db954" : "none"} color={isSongLiked ? "#1db954" : "white"} /></button>}
              </div>

              <div className={`w-full flex flex-col gap-1 relative drop-shadow-md ${isLyricsFullScreen ? 'mb-2 scale-[0.95] origin-bottom' : 'mb-5'}`}>
                <input type="range" min="0" max="100" value={duration > 0 ? progress : 0} onChange={handleSeekChange} onPointerDown={handleSeekStart} onPointerUp={handleSeekEnd} onTouchStart={handleSeekStart} onTouchEnd={handleSeekEnd} className="w-full mobile-slider relative z-10 pointer-events-auto" style={{ background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.2) ${progress}%)` }} />
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-200/50 mt-1 w-full"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
              </div>

              <div className={`flex flex-col w-full transition-all duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${isUiHidden ? 'max-h-0 opacity-0 translate-y-6 pointer-events-none' : (isLyricsFullScreen ? 'max-h-[64px] opacity-100 translate-y-0 scale-[0.85] origin-bottom' : 'max-h-[140px] opacity-100 translate-y-0')}`}>
                <div className={`flex items-center justify-between w-full px-1 drop-shadow-md ${isLyricsFullScreen ? 'mb-0' : 'mb-5'}`}>
                  <button onClick={() => setIsShuffle(!isShuffle)} className={`active:opacity-50 ${isShuffle ? 'text-[#1db954]' : 'text-white'}`}><Shuffle size={24} /></button>
                  <button onClick={playPrev} className="text-white active:opacity-50"><SkipBack size={36} fill="white" stroke="white" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); if(isPlaying) audioRef.current?.pause(); else { ensureAudioActive(); audioRef.current?.play(); } }} className="w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center text-[#0B1320] active:scale-95 transition-transform shadow-lg">
                     {loading ? <Loader2 size={26} className="animate-spin text-[#0B1320]" /> : (isPlaying ? <Pause fill="currentColor" stroke="currentColor" size={26} /> : <Play fill="currentColor" stroke="currentColor" size={28} className="translate-x-[2px]" />)}
                  </button>
                  <button onClick={playNext} className="text-white active:opacity-50"><SkipForward size={36} fill="white" stroke="white" /></button>
                  <button onClick={() => setRepeatMode((prev) => (prev + 1) % 3)} className={`active:opacity-50 relative ${repeatMode > 0 ? 'text-[#1db954]' : 'text-blue-200/70'}`}><Repeat size={24} />{repeatMode === 2 && <span className="absolute -top-1 -right-1 bg-[#1db954] text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">1</span>}</button>
                </div>
                {!isLyricsFullScreen && (
                  <div className="flex items-center justify-between text-blue-200/50 w-full px-1 drop-shadow-md">
                    <button className="active:opacity-50"><MonitorPlay size={20} /></button>
                    <button onClick={() => { setShowQueue(true); window.history.pushState({ modal: 'queue' }, ''); activeOverlayRef.current = 'queue'; }} className="active:opacity-50 text-white"><ListMusic size={20} /></button>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className={`w-full px-5 pb-24 flex flex-col gap-6 pointer-events-auto transition-opacity duration-500 ${isUiHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isLyricsFullScreen ? 'hidden' : 'block'}`}>
            {isLyricsEnabled && lyrics.length > 0 && !isLyricsFullScreen && (
              <div className="rounded-2xl p-6 w-full mx-auto shadow-2xl relative overflow-hidden transition-colors duration-500 border border-[#1e293b]" style={{ backgroundColor: dominantColor }}>
                <div className="absolute inset-0 bg-black/5 z-0 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between mb-6 sticky top-0 bg-transparent">
                   <h3 className="text-white font-extrabold text-[18px] flex items-center">Lyrics</h3>
                   <button onClick={() => setIsLyricsFullScreen(true)} className="p-2 text-white/80 hover:text-white rounded-full bg-black/30"><Maximize2 size={16} /></button>
                </div>
                <div className="relative z-10 flex flex-col gap-5 max-h-[300px] overflow-y-auto scrollbar-hide pb-10" ref={lyricsContainerRef}>{RenderedLyrics}</div>
              </div>
            )}

            {renderEntityRow("Singers", songDetails?.singers)}
            {renderEntityRow("Composers", songDetails?.composers)}
            {renderEntityRow("Lyricist", songDetails?.lyricist)}
            {renderEntityRow("Cast", songDetails?.cast)}

            {songDetails?.album_title && (
              <Link href={`/album/${songDetails.albumseokey || songDetails.album_id}`} onClick={closePlayerForNavigation} className="w-full mt-2 bg-[#131D30]/60 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 hover:bg-[#1a263d]/80 transition-colors border border-[#1e293b] shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 z-0 pointer-events-none opacity-30" style={{ backgroundColor: dominantColor }} />
                {displayImage && <img src={displayImage} className="w-[64px] h-[64px] rounded-md object-cover relative z-10 shadow-md border border-[#1e293b] group-hover:scale-105 transition-transform" alt="Album Cover" />}
                <div className="flex flex-col relative z-10 flex-1 pr-2"><span className="text-blue-200/50 text-[11px] uppercase tracking-widest font-bold mb-1 drop-shadow-sm">Album</span><span className="text-white font-bold text-[16px] line-clamp-1 drop-shadow-md">{decodeEntities(songDetails.album_title)}</span></div><div className="relative z-10 text-white/50 group-hover:text-white transition-colors pl-2"><ChevronDown size={20} className="-rotate-90" /></div>
              </Link>
            )}

            {songDetails && (
              <div className="w-full rounded-2xl p-5 flex flex-col gap-4 border border-[#1e293b] shadow-2xl relative overflow-hidden bg-[#131D30]">
                {displayImage && <div className="absolute inset-0 z-0 bg-cover bg-center opacity-20 blur-xl scale-110" style={{ backgroundImage: `url(${displayImage})` }} />}<div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0B1320]/90 via-[#0B1320]/60 to-[#0B1320]/30 pointer-events-none" />
                <h3 className="text-white font-extrabold text-[18px] drop-shadow-md relative z-10 mb-2">About Song</h3>
                <div className="relative z-10 grid grid-cols-2 gap-y-5 gap-x-4">
                  {songDetails.popularity && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-blue-200/50"><Hash size={12} /><span className="font-bold text-[10px] uppercase tracking-wider">Play Count</span></div><span className="text-white font-bold text-[15px]">{Number(songDetails.popularity).toLocaleString('en-US')}</span></div>)}
                  {songDetails.duration && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-blue-200/50"><Clock size={12} /><span className="font-bold text-[10px] uppercase tracking-wider">Duration</span></div><span className="text-white font-bold text-[15px]">{formatTime(Number(songDetails.duration))}</span></div>)}
                  {songDetails.release_date && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-blue-200/50"><Calendar size={12} /><span className="font-bold text-[10px] uppercase tracking-wider">Released</span></div><span className="text-white font-bold text-[15px]">{songDetails.release_date}</span></div>)}
                  {songDetails.language && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-blue-200/50"><Globe size={12} /><span className="font-bold text-[10px] uppercase tracking-wider">Language</span></div><span className="text-white font-bold text-[15px] capitalize">{songDetails.language}</span></div>)}
                  {songDetails.vendor && (<div className="flex flex-col gap-1 col-span-2"><div className="flex items-center gap-1.5 text-blue-200/50"><Disc3 size={12} /><span className="font-bold text-[10px] uppercase tracking-wider">Label</span></div><span className="text-white font-bold text-[15px] line-clamp-1">{decodeEntities(songDetails.vendor)}</span></div>)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- SETTINGS MENU --- */}
        <div className={`absolute inset-0 z-[100000] bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto flex flex-col justify-end ${showSettingsMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => window.history.back()}>
          <div className={`w-full bg-[#0B1320] rounded-t-[28px] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-2xl border-t border-[#1e293b] flex flex-col max-h-[85vh] ${showSettingsMenu ? 'translate-y-0' : 'translate-y-full'}`} onClick={e => e.stopPropagation()}>
             <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
                 <h3 className="text-white font-extrabold text-[22px] flex items-center gap-2"><Settings2 size={24}/> Settings</h3>
                 <button onClick={() => window.history.back()} className="text-blue-200/60 p-2 hover:text-white bg-white/5 rounded-full"><ChevronDown size={20} /></button>
             </div>

             <div className="px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] flex flex-col gap-6 overflow-y-auto scrollbar-hide flex-1">
                <div className="flex flex-col gap-3">
                   <span className="text-blue-200/60 text-[11px] font-bold uppercase tracking-wider pl-1">Actions</span>
                   <div className="flex flex-col bg-[#131D30] rounded-[16px] overflow-hidden border border-[#1e293b]">
                      <button onClick={handleDownloadMusicInit} className="flex-1 flex flex-col items-center justify-center py-4 transition-colors active:bg-white/10 hover:bg-[#1a263d] group border-b border-[#1e293b]"><Download size={22} className="text-blue-200/80 mb-1 group-hover:text-[#1db954] transition-colors" /><span className="text-white font-bold text-[14px]">Download MP3</span></button>
                   </div>
                </div>

                <div className="flex flex-col gap-3">
                   <span className="text-blue-200/60 text-[11px] font-bold uppercase tracking-wider pl-1">Audio Quality</span>
                   <div className="flex bg-[#131D30] border border-[#1e293b] rounded-[16px] overflow-x-auto hide-scrollbar p-2 gap-2">
                      {['16', '64', '128', '320'].map((q) => (
                         <button key={q} onClick={() => { setSelectedQuality(q); localStorage.setItem('audio_quality', q); window.history.back(); }} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[14px] font-bold transition-all ${selectedQuality === q ? 'bg-[#1db954] text-black shadow-md' : 'bg-transparent text-white hover:bg-white/10'}`}>
                            {Q_LABELS[q]}
                         </button>
                      ))}
                   </div>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                   <span className="text-blue-200/60 text-[11px] font-bold uppercase tracking-wider pl-1">Audio Profile</span>
                   <div className="flex bg-[#131D30] border border-[#1e293b] rounded-[16px] overflow-hidden p-2 gap-2">
                      <button onClick={() => { setIsAudioEnhanced(false); ensureAudioActive(); }} className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-bold transition-all ${!isAudioEnhanced ? 'bg-[#1db954] text-black shadow-md' : 'bg-transparent text-white hover:bg-white/10'}`}>Original</button>
                      <button onClick={() => { setIsAudioEnhanced(true); ensureAudioActive(); }} className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-bold transition-all ${isAudioEnhanced ? 'bg-[#1db954] text-black shadow-md' : 'bg-transparent text-white hover:bg-white/10'}`}>Enhanced</button>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* --- DOWNLOAD MODAL --- */}
        <div className={`absolute inset-0 z-[100005] bg-black/80 backdrop-blur-md transition-opacity duration-300 flex items-center justify-center p-6 ${dlState.type !== null ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setDlState({ type: null, status: "idle" })}>
           <div className={`w-full max-w-sm bg-[#0B1320] rounded-2xl shadow-2xl border border-[#1e293b] p-6 flex flex-col gap-4 transform transition-transform duration-500 ${dlState.type !== null ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white flex items-center justify-between">
                Download Music
                <button onClick={() => setDlState({ type: null, status: "idle" })} className="p-1 rounded-full bg-white/10 hover:bg-white/20"><X size={18} /></button>
              </h3>
              
              <div className="flex items-center gap-3 bg-[#131D30] p-3 rounded-lg border border-[#1e293b]">
                <img src={displayImage} className="w-12 h-12 rounded-md object-cover" />
                <div className="flex flex-col flex-1 overflow-hidden"><span className="text-white font-bold text-sm truncate">{displayTitle}</span><span className="text-blue-200/60 font-medium text-xs truncate">{displayArtists}</span></div>
              </div>
              
              {dlState.status === "downloading" && (
                <div className="py-6 flex flex-col items-center gap-4">
                  <div className="w-full bg-[#131D30] border border-[#1e293b] rounded-full h-2 overflow-hidden"><div className="bg-[#1db954] h-2 transition-all duration-300" style={{width: `${dlState.progress}%`}}></div></div>
                  <p className="text-white font-bold">{dlState.progress}%</p>
                  <p className="text-blue-200/50 text-xs">{dlState.packStep || "Downloading Data..."}</p>
                </div>
              )}

              {dlState.status === "options" && dlState.type === "music" && (
                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
                  <p className="text-xs text-blue-200/50 mb-2 text-center">Download true MP3 with injected Cover Art & Metadata.</p>
                  {dlState.options?.map((opt:any, i:number) => (
                    <button key={i} onClick={() => executeDownload(currentSong.track_id || currentSong.id, opt.num.toString())} className="w-full flex items-center justify-between p-3 rounded-lg bg-[#131D30] hover:bg-[#1a263d] transition-colors border border-[#1e293b] active:scale-95 text-left">
                        <div className="flex flex-col"><span className="text-white font-bold text-sm">Download {opt.label}</span></div><Download size={18} className="text-[#1db954]" />
                    </button>
                  ))}
                </div>
              )}
           </div>
        </div>

        {/* TIMER MENU OVERLAY */}
        {showTimerMenu && (
          <div className="absolute inset-0 z-[100010] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm pointer-events-auto" onClick={() => window.history.back()}>
             <div className="w-full max-w-sm bg-[#0B1320] border border-[#1e293b] rounded-2xl p-6 shadow-2xl flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                <h4 className="text-white font-bold text-lg mb-2 flex justify-between items-center">Sleep Timer <button onClick={() => window.history.back()} className="text-blue-200/50 hover:text-white"><X size={20}/></button></h4>
                {[5, 15, 30, 45, 60].map(mins => (
                   <button key={mins} onClick={() => { setSleepTimer(mins); window.history.back(); }} className={`py-3 px-4 rounded-lg flex justify-between items-center transition-colors ${sleepTimer === mins ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-[#131D30] text-white hover:bg-[#1a263d]'}`}>
                      <span className="font-bold">{mins} minutes</span>{sleepTimer === mins && <Check size={18} />}
                   </button>
                ))}
                <button onClick={() => { setSleepTimer(null); window.history.back(); }} className="py-3 px-4 rounded-lg text-blue-200/50 hover:bg-[#131D30] text-left mt-2 border border-[#1e293b] font-bold">Turn off timer</button>
             </div>
          </div>
        )}

        {/* QUEUE OVERLAY */}
        <div className={`absolute inset-0 z-[60] bg-[#0B1320] transition-transform duration-300 flex flex-col pointer-events-auto ${showQueue ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 sticky top-0 bg-[#0B1320] z-20 shadow-md">
            <button onClick={() => { setIsQueueEditMode(false); window.history.back(); }} className="p-2 -ml-2 text-white/80 active:opacity-50"><ChevronDown size={28} /></button>
            <span className="text-[15px] font-extrabold text-white">Queue</span>
            {isQueueEditMode ? (
               <button onClick={() => { setIsQueueEditMode(false); setSelectedQueueItems([]); }} className="text-[14px] font-bold text-[#1db954] active:opacity-50">Done</button>
            ) : (
               <button onClick={() => setIsQueueEditMode(true)} className="text-[14px] font-bold text-blue-200/80 active:opacity-50">Edit</button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto px-5 pb-32 relative scrollbar-hide" ref={queueContainerRef}>
            <span className="text-[14px] font-bold text-blue-200/60 block mb-6 uppercase tracking-wider">Playing from {playContext?.type || 'App'}</span>
            <div className="flex items-center justify-between w-full mb-8">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-12 h-12 flex-shrink-0 rounded-[4px] bg-[#131D30] overflow-hidden border border-[#1e293b]"><img src={displayImage} alt="cover" className="w-full h-full object-cover" /></div>
                <div className="flex flex-col min-w-0 pr-2 overflow-hidden"><span className="text-[16px] font-bold text-[#1db954] truncate">{displayTitle}</span><span className="text-[14px] font-medium text-blue-200/60 truncate">{displayArtists}</span></div>
              </div>
            </div>
            
            <span className="text-[16px] font-bold text-white block mb-4">Next in queue</span>
            <div className="flex flex-col relative">{RenderedQueue}</div>
          </div>
          
          <div className="absolute bottom-0 left-0 w-full bg-[#0B1320] border-t border-[#1e293b] pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 px-6 flex justify-between items-center z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
            {isQueueEditMode ? (
                <div className="flex items-center justify-between w-full">
                    <button onClick={() => {
                        if (selectedQueueItems.length === 0) return;
                        setUpcomingQueue(prev => { const arr = [...prev]; const toMove = selectedQueueItems.map(idx => prev[idx]); const remaining = arr.filter((_, i) => !selectedQueueItems.includes(i)); return [...toMove, ...remaining]; });
                        setSelectedQueueItems([]); setIsQueueEditMode(false);
                    }} className="text-white font-bold text-[13px] bg-white/10 px-4 py-2 rounded-full active:bg-white/20 transition-colors">Move to Top</button>
                    <span className="text-blue-200/50 text-[12px] font-bold">{selectedQueueItems.length} Selected</span>
                    <button onClick={() => {
                        if (selectedQueueItems.length === 0) return;
                        setUpcomingQueue(prev => prev.filter((_, i) => !selectedQueueItems.includes(i)));
                        setSelectedQueueItems([]); setIsQueueEditMode(false);
                    }} className="text-[#ff4444] font-bold text-[13px] bg-[#ff4444]/10 px-4 py-2 rounded-full active:bg-[#ff4444]/20 transition-colors">Remove</button>
                </div>
            ) : (
                <>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer" onClick={() => setIsShuffle(!isShuffle)}><Shuffle size={24} className={isShuffle ? 'text-[#1db954]' : 'text-blue-200/70'} /><span className={`text-[11px] font-bold ${isShuffle ? 'text-[#1db954]' : 'text-blue-200/70'}`}>Shuffle</span></div>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer" onClick={() => setRepeatMode((prev) => (prev + 1) % 3)}><div className="relative"><Repeat size={24} className={repeatMode > 0 ? 'text-[#1db954]' : 'text-blue-200/70'} />{repeatMode === 2 && <span className="absolute -top-1 -right-1 bg-[#1db954] text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">1</span>}</div><span className={`text-[11px] font-bold ${repeatMode > 0 ? 'text-[#1db954]' : 'text-blue-200/70'}`}>Repeat</span></div>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer text-blue-200/70" onClick={() => { setShowTimerMenu(true); window.history.pushState({ modal: 'timer' }, ''); activeOverlayRef.current = 'timer'; }}><div className={`relative ${sleepTimer ? 'text-[#1db954]' : 'text-blue-200/70'}`}><Timer size={24} /></div><span className={`text-[11px] font-bold ${sleepTimer ? 'text-[#1db954]' : 'text-blue-200/70'}`}>{timerRemaining ? formatSleepTimerStr(timerRemaining) : sleepTimer === 'end' ? 'Track End' : 'Timer'}</span></div>
                </>
            )}
          </div>
        </div>
      </div>

      {/* Mini Player Bar */}
      <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={openMainPlayer} className={`fixed bottom-[65px] left-[8px] right-[8px] h-[56px] rounded-lg z-[99990] cursor-pointer overflow-hidden transition-all duration-[400ms] shadow-[0_10px_20px_rgba(0,0,0,0.5)] border border-[#1e293b] ${isExpanded ? 'opacity-0 pointer-events-none translate-y-6 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`} style={{ backgroundColor: dominantColor, transform: swipeX > 0 && !showQueue && !showSettingsMenu && !isExpanded ? `translateX(${swipeX}px)` : undefined, transition: swipeX === 0 && !isExpanded ? 'transform 0.4s ease-out, opacity 0.4s' : 'none' }}>
        <div className="absolute inset-0 bg-[#0B1320]/60 z-0 pointer-events-none backdrop-blur-md" />
        <div className="relative z-10 w-full h-full flex items-center px-2">
          <div className="w-[40px] h-[40px] flex-shrink-0 rounded-[4px] shadow-sm overflow-hidden bg-[#131D30] border border-[#1e293b] relative mr-3">
            {loading && <div className="absolute inset-0 bg-[#0B1320]/60 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-white" /></div>}
            {displayImage && <img src={displayImage} alt="cover" className="w-full h-full object-cover" />}
          </div>
          <div className="flex flex-col flex-1 min-w-0 pr-3 justify-center"><MarqueeText text={displayTitle} className="text-[13px] font-extrabold text-white leading-tight mb-[2px] w-full" /><MarqueeText text={displayArtists} className="text-[12px] font-medium text-blue-200/60 leading-tight w-full" /></div>
          <div className="flex items-center gap-4 flex-shrink-0 pr-2 text-white">
            <button className="active:scale-75 transition-transform flex items-center justify-center w-[24px] h-[24px]" onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); if(isPlaying) audioRef.current?.pause(); else { ensureAudioActive(); audioRef.current?.play(); } }}>
               {loading ? <Loader2 size={24} className="animate-spin text-white" /> : (isPlaying ? <Pause fill="white" stroke="white" size={24} /> : <Play fill="white" stroke="white" size={24} className="translate-x-[1px]" />)}
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/20 rounded-full z-20 pointer-events-none overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} /></div>
      </div>
    </>
  );
}
