

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

// --- 5-HOUR INDEXEDDB CACHE ENGINE ---
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

// --- AUTH ENGINE FOR AK47 API ---
const getCachedAuth = () => {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem('spotify_app_auth');
    if (cached) {
      const authData = JSON.parse(cached);
      if (Date.now() < (authData.accessTokenExpirationTimestampMs - 10000)) return authData;
    }
  } catch (e) {}
  return null;
};

let ongoingAuthPromise: Promise<any> | null = null;
const getAuthData = async () => {
  const cachedAuth = getCachedAuth();
  if (cachedAuth) return cachedAuth;
  if (ongoingAuthPromise) return ongoingAuthPromise;
  ongoingAuthPromise = (async () => {
    try {
      const response = await fetch('https://serverayush.vercel.app/api/auth');
      const data = await response.json();
      if (typeof window !== "undefined") localStorage.setItem('spotify_app_auth', JSON.stringify(data));
      return data;
    } catch (error) { return null; } finally { ongoingAuthPromise = null; }
  })();
  return ongoingAuthPromise;
};

// --- UTILS ---
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
  if (!item) return null;
  let img = item.artwork_large || item.artwork_web || item.atw || item.artwork || item.image || item;
  if (typeof img === "string" && img.trim() !== "") {
     return img.replace(/size_[ms]/gi, "size_l").replace("150x150", "500x500").replace("50x50", "500x500").split('?')[0];
  }
  if (Array.isArray(img) && img[0]?.url) {
     return (img[img.length - 1]?.url || img[0]?.url).split('?')[0];
  }
  return null;
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

// --- AK47 SPECIFIC MATCHER ---
const performAK47Matching = (results: any[], targetTrack: string, targetArtist: string): any => {
    if (!results || results.length === 0) return null;
    const clean = (s: string) => decodeEntities(s || "").toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
    const tTitle = clean(targetTrack);
    const tArtist = clean(targetArtist);
    let bestMatch = null; let highestScore = 0;

    results.forEach((track) => {
        if (!track) return;
        const rTitle = clean(track.song_name || track.name || track.title);
        const rArtists = clean(track.artist || track.artists || (track.artists?.items ? track.artists.items.map((a:any)=>a.profile?.name||a.name).join(' ') : ""));
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

// --- RAPIDAPI FALLBACK MATCHER ---
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

// --- NATIVE ID3 TAGGER ---
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

const loadHlsJS = () => new Promise((resolve, reject) => {
  if ((window as any).Hls) return resolve(true);
  const script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/npm/hls.js@1";
  script.onload = () => resolve(true);
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

type ModalState = 'player' | 'settings' | 'queue' | 'timer' | 'none';

export default function MiniPlayer() {
  const { 
    currentSong, isPlaying, setIsPlaying, setCurrentSong, 
    queue, upcomingQueue, setUpcomingQueue, historyQueue, setHistoryQueue,
    playContext, likedSongs, toggleLikeSong 
  } = useAppContext();
  
  const[audioUrl, setAudioUrl] = useState("");
  const[streamBaseUrl, setStreamBaseUrl] = useState<string | null>(null);
  const[loading, setLoading] = useState(false);
  const[progress, setProgress] = useState(0);
  const[bufferedProgress, setBufferedProgress] = useState(0);
  const[currentTime, setCurrentTime] = useState(0);
  const[duration, setDuration] = useState(0);
  const[volume, setVolume] = useState(100);
  const[retryCount, setRetryCount] = useState(0);
  
  const[isExpanded, setIsExpanded] = useState(false);
  const[showQueue, setShowQueue] = useState(false);
  const[showSettingsMenu, setShowSettingsMenu] = useState(false);
  const[showTimerMenu, setShowTimerMenu] = useState(false);
  
  const activeOverlayRef = useRef<ModalState>('none');

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
  const playNextRef = useRef<() => void>(() => {});
  const playPrevRef = useRef<() => void>(() => {});
  const isVideoModeRef = useRef<boolean>(false);
  const[swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const isSwipingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<any>(null); // NATIVE HLS.JS REFERENCE
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
  const[isSessionRestored, setIsSessionRestored] = useState(false);
  const[isFetchingRecsUI, setIsFetchingRecsUI] = useState(false);
  
  const QUALITY_MAP: Record<string, string> = { "16": "Low", "64": "Medium", "128": "High", "320": "HD" };
  const[selectedQuality, setSelectedQuality] = useState("320");
  const[lineFontSize, setLineFontSize] = useState("Medium");
  const[cardFontSize, setCardFontSize] = useState("Medium");
  const[isCanvasEnabled, setIsCanvasEnabled] = useState(true);
  const[isLyricsEnabled, setIsLyricsEnabled] = useState(true);
  const[lyricsServer, setLyricsServer] = useState("spotify");
  const[isWordSyncEnabled, setIsWordSyncEnabled] = useState(true);
  const[isMiniWordSyncEnabled, setIsMiniWordSyncEnabled] = useState(true);
  const restoreTimeRef = useRef<number | null>(null);

  const isCanvasEnabledRef = useRef(true);
  const isLyricsEnabledRef = useRef(true);

  const[dlState, setDlState] = useState<{type: "music" | "video" | null, status: string, options?: any[], progress?: number, packStep?: string, server?: number}>({type: null, status: "idle", progress: 0, server: 1});

  const isSongLiked = likedSongs.some((s: any) => s && (s.id || s.track_id) === (currentSong?.id || currentSong?.track_id));
  const handleLikeClick = (e: any) => { e.stopPropagation(); toggleLikeSong(currentSong); };

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
          if (elapsed < duration) {
              (container as any)._scrollRaf = requestAnimationFrame(animation);
          }
      };
      (container as any)._scrollRaf = requestAnimationFrame(animation);
  },[]);

  const pushModalState = (modalName: ModalState) => {
      window.history.pushState({ modal: modalName }, '');
      activeOverlayRef.current = modalName;
  };

  const openMainPlayer = () => {
      if (!isExpanded) {
          setIsExpanded(true); setShowQueue(false); setShowSettingsMenu(false); setShowTimerMenu(false);
          pushModalState('player');
      }
  };
  const openSettings = (e: React.MouseEvent) => { e.stopPropagation(); setShowSettingsMenu(true); pushModalState('settings'); };
  const openQueue = () => { setShowQueue(true); pushModalState('queue'); };
  const openTimer = () => { setShowTimerMenu(true); pushModalState('timer'); };
  const closePlayerForNavigation = () => { setIsExpanded(false); setShowQueue(false); setShowSettingsMenu(false); setShowTimerMenu(false); activeOverlayRef.current = 'none'; };

  useEffect(() => {
      const handlePopState = (e: PopStateEvent) => {
          const modal = e.state?.modal as ModalState;
          const validModals: ModalState[] = ['player', 'settings', 'queue', 'timer', 'none'];
          activeOverlayRef.current = validModals.includes(modal) ? modal : 'none';

          if (modal === 'timer') { setShowTimerMenu(true); setShowQueue(false); setShowSettingsMenu(false); setIsExpanded(true); }
          else if (modal === 'queue') { setShowQueue(true); setShowTimerMenu(false); setShowSettingsMenu(false); setIsExpanded(true); }
          else if (modal === 'settings') { setShowSettingsMenu(true); setShowTimerMenu(false); setShowQueue(false); setIsExpanded(true); }
          else if (modal === 'player') { setIsExpanded(true); setShowQueue(false); setShowSettingsMenu(false); setShowTimerMenu(false); }
          else { setIsExpanded(false); setShowQueue(false); setShowSettingsMenu(false); setShowTimerMenu(false); }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  },[]);

  const handleShareSong = async () => {
    try {
      let path = currentSong.perma_url || currentSong.url || "";
      if (path && path.includes('jiosaavn.com')) path = new URL(path).pathname;
      const vId = ytVideoId || currentSong.prefetchedYtId || '';
      const sId = spotifyId || currentSong.spotifyId || '';
      const shareUrl = `${window.location.origin}/play${path}?token=${vId}&signature=${sId}`;

      if (navigator.share) {
        try { await navigator.share({ url: shareUrl }); } 
        catch(e) { await navigator.clipboard.writeText(shareUrl); alert("Link copied to clipboard!"); }
      } else { 
        await navigator.clipboard.writeText(shareUrl); alert("Link copied to clipboard!"); 
      }
    } catch (e) { console.error("Error sharing:", e); }
    window.history.back(); 
  };

  // --- HLS.JS ENGINE SETUP & ATTACHMENT ---
  useEffect(() => {
      if (!audioUrl || !audioRef.current) return;
      
      const setupAudio = async () => {
          if (hlsRef.current) {
              hlsRef.current.destroy();
              hlsRef.current = null;
          }

          if (audioUrl.includes('.m3u8')) {
              await loadHlsJS();
              const Hls = (window as any).Hls;
              if (Hls && Hls.isSupported()) {
                  const hls = new Hls({
                      maxBufferLength: 30,
                      maxMaxBufferLength: 600,
                      enableWorker: true
                  });
                  hlsRef.current = hls;
                  hls.loadSource(audioUrl);
                  hls.attachMedia(audioRef.current!);
                  
                  hls.on(Hls.Events.MANIFEST_PARSED, () => {
                      if (isPlaying && !isVideoMode) audioRef.current?.play().catch(()=>{});
                  });

                  hls.on(Hls.Events.ERROR, (event: any, data: any) => {
                      if (data.fatal) {
                          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                              if (navigator.onLine) hls.startLoad();
                          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                              hls.recoverMediaError();
                          } else {
                              if (data.response?.code === 403 || data.response?.code === 401) {
                                  localStorage.removeItem('gaana_hls_auth');
                                  setTimeout(() => { setRetryCount(c => c + 1); }, 1500);
                              }
                              hls.destroy();
                          }
                      }
                  });
              } else if (audioRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
                  audioRef.current.src = audioUrl;
                  if (isPlaying && !isVideoMode) audioRef.current?.play().catch(()=>{});
              }
          } else {
              audioRef.current.src = audioUrl;
              if (isPlaying && !isVideoMode) audioRef.current?.play().catch(()=>{});
          }
      };

      setupAudio();

      return () => {
          if (hlsRef.current) {
              hlsRef.current.destroy();
              hlsRef.current = null;
          }
      };
  },[audioUrl]);

  // ADVANCED AUTO-RESUME NETWORK HANDLER
  useEffect(() => {
    const handleOnline = () => {
        if (hlsRef.current) {
            hlsRef.current.startLoad();
        }
        if (isPlaying && audioRef.current && audioRef.current.readyState < 3) {
            setLoading(true);
            audioRef.current.play().catch(()=>{});
        }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isVideoModeRef.current) {
        setIsVideoMode(false);
        if (audioRef.current) {
           audioRef.current.currentTime = videoStartTimeRef.current; 
           audioRef.current.play().catch(()=>{});
        }
      }
    };
    window.addEventListener('online', handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
        window.removeEventListener('online', handleOnline);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  },[isPlaying]);

  useEffect(() => {
    let interval: any;
    if (typeof sleepTimer === 'number' && sleepTimer > 0) {
        setTimerRemaining(sleepTimer * 60);
        interval = setInterval(() => {
            setTimerRemaining(prev => {
                if (prev !== null && prev <= 1) {
                    setIsPlaying(false);
                    setSleepTimer(null);
                    if (audioRef.current) audioRef.current.pause();
                    return null;
                }
                return prev ? prev - 1 : null;
            });
        }, 1000);
    } else {
        setTimerRemaining(null);
    }
    return () => clearInterval(interval);
  },[sleepTimer]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
       const q = localStorage.getItem('audio_quality'); if (q) setSelectedQuality(q);
       const lf = localStorage.getItem('line_font_size'); if (lf) setLineFontSize(lf);
       const cf = localStorage.getItem('card_font_size'); if (cf) setCardFontSize(cf);
       const c = localStorage.getItem('canvas_enabled'); if (c !== null) { setIsCanvasEnabled(c === 'true'); isCanvasEnabledRef.current = c === 'true'; }
       const l = localStorage.getItem('lyrics_enabled'); if (l !== null) { setIsLyricsEnabled(l === 'true'); isLyricsEnabledRef.current = l === 'true'; }
       const ls = localStorage.getItem('lyrics_server'); if (ls !== null) setLyricsServer(ls);
       const ws = localStorage.getItem('word_sync_enabled'); if (ws !== null) setIsWordSyncEnabled(ws === 'true');
       const mws = localStorage.getItem('mini_word_sync_enabled'); if (mws !== null) setIsMiniWordSyncEnabled(mws === 'true');

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

  const rawTitle = currentSong ? decodeEntities(currentSong.track_title || currentSong.title || currentSong.name || "Unknown") : "";
  const rawArtists = currentSong ? decodeEntities(getArtistsText(currentSong)) : "";
  const rawImage = currentSong ? getImageUrl(currentSong) : null;

  const displayTitle = songDetails?.track_title ? decodeEntities(songDetails.track_title) : rawTitle;
  const displayArtists = songDetails ? decodeEntities(getArtistsText(songDetails)) : rawArtists;
  const displayImage = songDetails ? getImageUrl(songDetails) || rawImage : rawImage;
  
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

  const buildGaanaUrl = (albumId: string, trackId: string, quality: string, authString: string) => {
     if (!albumId || !trackId || !authString) return null;
     const paddedAlbumId = albumId.toString().padStart(2, '0');
     const last2 = paddedAlbumId.slice(-2);
     return `https://vodhlsgaana-ebw.akamaized.net/hls/${last2}/${albumId}/${trackId}/${quality}/${authString}/index.m3u8`;
  };

  const parseGaanaLyrics = (lrcString: string) => {
      const parsed: any[] =[];
      lrcString.split('\n').forEach((line: string) => {
          const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
          if (match && match[3].trim()) parsed.push({ time: parseInt(match[1]) * 60 + parseFloat(match[2]), words: match[3].trim() });
      });
      return parsed;
  };

  // MAIN TRACK CHANGE & HLS URL ENGINE
  useEffect(() => {
    if (!currentSong) return;
    let isCurrent = true; let loadTimer: any;
    fetchingRecsRef.current = false;
    mediaMetadataSetRef.current = false;
    hasCachedCurrentSongRef.current = false;
    
    const trackId = currentSong.track_id || currentSong.id || currentSong.entity_id;

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
    setBufferedProgress(0);

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

    // --- INTELLIGENT GAANA FETCH LOGIC ---
    const fetchGaanaData = async () => {
        setLoading(true);
        const targetQ = selectedQuality || "128";

        try {
            let sDetails = null;
            const infoRes = await fetch(`https://gaanaayush.vercel.app/api/superserch/track/info?track_id=${trackId}`);
            const infoJson = await infoRes.json();
            if (infoJson.data) { sDetails = infoJson.data; if (isCurrent) setSongDetails(infoJson.data); }

            let streamSuccess = false;
            let cachedAuth = null;
            try {
                const storedAuth = localStorage.getItem('gaana_hls_auth');
                if (storedAuth) {
                    const parsed = JSON.parse(storedAuth);
                    if (parsed.exp > Date.now() + 60000) cachedAuth = parsed.auth; 
                }
            } catch(e) {}

            if (cachedAuth && sDetails?.album_id) {
                const builtUrl = buildGaanaUrl(sDetails.album_id.toString(), trackId.toString(), targetQ, cachedAuth);
                if (builtUrl) {
                    setAudioUrl(builtUrl);
                    streamSuccess = true;
                }
            }

            // Fallback Stream API (Extracts Auth token with global acl=/* for caching)
            if (!streamSuccess) {
                const streamRes = await fetch(`https://gaanaayush.vercel.app/api/stream/${trackId}`);
                const streamJson = await streamRes.json();
                
                let extractedAuth = null;
                if (streamJson.data?.url) {
                    const authMatch = streamJson.data.url.match(/(hdntl=exp=\d+~acl=(?:%2f|\/)\*~data=hdntl~hmac=[a-f0-9]+)/i);
                    if (authMatch) {
                        extractedAuth = authMatch[1].replace(/%2f/gi, '/');
                        const expMatch = extractedAuth.match(/exp=(\d+)/);
                        if (expMatch) {
                            localStorage.setItem('gaana_hls_auth', JSON.stringify({ auth: extractedAuth, exp: parseInt(expMatch[1]) * 1000 }));
                        }
                    }
                }

                // ALWAYS USE API GENERATED HLS URL FIRST TIME! 
                let finalUrl = "";
                if (streamJson.data?.hlsUrl) {
                    finalUrl = streamJson.data.hlsUrl.replace(/(16|64|128|320)\.mp4\.master\.m3u8/i, `${targetQ}.mp4.master.m3u8`);
                } else if (streamJson.data?.url) {
                    finalUrl = streamJson.data.url;
                }
                if (finalUrl && isCurrent) setAudioUrl(finalUrl);
            }
            
            triggerLyricsAndSpotifyMatch(sDetails || currentSong);
        } catch(e) { triggerLyricsAndSpotifyMatch(currentSong); }
        if (isCurrent) setLoading(false);
    };

    // COMBINED LYRICS AND SPOTIFY MATCH ENGINE
    const triggerLyricsAndSpotifyMatch = async (songData: any) => {
       const searchArtist = instantArtists ? instantArtists.split(',').slice(0, 3).join(' ') : "";
       const query = `${instantTitle} ${searchArtist}`.trim();
       
       let matchedSpotifyId = null; let matchedSpotifyUrl = null;

       try {
         const auth = await getAuthData();
         if (auth && auth.clientId && auth.accessToken) {
             const akRes = await fetch(`https://ak47ayush.vercel.app/search?q=${encodeURIComponent(query)}&CID=${auth.clientId}&token=${auth.accessToken}&limit=25&offset=0`);
             if (akRes.ok && isCurrent) {
                const akData = await akRes.json();
                const tracks = akData.data || akData.tracks || akData.results || akData;
                const arr = Array.isArray(tracks) ? tracks : (tracks.items || [tracks]);
                
                if (arr && arr.length > 0) {
                   const match = performAK47Matching(arr, instantTitle, searchArtist);
                   if (match) {
                      const sId = match.id || match.spotify_url?.split('/track/')[1]?.split('?')[0] || match.external_urls?.spotify?.split('/track/')[1]?.split('?')[0];
                      const sUrl = match.spotify_url || match.external_urls?.spotify || `https://open.spotify.com/track/${sId}`;
                      if (sId) { matchedSpotifyId = sId; matchedSpotifyUrl = sUrl; }
                   }
                }
             }
         }
       } catch (e) {}

       if (!matchedSpotifyId) {
         try {
           const searchUrl = `https://${RAPID_API_HOST}/search?q=${encodeURIComponent(query)}&type=tracks&limit=1`;
           const response = await fetch(searchUrl, { headers: { 'x-rapidapi-key': RAPID_KEYS[0], 'x-rapidapi-host': RAPID_API_HOST } });
           if (response.ok && isCurrent) { 
              const data = await response.json(); 
              const match = performMatching(data, instantTitle, searchArtist);
              if (match) {
                 matchedSpotifyId = match.id; matchedSpotifyUrl = `https://open.spotify.com/track/${match.id}`;
              }
           }
         } catch (e) {}
       }

       if (matchedSpotifyId && isCurrent) {
           setSpotifyId(matchedSpotifyId); setSpotifyUrl(matchedSpotifyUrl);
           if (isCanvasEnabledRef.current) {
              const canvasRes = await fetch(`https://ayush-gamma-coral.vercel.app/api/canvas?trackId=${matchedSpotifyId}`);
              if (canvasRes.ok) { const canvasJson = await canvasRes.json(); if (canvasJson?.canvasesList?.length > 0) setCanvasData(canvasJson.canvasesList[0]); }
           }
       }

       // Smart Lyrics Fetcher
       if (!isCurrent || !isLyricsEnabledRef.current) return;
       let lrcFound = false;

       if (lyricsServer === "spotify" && matchedSpotifyUrl) {
           try {
               const lyricsRes = await fetch(`https://lyr-nine.vercel.app/api/lyrics?url=${encodeURIComponent(matchedSpotifyUrl)}&format=lrc`);
               if (lyricsRes.ok) {
                   const lyricsJson = await lyricsRes.json();
                   if (lyricsJson.lines && lyricsJson.lines.length > 0) {
                       setLyrics(lyricsJson.lines.map((l: any) => ({ time: parseTimeTag(l.timeTag), words: l.words }))); 
                       setSyncType(lyricsJson.syncType);
                       lrcFound = true;
                   }
               }
           } catch(e) {}
       }

       if (!lrcFound || lyricsServer === "gaana") {
           try {
               const lrcRes = await fetch(`https://gaanaayush.vercel.app/api/lrc?id=${trackId}`);
               if (lrcRes.ok) {
                   const lrcJson = await lrcRes.json();
                   if (lrcJson.data?.lyrics) {
                       const parsed = parseGaanaLyrics(lrcJson.data.lyrics);
                       if (parsed.length > 0) {
                           setLyrics(parsed); setSyncType("LINE_SYNCED"); lrcFound = true;
                       }
                   }
               }
           } catch(e) {}
       }

       if (!lrcFound && lyricsServer === "gaana" && matchedSpotifyUrl) {
           try {
               const lyricsRes = await fetch(`https://lyr-nine.vercel.app/api/lyrics?url=${encodeURIComponent(matchedSpotifyUrl)}&format=lrc`);
               if (lyricsRes.ok) {
                   const lyricsJson = await lyricsRes.json();
                   if (lyricsJson.lines && lyricsJson.lines.length > 0) {
                       setLyrics(lyricsJson.lines.map((l: any) => ({ time: parseTimeTag(l.timeTag), words: l.words }))); 
                       setSyncType(lyricsJson.syncType);
                   }
               }
           } catch(e) {}
       }
    };

    loadTimer = setTimeout(() => { fetchGaanaData(); }, 150);
    return () => { isCurrent = false; clearTimeout(loadTimer); };
  },[currentSong, selectedQuality, lyricsServer, retryCount]);

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
        if (!isSeekingRef.current) setCurrentTime(e.data.time);
        
        const newDur = e.data.duration || duration;
        if (newDur && duration !== newDur) setDuration(newDur);
        
        if (newDur > 0 && !isSeekingRef.current) {
           setProgress((e.data.time / newDur) * 100);
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
  },[isVideoMode, duration, upcomingQueue]);

  const handlePlayPauseToggle = (e?: any) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const newState = !isPlaying;
    setIsPlaying(newState);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = newState ? 'playing' : 'paused';
    
    if (isVideoMode && videoIframeRef.current?.contentWindow) {
      videoIframeRef.current.contentWindow.postMessage({ type: newState ? 'MUSIC_PLAY' : 'MUSIC_PAUSE' }, '*');
    } else {
      if (newState) {
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
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) playPromise.catch(()=>{});
        setIsPlaying(true);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; 
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
    else if (audioRef.current) { 
        const p = audioRef.current.play(); if(p!==undefined) p.catch(()=>{}); setIsPlaying(true); 
    }
    setIsVideoLoading(false);
  };

  // --- VIBRANT SAAVN COLOR EXTRACTOR ---
  useEffect(() => {
    if (!displayImage) return;
    const img = new Image(); img.crossOrigin = "Anonymous"; 
    img.src = `https://wsrv.nl/?url=${encodeURIComponent(displayImage)}&w=50&h=50&output=jpg`;
    
    img.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 50; canvas.height = 50; 
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.drawImage(img, 0, 0, 50, 50);
      try {
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 16) {
           const r = data[i], g = data[i+1], b = data[i+2];
           const max = Math.max(r, g, b), min = Math.min(r, g, b);
           const sat = max === 0 ? 0 : (max - min) / max;
           if (sat > 0.35 && max > 60 && max < 240) { 
               rSum += r; gSum += g; bSum += b; count++;
           }
        }
        
        if (count > 5) {
            setDominantColor(`rgb(${Math.floor(rSum/count)}, ${Math.floor(gSum/count)}, ${Math.floor(bSum/count)})`);
        } else {
            let tr=0, tg=0, tb=0, tc=0;
            for(let i=0; i<data.length; i+=16){
                const r = data[i], g = data[i+1], b = data[i+2];
                if(r>20 && g>20 && b>20){ tr+=r; tg+=g; tb+=b; tc++; }
            }
            setDominantColor(tc > 0 ? `rgb(${Math.floor(tr/tc)}, ${Math.floor(tg/tc)}, ${Math.floor(tb/tc)})` : "rgb(40, 40, 40)");
        }
      } catch (e) { setDominantColor("rgb(30, 30, 30)"); }
    };
    img.onerror = () => { setDominantColor("rgb(40, 40, 40)"); }
  },[displayImage]);

  useEffect(() => {
    let timeoutId: any;
    const video = canvasVideoRef.current;
    if (!video) return;

    const shouldPlay = isPlaying && !isScrolledPastMain && isExpanded && !showQueue && !isVideoMode && !isLyricsFullScreen && isCanvasEnabled;

    if (shouldPlay) {
      if (video.paused) {
        timeoutId = setTimeout(() => {
          const p = video.play();
          if (p !== undefined) p.catch(() => {});
        }, 150);
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
    return () => clearTimeout(timeoutId);
  },[isPlaying, isScrolledPastMain, isCanvasLoaded, isExpanded, showQueue, isVideoMode, isLyricsFullScreen, isCanvasEnabled, canvasData]);

  const playNext = () => {
    if (sleepTimer === 'end') { setIsPlaying(false); setSleepTimer(null); if (audioRef.current) audioRef.current.pause(); return; }

    if (isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*');
    
    if (repeatMode === 2 && audioRef.current) { 
      audioRef.current.currentTime = 0; 
      setRepeatMode(0); 
      const p = audioRef.current.play(); 
      if (p!==undefined) p.catch(()=>{}); 
      return; 
    }

    if (isShuffle && upcomingQueue.length > 0) {
      const randomIdx = Math.floor(Math.random() * upcomingQueue.length); const nextSong = upcomingQueue[randomIdx];
      setUpcomingQueue(prev => prev.filter((_: any, i: number) => i !== randomIdx));
      setCurrentSong(nextSong); setIsPlaying(true); 
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      return;
    }
    if (upcomingQueue.length > 0) { 
      const nextSong = upcomingQueue[0]; setUpcomingQueue(prev => prev.slice(1)); setCurrentSong(nextSong); setIsPlaying(true); 
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } else if (repeatMode === 1 && queue && queue.length > 0) { 
      setCurrentSong(queue[0]); setIsPlaying(true); 
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } 
    else { setIsPlaying(false); setProgress(0); }
  };

  const playPrev = () => {
    if (isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*');
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    if (historyQueue.length > 0) {
      isNavigatingBackRef.current = true;
      const prevSong = historyQueue[0]; setHistoryQueue(prev => prev.slice(1)); setUpcomingQueue(prev =>[currentSong, ...prev]);
      setCurrentSong(prevSong); setIsPlaying(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } else {
      if (!queue || queue.length === 0) return;
      const idx = queue.findIndex((s: any) => s.id === currentSong.id);
      if (idx > 0) { 
          isNavigatingBackRef.current = true;
          setCurrentSong(queue[idx - 1]); setIsPlaying(true); 
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      }
    }
  };

  useEffect(() => { playNextRef.current = playNext; playPrevRef.current = playPrev; isVideoModeRef.current = isVideoMode; },[playNext, playPrev, isVideoMode]);

  const syncPosition = useCallback(() => {
    if ('mediaSession' in navigator && audioRef.current) {
      const d = audioRef.current.duration;
      const c = audioRef.current.currentTime;
      if (d > 0 && c >= 0 && c <= d && !isNaN(d) && !isNaN(c)) {
        try { navigator.mediaSession.setPositionState({ duration: d, playbackRate: audioRef.current.playbackRate || 1, position: c }); } catch(e) {}
      }
    }
  },[]);

  // MEDIA METADATA ENGINE (FOR NOTIFICATION - FLAWLESS SYNC)
  useEffect(() => {
    if ('mediaSession' in navigator && displayTitle) {
       try {
           navigator.mediaSession.metadata = new MediaMetadata({
              title: displayTitle, artist: displayArtists, album: playContext?.name || 'App',
              artwork: displayImage ?[{ src: displayImage, sizes: '512x512', type: 'image/jpeg' }] :[]
           });
       } catch (e) {}
       
       navigator.mediaSession.setActionHandler('play', () => {
          setIsPlaying(true); navigator.mediaSession.playbackState = 'playing';
          if (isVideoModeRef.current && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_PLAY' }, '*');
          else if (audioRef.current) { 
              const p = audioRef.current.play(); if (p !== undefined) p.catch(()=>{}); 
          }
       });
       navigator.mediaSession.setActionHandler('pause', () => {
          setIsPlaying(false); navigator.mediaSession.playbackState = 'paused';
          if (isVideoModeRef.current && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_PAUSE' }, '*');
          else if (audioRef.current) audioRef.current.pause();
       });
       navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current());
       navigator.mediaSession.setActionHandler('nexttrack', () => playNextRef.current());
       navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && audioRef.current) {
            audioRef.current.currentTime = details.seekTime; setCurrentTime(details.seekTime); syncPosition();
          }
       });
    }
  },[displayTitle, displayArtists, displayImage, playContext, currentSong]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
       navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  },[isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isVideoMode) {
      const c = audioRef.current.currentTime; const d = audioRef.current.duration;
      
      const now = Date.now();
      if (!isSeekingRef.current && now - lastTimeUpdateRef.current < 250) {
         if (isLyricsEnabled && syncType === "LINE_SYNCED" && lyrics.length > 0) {
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

        if (currentPercent >= 98 && !hasCachedCurrentSongRef.current && audioUrl && !audioUrl.startsWith('blob:')) {
            hasCachedCurrentSongRef.current = true;
            (async () => {
                try {
                    const audioRes = await fetch(audioUrl);
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

  // NATIVE AUDIO PROGRESS LISTENER FOR SAAVN-STYLE PRELOAD BAR
  const handleProgress = () => {
     if (audioRef.current && audioRef.current.duration > 0) {
         const buffered = audioRef.current.buffered;
         if (buffered.length > 0) {
             const bEnd = buffered.end(buffered.length - 1);
             setBufferedProgress((bEnd / audioRef.current.duration) * 100);
         }
     }
  };

  // HIGHLY OPTIMIZED APPLE-MUSIC STYLE WORD SYNC ENGINE
  useEffect(() => {
    if (!isWordSyncEnabled || !isLyricsEnabled || isVideoMode || activeLyricIndex < 0 || !lyrics[activeLyricIndex]) {
        return;
    }

    let animationFrameId: number;
    const updateProgress = () => {
        if (audioRef.current) {
            const currentTime = audioRef.current.currentTime + 0.4;
            const currentLineTime = lyrics[activeLyricIndex].time;
            let nextLineTime = lyrics[activeLyricIndex + 1]?.time;
            if (!nextLineTime) nextLineTime = currentLineTime + 4;

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
                } else {
                    totalChars = parseInt(container.dataset.totalChars || '0', 10);
                }
                
                if (totalChars === 0) return;
                
                let charAccumulator = 0;
                words.forEach((wordNode: any) => {
                    const wordLen = (wordNode.textContent || '').length;
                    const wordStartPct = (charAccumulator / totalChars) * 100;
                    const wordEndPct = ((charAccumulator + wordLen) / totalChars) * 100;

                    if (boundedProgress >= wordEndPct) {
                        if (wordNode._lastProg !== 120) {
                            wordNode._lastProg = 120;
                            wordNode.style.setProperty('--p', '120%');
                        }
                    } else if (boundedProgress <= wordStartPct) {
                        if (wordNode._lastProg !== -15) {
                            wordNode._lastProg = -15;
                            wordNode.style.setProperty('--p', '-15%');
                        }
                    } else {
                        const localProgress = ((boundedProgress - wordStartPct) / (wordEndPct - wordStartPct)) * 120;
                        if (Math.abs((wordNode._lastProg || 0) - localProgress) > 0.5) {
                            wordNode._lastProg = localProgress;
                            wordNode.style.setProperty('--p', `${localProgress.toFixed(1)}%`);
                        }
                    }
                    charAccumulator += wordLen;
                });
            };

            processContainer(fullActiveLyricRef.current, '.lyric-word-sync', isWordSyncEnabled);
            processContainer(activeLyricRef.current, '.lyric-word-sync', isWordSyncEnabled);
            processContainer(miniActiveLyricRef.current, '.lyric-word-sync', isMiniWordSyncEnabled);
        }
        
        if (isPlaying && isExpanded) {
            animationFrameId = requestAnimationFrame(updateProgress);
        }
    };

    if (isPlaying && isExpanded) {
        animationFrameId = requestAnimationFrame(updateProgress);
    } else {
        updateProgress(); 
    }

    return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); };
  },[isWordSyncEnabled, isMiniWordSyncEnabled, isLyricsEnabled, isVideoMode, activeLyricIndex, lyrics, isPlaying, isExpanded]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrolled = e.currentTarget.scrollTop > 100;
    if (scrolled !== isScrolledPastMain) setIsScrolledPastMain(scrolled);
  },[isScrolledPastMain]);

  useEffect(() => {
    if (isSeekingRef.current || !isExpanded) return; 
    if (activeLyricRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current; const element = activeLyricRef.current;
      const scrollPos = element.offsetTop - container.offsetTop - 20; 
      customSmoothScroll(container, scrollPos, 800);
    }
    if (fullActiveLyricRef.current && fullLyricsContainerRef.current) {
      const container = fullLyricsContainerRef.current; const element = fullActiveLyricRef.current;
      const scrollPos = element.offsetTop - container.offsetTop - (container.clientHeight / 2) + 60; 
      customSmoothScroll(container, scrollPos, 800);
    }
  },[activeLyricIndex, isLyricsFullScreen, isExpanded, customSmoothScroll]);

  const handleLyricClick = (time: number) => {
    if (isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_SEEK', time: time }, '*');
    else if (audioRef.current && duration > 0) { audioRef.current.currentTime = time; setCurrentTime(time); syncPosition(); }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value); setProgress(val);
    const newTime = (val / 100) * duration; setCurrentTime(newTime);
    if (isLyricsEnabled && syncType === "LINE_SYNCED" && lyrics.length > 0) {
      let activeIdx = -1;
      const offsetTime = newTime + 0.4; 
      for (let i = 0; i < lyrics.length; i++) { if (lyrics[i].time <= offsetTime) activeIdx = i; else break; }
      if (activeIdx !== activeLyricIndex) setActiveLyricIndex(activeIdx);
    }
  };

  const handleSeekStart = () => { isSeekingRef.current = true; };

  const handleSeekEnd = (e: React.SyntheticEvent<HTMLInputElement>) => {
    isSeekingRef.current = false;
    const val = parseFloat(e.currentTarget.value);
    const newTime = (val / 100) * duration;
    
    if (isVideoMode && videoIframeRef.current?.contentWindow) {
      videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_SEEK', time: newTime }, '*');
      videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*');
    } else if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = newTime; syncPosition();
      if (isPlaying) { 
          const p = audioRef.current.play(); if (p !== undefined) p.catch(()=>{}); 
      }
    }
  };

  // SPOTIFY BUTTERY SMOOTH DIRECT DOM DRAG QUEUE ENGINE
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
            item.style.zIndex = '50';
            item.style.transition = 'none';
            item.style.backgroundColor = 'rgba(255,255,255,0.1)';
            item.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
        } else {
            let t = 0;
            if (activeIndex < i && targetIndex >= i) t = -60;
            else if (activeIndex > i && targetIndex <= i) t = 60;
            item.style.transform = t !== 0 ? `translateY(${t}px)` : 'none';
            item.style.zIndex = '1';
            item.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
            item.style.backgroundColor = 'transparent';
            item.style.boxShadow = 'none';
        }
    });
  },[upcomingQueue.length]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent, index: number) => {
    if (isQueueEditMode) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragRef.current = { activeIndex: index, startY: clientY, currentY: clientY, startScrollTop: queueContainerRef.current?.scrollTop || 0, scrollSpeed: 0, rafId: 0, targetIndex: index };
    setDragActiveIndex(index);
    
    const scrollLoop = () => {
        if (dragRef.current.scrollSpeed !== 0 && queueContainerRef.current) {
            queueContainerRef.current.scrollTop += dragRef.current.scrollSpeed;
            updateDOM();
        }
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
        if (clientY < rect.top + 80) dragRef.current.scrollSpeed = -12;
        else if (clientY > rect.bottom - 80) dragRef.current.scrollSpeed = 12;
        else dragRef.current.scrollSpeed = 0;
    }
    updateDOM();
  },[updateDOM]);

  const handleDragEnd = useCallback(() => {
    cancelAnimationFrame(dragRef.current.rafId);
    const { activeIndex, targetIndex } = dragRef.current;
    
    if (queueContainerRef.current) {
        const items = queueContainerRef.current.querySelectorAll('.queue-item');
        items.forEach((item: any) => {
            item.style.transform = '';
            item.style.zIndex = '';
            item.style.transition = '';
            item.style.backgroundColor = '';
            item.style.boxShadow = '';
        });
    }

    if (activeIndex !== -1 && targetIndex !== -1 && activeIndex !== targetIndex) {
      setUpcomingQueue(prev => {
         const arr =[...prev];
         const[moved] = arr.splice(activeIndex, 1);
         arr.splice(targetIndex, 0, moved);
         return arr;
      });
    }
    dragRef.current.activeIndex = -1;
    setDragActiveIndex(null);
  },[]);

  useEffect(() => {
    if (dragActiveIndex !== null) {
       window.addEventListener('touchmove', handleDragMove, { passive: false });
       window.addEventListener('touchend', handleDragEnd);
       window.addEventListener('mousemove', handleDragMove);
       window.addEventListener('mouseup', handleDragEnd);
       return () => {
         window.removeEventListener('touchmove', handleDragMove);
         window.removeEventListener('touchend', handleDragEnd);
         window.removeEventListener('mousemove', handleDragMove);
         window.removeEventListener('mouseup', handleDragEnd);
       };
    }
  },[dragActiveIndex, handleDragMove, handleDragEnd]);

  // SWIPE TO CLOSE MINI-PLAYER LOGIC
  const handleTouchStart = (e: React.TouchEvent) => { 
     touchStartX.current = e.touches[0].clientX; 
     isSwipingRef.current = false;
  };
  const handleTouchMove = (e: React.TouchEvent) => { 
     const diff = e.touches[0].clientX - touchStartX.current; 
     if (diff > 10) isSwipingRef.current = true; // Mark as swipe to prevent click
     if (diff > 0 && !showQueue) setSwipeX(diff); 
  };
  const handleTouchEnd = () => { 
     if (swipeX > window.innerWidth * 0.3 && !showQueue) { 
        setCurrentSong(null); setIsPlaying(false); setIsExpanded(false); 
        setShowQueue(false); setShowSettingsMenu(false); setShowTimerMenu(false);
        activeOverlayRef.current = 'none'; 
     } 
     setSwipeX(0); 
     setTimeout(() => { isSwipingRef.current = false; }, 100);
  };
  const handleMiniPlayerClick = (e: React.MouseEvent) => {
     if (isSwipingRef.current) return;
     openMainPlayer();
  };

  // --- 20X FASTER NATIVE MP3 PACKER ENGINE ---
  const executeMp3PackerDownload = async (url: string, quality: string) => {
    setDlState({ type: "music", status: "downloading", progress: 0, packStep: "Fetching Audio..." });
    try {
      await loadLameJS();
      setDlState(prev => ({...prev, packStep: "Downloading Media...", progress: 10}));
      
      const[audioResp, imgResp] = await Promise.all([
          fetch(url), fetch(displayImage || "https://via.placeholder.com/500")
      ]);
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
      
      for (let i = 0, len = samples.length; i < len; i++) {
          let s = samples[i];
          buffer[i] = s < 0 ? s * 32768 : s * 32767;
      }

      const mp3Data =[];
      const blockSize = 1152 * 500; 
      let lastYield = Date.now();
      
      for (let i = 0; i < buffer.length; i += blockSize) {
          const chunk = buffer.subarray(i, i + blockSize);
          const mp3buf = mp3encoder.encodeBuffer(chunk);
          if (mp3buf.length > 0) mp3Data.push(mp3buf);
          
          const now = Date.now();
          if (now - lastYield > 250) { 
              const pct = 40 + Math.floor((i / buffer.length) * 50);
              setDlState(prev => ({...prev, progress: pct}));
              await new Promise(r => setTimeout(r, 0)); 
              lastYield = Date.now();
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

      const taggedBuffer = NativeID3.tag({
          audio: mp3ArrayBuffer, image: coverBuffer,
          title: cleanTitle, artist: cleanArtist, album: cleanAlbum
      });

      setDlState(prev => ({...prev, progress: 100, packStep: "Complete!"}));
      const finalBlob = new Blob([taggedBuffer], { type: 'audio/mp3' });
      const dlUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement('a'); a.href = dlUrl; a.download = `${cleanTitle} - ${cleanArtist}.mp3`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });

    } catch (e) {
      console.warn("Packer failed, using raw fallback", e);
      const fallbackUrl = url.replace(".master.m3u8", "");
      const a = document.createElement("a"); a.href = fallbackUrl; a.target = "_blank"; a.download = `${decodeEntities(displayTitle)} - ${decodeEntities(displayArtists)}.mp4`; 
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });
    }
  };

  const executeBlobDownload = async (url: string, filename: string, isVideoMux: boolean = false) => {
    try {
      setDlState(prev => ({...prev, status: "downloading", progress: 0, packStep: "Downloading..."}));
      const res = await fetch(url);
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

      if (isVideoMux) {
         setDlState(prev => ({...prev, status: "merging", packStep: "Merging..."}));
         await new Promise(r => setTimeout(r, 2800)); 
      }

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

  const handleDownloadMusicInit = () => { 
      let opts: any[] =[];
      if (streamBaseUrl) {['16', '64', '128', '320'].forEach(q => {
              opts.push({ 
                  url: streamBaseUrl.replace(/(16|64|128|320)\.mp4\.master\.m3u8/i, `${q}.mp4`), 
                  quality: QUALITY_MAP[q], 
                  label: QUALITY_MAP[q], 
                  num: parseInt(q) 
              });
          });
      } else if (audioUrl) {
          opts.push({ url: audioUrl.replace(".master.m3u8", ""), quality: `High`, label: `High`, num: 128 });
      }
      setDlState({ type: "music", status: "options", options: opts.sort((a, b) => b.num - a.num) });
      window.history.back(); 
  };
  
  const handleDownloadVideoInit = () => { setDlState({ type: "video", status: "servers" }); window.history.back(); };

  const triggerVideoServer = async (serverNum: number) => {
    setDlState({ type: "video", status: "verifying", server: serverNum });
    setTimeout(async () => {
      setDlState(prev => prev.type === "video" ? { ...prev, status: "connecting" } : prev);
      try {
        const targetVid = ytVideoId || await prefetchVideoId(displayTitle, displayArtists);
        if (!targetVid) throw new Error("Video not found");
        const res = await fetch(`https://serverayush.vercel.app/api/cnd?id=${targetVid}&v=${serverNum}`);
        const data = await res.json();
        
        const mixed = data.VideoWithAudio ||[];
        const formatOptions = mixed.map((v:any) => ({ ...v, label: `${v.quality} Video`, isMuxed: true }));
        setDlState({ type: "video", status: "options", options: formatOptions, server: serverNum });
      } catch (e) {
        alert("Failed to connect to video server. Please try again."); setDlState({ type: null, status: "idle" });
      }
    }, 6000);
  };

  let albumRoute = `/album/${songDetails?.album_id || ''}`;
  if (songDetails?.albumseokey) albumRoute = `/album/${songDetails.albumseokey}`;

  const getCardFontSizeClass = (isFS: boolean) => {
      const s = cardFontSize;
      if (isFS) {
         return s === "Small" ? "text-[28px]" : s === "Large" ? "text-[40px]" : "text-[34px]";
      }
      return s === "Small" ? "text-[20px]" : s === "Large" ? "text-[30px]" : "text-[24px]";
  };

  const getLineFontSize = () => {
      const s = lineFontSize;
      return s === "Small" ? "text-[14px]" : s === "Large" ? "text-[20px]" : "text-[16px]";
  };

  const showTinyBanner = ((isCanvasLoaded && isCanvasEnabled && !isVideoMode && !isLyricsFullScreen) || isVideoMode || isLyricsFullScreen);

  // MEMOIZED FLICKER-FREE LYRICS ABOVE TITLE
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
            else { return null; } 
            
            return (
               <div key={idx} 
                     ref={diff === 0 ? miniActiveLyricRef : null}
                     className={`absolute left-0 w-full text-left pr-2 no-select-text font-extrabold drop-shadow-xl leading-snug transition-all duration-[1500ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${getLineFontSize()}`}
                     style={{ transform, opacity: op, color: 'white', zIndex: diff === 0 ? 10 : 1, transformOrigin: 'left center' }}>
                 {isMiniWordSyncEnabled ? (
                     (line.words || '♪').split(' ').map((word: string, wIdx: number, arr: any[]) => (
                         <span key={wIdx} className="lyric-word-sync inline">{word}{wIdx < arr.length - 1 ? ' ' : ''}</span>
                     ))
                 ) : (
                     line.words || "♪"
                 )}
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
        <p key={idx} 
           ref={isActive ? (isLyricsFullScreen ? fullActiveLyricRef : activeLyricRef) : null} 
           onClick={() => { if (syncType === "LINE_SYNCED" && !isVideoMode) handleLyricClick(line.time); }} 
           className={`cursor-pointer transition-all duration-[800ms] ease-out origin-left no-select-text transform ${isActive ? activeClasses : isPast ? pastClasses : futureClasses}`}>
           {isWordSyncEnabled ? (
              (line.words || '♪').split(' ').map((word: string, wIdx: number, arr: any[]) => (
                  <span key={wIdx} className={isActive ? "lyric-word-sync inline" : "inline"}>{word}{wIdx < arr.length - 1 ? ' ' : ''}</span>
              ))
           ) : (
              line.words || '♪'
           )}
        </p>
      )
    });
  },[lyrics, activeLyricIndex, isLyricsFullScreen, isLyricsEnabled, cardFontSize, isWordSyncEnabled, syncType, isVideoMode]);

  // UNIFIED & STRUCTURED CREDITS CARD
  const RenderedCredits = useMemo(() => {
    if (!songDetails) return null;
    
    const creditsGroups =[
      { title: "Singers", data: songDetails.singers },
      { title: "Composer", data: songDetails.composers },
      { title: "Lyricist", data: songDetails.lyricist },
      { title: "Cast", data: songDetails.cast },
    ].filter(g => g.data && Array.isArray(g.data) && g.data.length > 0);

    if (creditsGroups.length === 0) return null;

    return (
       <div className="w-full bg-[#1e1e1e] rounded-2xl p-5 shadow-2xl border border-white/5 relative overflow-hidden">
          <h3 className="text-white font-bold text-[18px] mb-6 drop-shadow-md relative z-10 no-select-text">Credits</h3>
          
          <div className="relative z-10 flex flex-col gap-6">
             {creditsGroups.map((group, idx) => (
                <div key={idx} className="flex flex-col w-full">
                   <span className="text-white/60 text-[12px] font-bold uppercase tracking-wider mb-4 pl-1">{group.title}</span>
                   <div className="flex overflow-x-auto gap-5 scrollbar-hide pb-2 pointer-events-auto">
                      {group.data.map((artist: any, i: number) => {
                         const artistImg = getImageUrl(artist);
                         const fallbackColor = getArtistColor(artist.name || "Unknown");
                         return (
                            <Link key={artist.artist_id || artist.e_id || i} href={`/artist/${artist.seokey}`} onClick={closePlayerForNavigation} className="flex flex-col items-center gap-2 flex-shrink-0 w-[110px] group no-select-text">
                              <div className="w-[110px] h-[110px] rounded-full overflow-hidden relative flex items-center justify-center shadow-lg border-2 border-white/10 group-hover:scale-105 transition-transform" style={{ backgroundColor: artistImg ? 'transparent' : fallbackColor }}>
                                {!artistImg ? <span className="text-white font-bold text-4xl no-select-text">{decodeEntities(artist.name).charAt(0).toUpperCase()}</span> : <img draggable={false} src={artistImg} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover relative z-10 no-select pointer-events-none" alt={artist.name} />}
                              </div>
                              <div className="flex flex-col items-center w-full px-1 mt-2 no-select-text">
                                <span className="text-white/95 text-[13px] text-center font-bold line-clamp-1 leading-tight drop-shadow-md">{decodeEntities(artist.name)}</span>
                              </div>
                            </Link>
                         )
                      })}
                   </div>
                </div>
             ))}
          </div>
       </div>
    );
  }, [songDetails]);

  const RenderedQueue = useMemo(() => {
    return upcomingQueue.map((track: any, index: number) => {
      const isSelected = selectedQueueItems.includes(index);
      return (
        <div key={(track.id||track.track_id||track.entity_id) + index} data-index={index}
          className={`queue-item flex items-center justify-between w-full group p-2 rounded-lg cursor-pointer relative bg-transparent hover:bg-white/5`}
        >
          {isQueueEditMode && (
            <div className="flex-shrink-0 mr-3 pl-1" onClick={(e) => {
               e.stopPropagation();
               setSelectedQueueItems(prev => {
                   if (prev.includes(index)) return prev.filter(i => i !== index);
                   return[...prev, index];
               });
            }}>
               <div className={`w-[22px] h-[22px] rounded-full border-[2px] flex items-center justify-center transition-colors ${isSelected ? 'bg-[#1db954] border-[#1db954]' : 'border-white/40'}`}>
                  {isSelected && <Check size={14} className="text-black stroke-[3px]" />}
               </div>
            </div>
          )}

          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0" onClick={() => { 
             if(isQueueEditMode) {
                 setSelectedQueueItems(prev => {
                     if (prev.includes(index)) return prev.filter(i => i !== index);
                     return[...prev, index];
                 });
                 return;
             }
             setCurrentSong(track); 
             setUpcomingQueue((prev: any) => prev.filter((_: any, i: number) => i !== index)); 
             setIsPlaying(true); 
          }}>
            <div className="w-[44px] h-[44px] flex-shrink-0 rounded-[4px] bg-[#282828] overflow-hidden">
               <img draggable={false} src={getImageUrl(track) || "https://via.placeholder.com/150"} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />
            </div>
            <div className="flex flex-col min-w-0 pr-2 overflow-hidden">
              <span className="text-[15px] font-bold text-white truncate">{decodeEntities(track.track_title || track.title || track.name)}</span>
              <span className="text-[13px] font-medium text-white/60 truncate">{decodeEntities(getArtistsText(track))}</span>
            </div>
          </div>

          {!isQueueEditMode && (
             <div className="flex-shrink-0 px-3 py-2 cursor-grab active:cursor-grabbing text-white/50 touch-none" 
                  onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, index); }}>
                 <Menu size={20} />
             </div>
          )}
        </div>
      );
    });
  },[upcomingQueue, selectedQueueItems, isQueueEditMode, setCurrentSong, setUpcomingQueue, setIsPlaying]);

  const formatSleepTimerStr = (secs: number) => {
    const m = Math.floor(secs / 60); const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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
        
        .mobile-slider { -webkit-appearance: none; appearance: none; height: 20px; background: transparent !important; cursor: pointer; outline: none; margin: 0; padding: 0; }
        .mobile-slider::-webkit-slider-runnable-track { height: 100%; background: transparent; }
        .mobile-slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none;
            height: 12px; width: 12px; border-radius: 50%;
            background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 0;
            position: relative; top: 50%; transform: translateY(-50%);
        }
        
        .no-select { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; pointer-events: none; }
        .no-select-text { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
        .queue-item { transform-origin: center; will-change: transform; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
        .lyric-word-sync {
            background: linear-gradient(to right, #ffffff calc(var(--p, 0%) - 15%), rgba(255,255,255,0.2) var(--p, 0%));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
            will-change: background;
        }
      `}} />

      <div className={`player-root fixed inset-0 z-[99999] text-white transition-all duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isExpanded ? "translate-y-0 opacity-100 overflow-hidden" : "translate-y-full opacity-0 pointer-events-none"}`}>
        
        {/* Full Screen Background Layer (Saavn Beautiful Blur Engine) */}
        {isCanvasLoaded && !isScrolledPastMain && !showQueue && !isVideoMode && !isLyricsFullScreen && isCanvasEnabled && (
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setIsUiHidden(!isUiHidden)} />
        )}
        
        <div className="absolute inset-0 z-0 pointer-events-none transition-all duration-700" style={{ backgroundColor: dominantColor }}>
          {displayImage && !isLyricsFullScreen && (
             <div className="absolute inset-0 bg-cover bg-center opacity-70 blur-[80px] scale-[1.5] transition-all duration-700" style={{ backgroundImage: `url(${displayImage})` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-[#121212] opacity-95" />
        </div>
        
        {/* Full Screen Canvas Video */}
        {canvasData?.canvasUrl && !isVideoMode && isCanvasEnabled && (
          <div className={`absolute inset-0 z-0 bg-transparent pointer-events-none transition-opacity duration-700 ${isCanvasLoaded && !isScrolledPastMain && !showQueue && !isLyricsFullScreen ? 'opacity-100' : 'opacity-0'}`}>
            <video ref={canvasVideoRef} src={canvasData.canvasUrl} loop muted playsInline onLoadedData={() => setIsCanvasLoaded(true)} className="absolute inset-0 w-full h-full object-cover" />
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 transition-opacity duration-500 ${isUiHidden ? 'opacity-0' : 'opacity-100'}`} />
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 transition-opacity duration-500 ${isUiHidden ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        )}

        {/* Scrollable Container */}
        <div className={`absolute inset-0 z-20 overflow-x-hidden scrollbar-hide flex flex-col pointer-events-none ${isLyricsFullScreen ? 'overflow-y-hidden' : 'overflow-y-auto'}`} onScroll={handleScroll}>
          
          <div className="w-full flex flex-col flex-shrink-0 pointer-events-auto transition-all duration-500" style={{ height: isLyricsFullScreen ? '100%' : undefined, minHeight: isLyricsFullScreen ? '100%' : '100dvh' }}>
            
            {/* Header */}
            <div className={`flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex-shrink-0 w-full ${isLyricsFullScreen ? 'mt-0' : 'mt-4'}`}>
              <button onClick={() => { if (isLyricsFullScreen) setIsLyricsFullScreen(false); else window.history.back(); }} className="p-2 -ml-2 text-white active:opacity-50 drop-shadow-md pointer-events-auto"><ChevronDown size={28} /></button>
              <div className="flex flex-col items-center flex-1 min-w-0 px-2 drop-shadow-md no-select-text">
                <span className="text-[10px] tracking-widest text-white/70 uppercase truncate w-full text-center font-medium">Playing from {playContext?.type || 'App'}</span>
                <span className="text-[13px] font-bold text-white truncate w-full text-center mt-[2px]">{decodeEntities(playContext?.name || 'Gaana Selection')}</span>
              </div>
              <button onClick={openSettings} className="p-2 -mr-2 text-white active:opacity-50 drop-shadow-md pointer-events-auto"><MoreHorizontal size={24} /></button>
            </div>

            {/* Square 1:1 Album Art Cover */}
            <div className={`flex-1 min-h-0 w-full flex items-center justify-center relative z-30 transition-all duration-500 ${isLyricsFullScreen ? 'px-0 py-0 flex-col items-stretch justify-start' : (isVideoMode ? 'px-4 py-2' : 'px-8 py-2')}`}>
              {isLyricsFullScreen && isLyricsEnabled ? (
                <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden pointer-events-auto transition-colors duration-700 bg-transparent">
                  <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-4 pb-[30vh] flex flex-col gap-8 w-full h-full mask-edges-vertical" ref={fullLyricsContainerRef}>
                     {lyrics.length > 0 && (syncType !== "LINE_SYNCED" || isVideoMode) && (
                         <div className="flex items-center gap-3 mb-2 px-1 opacity-70">
                            <span className="px-2.5 py-[3px] bg-white/20 rounded text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">Unsynced</span>
                         </div>
                     )}
                     {RenderedLyrics}
                  </div>
                </div>
              ) : isVideoMode && ytVideoId ? (
                <div className="w-full aspect-video max-w-[600px] max-h-[50vh] relative bg-black shadow-[0_15px_40px_rgba(0,0,0,0.5)] rounded-[12px] transition-all duration-500 overflow-hidden mx-auto pointer-events-auto" style={{ transform: 'translateZ(0)' }}>
                  <iframe 
                    ref={videoIframeRef} 
                    src={`https://ayushcom.vercel.app/?vid=${ytVideoId}&t=${iframeInitialTimeRef.current}`} 
                    style={{ width: "100%", height: "100%", border: "none", pointerEvents: 'auto', borderRadius: '12px' }} 
                    allow="autoplay; fullscreen; picture-in-picture" 
                  />
                </div>
              ) : (
                <div className={`relative bg-[#282828] rounded-[8px] shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isCanvasLoaded && isCanvasEnabled ? 'opacity-0 scale-75 pointer-events-none hidden' : 'opacity-100 scale-100 block'}`} style={{ width: '100%', aspectRatio: '1/1', maxWidth: '380px', maxHeight: '50vh' }}>
                  {(loading || isVideoLoading) && <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center"><Loader2 size={40} className="animate-spin text-white" /></div>}
                  {displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />}
                </div>
              )}
            </div>

            {/* CONTROLS SECTION */}
            <div className={`w-full px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 flex flex-col justify-end flex-shrink-0 transition-opacity duration-500 pointer-events-auto ${isLyricsFullScreen ? 'mb-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]' : 'mb-2'}`}>
              
              <div className={`transition-all duration-500 w-full relative overflow-hidden flex items-center justify-start mask-edges-vertical ${isUiHidden && !isVideoMode ? 'max-h-0 opacity-0 mb-0' : (isLyricsFullScreen ? 'hidden' : 'mb-3 opacity-100 min-h-[75px]')}`}>
                {RenderedMiniLyrics}
              </div>

              <div className={`transition-all duration-500 flex items-center justify-between drop-shadow-md w-full no-select-text ${isLyricsFullScreen ? 'mb-2 scale-[0.8] origin-bottom-left' : 'mb-5'}`}>
                <div className="flex items-center gap-3 overflow-hidden pr-4 flex-1 min-w-0 w-full max-w-full">
                  {showTinyBanner && displayImage && !isLyricsFullScreen && (<img draggable={false} src={displayImage} className="w-[48px] h-[48px] rounded-md shadow-md flex-shrink-0 no-select pointer-events-none" alt="tiny cover" />)}
                  <div className="flex flex-col flex-1 min-w-0 w-full overflow-hidden">
                    <MarqueeText text={displayTitle} className="text-[22px] font-bold text-white tracking-tight drop-shadow-md w-full" />
                    <MarqueeText text={displayArtists} className="text-[15px] font-medium text-[#b3b3b3] mt-1 drop-shadow-md w-full" />
                  </div>
                </div>
                {!isLyricsFullScreen && <button onClick={handleLikeClick} className="flex-shrink-0 ml-2 active:scale-75 transition-transform pointer-events-auto"><Heart size={26} fill={isSongLiked ? "#1db954" : "none"} color={isSongLiked ? "#1db954" : "white"} /></button>}
              </div>

              {/* Advanced 3-Tier Preloaded Progress Bar (Glitter Centered Perfectly) */}
              <div className={`w-full flex flex-col gap-1 relative drop-shadow-md ${isLyricsFullScreen ? 'mb-2 scale-[0.95] origin-bottom' : 'mb-5'}`}>
                <div className="w-full relative h-[20px] flex items-center group">
                    {/* Background Low White */}
                    <div className="absolute left-0 right-0 h-[4px] bg-white/20 rounded-full pointer-events-none top-1/2 -translate-y-1/2" />
                    {/* Buffered Medium White */}
                    <div className="absolute left-0 h-[4px] bg-white/40 rounded-full pointer-events-none transition-all duration-300 top-1/2 -translate-y-1/2" style={{ width: `${bufferedProgress}%` }} />
                    {/* Active Progress Solid White */}
                    <div className="absolute left-0 h-[4px] bg-white rounded-full pointer-events-none top-1/2 -translate-y-1/2" style={{ width: `${progress}%` }} />
                    {/* Range Input for Thumb (Mathematically Centered) */}
                    <input type="range" min="0" max="100" value={duration > 0 ? progress : 0} onChange={handleSeekChange} onPointerDown={handleSeekStart} onPointerUp={handleSeekEnd} onTouchStart={handleSeekStart} onTouchEnd={handleSeekEnd} className="w-full mobile-slider absolute inset-0 z-10 pointer-events-auto" style={{ background: 'transparent' }} />
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium text-[#a7a7a7] mt-[-2px] w-full pointer-events-none no-select-text"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
              </div>

              <div className={`flex flex-col w-full transition-all duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${isUiHidden && !isVideoMode ? 'max-h-0 opacity-0 translate-y-6 pointer-events-none' : (isLyricsFullScreen ? 'max-h-[64px] opacity-100 translate-y-0 pointer-events-auto scale-[0.85] origin-bottom' : 'max-h-[140px] opacity-100 translate-y-0 pointer-events-auto')}`}>
                <div className={`flex items-center justify-between w-full px-1 drop-shadow-md no-select-text ${isLyricsFullScreen ? 'mb-0' : 'mb-5'}`}>
                  <button onClick={() => { setIsShuffle(!isShuffle); if(isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*'); }} className={`active:opacity-50 pointer-events-auto ${isShuffle ? 'text-[#1db954]' : 'text-white'}`}><Shuffle size={24} /></button>
                  <button onClick={playPrev} className="text-white active:opacity-50 pointer-events-auto"><SkipBack size={36} fill="white" stroke="white" /></button>
                  <button onClick={handlePlayPauseToggle} className="w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-transform shadow-lg pointer-events-auto">
                     {(loading || isVideoLoading) ? <Loader2 size={26} className="animate-spin text-black" /> : (isPlaying ? <Pause fill="black" stroke="black" size={26} /> : <Play fill="black" stroke="black" size={28} className="translate-x-[2px]" />)}
                  </button>
                  <button ref={nextBtnRef} id="next-song-btn" onClick={playNext} className="text-white active:opacity-50 pointer-events-auto"><SkipForward size={36} fill="white" stroke="white" /></button>
                  <button onClick={() => { setRepeatMode((prev) => (prev + 1) % 3); if(isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*'); }} className={`active:opacity-50 relative pointer-events-auto ${repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'}`}><Repeat size={24} />{repeatMode === 2 && <span className="absolute -top-1 -right-1 bg-[#1db954] text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">1</span>}</button>
                </div>
                {!isLyricsFullScreen && (
                  <div className="flex items-center justify-between text-[#b3b3b3] w-full px-1 drop-shadow-md pointer-events-auto">
                    <button onClick={toggleVideoMode} className={`active:opacity-50 transition-colors ${isVideoMode ? 'text-[#1db954]' : 'text-[#b3b3b3]'}`}>{isVideoLoading ? <Loader2 size={20} className="animate-spin" /> : <MonitorPlay size={20} />}</button>
                    <div className="flex items-center gap-6"><button onClick={openQueue} className="active:opacity-50 text-white"><ListMusic size={20} /></button></div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* SCROLLABLE BOTTOM CONTENT CARDS */}
          <div className={`w-full px-5 pb-24 flex flex-col gap-6 pointer-events-auto transition-opacity duration-500 ${isUiHidden && !isVideoMode ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isLyricsFullScreen ? 'hidden' : 'block'}`}>
            
            {/* LYRICS CARD */}
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

            {/* ALBUM CARD */}
            {songDetails?.album_title && (
              <Link href={albumRoute} onClick={closePlayerForNavigation} className="w-full bg-[#1e1e1e]/60 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 hover:bg-[#2a2a2a]/80 transition-colors border border-white/10 shadow-xl relative overflow-hidden group no-select-text pointer-events-auto">
                <div className="absolute inset-0 z-0 pointer-events-none opacity-30" style={{ backgroundColor: dominantColor }} />
                {displayImage && <img draggable={false} src={displayImage} className="w-[64px] h-[64px] rounded-md object-cover relative z-10 shadow-md border border-white/5 group-hover:scale-105 transition-transform no-select pointer-events-none" alt="Album Cover" />}
                <div className="flex flex-col relative z-10 flex-1 pr-2"><span className="text-white/60 text-[11px] uppercase tracking-widest font-bold mb-1 drop-shadow-sm">Album</span><span className="text-white font-bold text-[16px] line-clamp-1 drop-shadow-md">{decodeEntities(songDetails.album_title)}</span></div><div className="relative z-10 text-white/50 group-hover:text-white transition-colors pl-2"><ChevronDown size={20} className="-rotate-90" /></div>
              </Link>
            )}

            {/* ABOUT SONG CARD (Grey Color - Clean) */}
            {songDetails && (
              <div className="w-full bg-[#1e1e1e] rounded-2xl p-5 flex flex-col gap-4 border border-white/5 shadow-2xl relative overflow-hidden no-select-text">
                <h3 className="text-white font-bold text-[18px] drop-shadow-md relative z-10 mb-2">About Song</h3>
                <div className="relative z-10 grid grid-cols-2 gap-y-5 gap-x-4">
                  {songDetails.popularity && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-white/50"><Hash size={12} /><span className="font-semibold text-[10px] uppercase tracking-wider">Play Count</span></div><span className="text-white font-bold text-[15px]">{Number(songDetails.popularity).toLocaleString('en-US')}</span></div>)}
                  {songDetails.duration && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-white/50"><Clock size={12} /><span className="font-semibold text-[10px] uppercase tracking-wider">Duration</span></div><span className="text-white font-bold text-[15px]">{formatTime(Number(songDetails.duration))}</span></div>)}
                  {songDetails.release_date && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-white/50"><Calendar size={12} /><span className="font-semibold text-[10px] uppercase tracking-wider">Released</span></div><span className="text-white font-bold text-[15px]">{songDetails.release_date}</span></div>)}
                  {songDetails.language && (<div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-white/50"><Globe size={12} /><span className="font-semibold text-[10px] uppercase tracking-wider">Language</span></div><span className="text-white font-bold text-[15px] capitalize">{songDetails.language}</span></div>)}
                  {songDetails.vendor && (<div className="flex flex-col gap-1 col-span-2"><div className="flex items-center gap-1.5 text-white/50"><Disc3 size={12} /><span className="font-semibold text-[10px] uppercase tracking-wider">Label</span></div><span className="text-white font-bold text-[15px] line-clamp-1">{decodeEntities(songDetails.vendor)}</span></div>)}
                </div>
              </div>
            )}

            {/* CREDITS CARD (Moved after About Song, Grey Color) */}
            {RenderedCredits}

          </div>
        </div>

        {/* --- SETTINGS MENU --- */}
        <div className={`absolute inset-0 z-[100000] bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto flex flex-col justify-end ${showSettingsMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => window.history.back()}>
          <div className={`w-full bg-[#121212] rounded-t-[28px] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-2xl border-t border-white/10 flex flex-col max-h-[85vh] ${showSettingsMenu ? 'translate-y-0' : 'translate-y-full'}`} onClick={e => e.stopPropagation()}>
             <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
                 <h3 className="text-white font-extrabold text-[22px] flex items-center gap-2"><Settings2 size={24}/> Settings</h3>
                 <button onClick={() => window.history.back()} className="text-white/60 p-2 hover:text-white bg-white/5 rounded-full"><ChevronDown size={20} /></button>
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
                         <button key={q} onClick={() => { setSelectedQuality(q); localStorage.setItem('audio_quality', q); window.history.back(); restoreTimeRef.current = audioRef.current?.currentTime || 0; }} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[14px] font-bold transition-all ${selectedQuality === q ? 'bg-[#1db954] text-black shadow-md' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                            {QUALITY_MAP[q]}
                         </button>
                      ))}
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

                <div className="flex flex-col gap-3 mt-2">
                   <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider pl-1">Lyrics Server Preference</span>
                   <div className="flex bg-[#1e1e1e] rounded-[16px] overflow-hidden p-2 gap-2">
                      <button onClick={() => { setLyricsServer("spotify"); localStorage.setItem('lyrics_server', "spotify"); }} className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-bold transition-all ${lyricsServer === "spotify" ? 'bg-[#1db954] text-black shadow-md' : 'bg-white/5 text-white hover:bg-white/10'}`}>Spotify</button>
                      <button onClick={() => { setLyricsServer("gaana"); localStorage.setItem('lyrics_server', "gaana"); }} className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-bold transition-all ${lyricsServer === "gaana" ? 'bg-[#1db954] text-black shadow-md' : 'bg-white/5 text-white hover:bg-white/10'}`}>Gaana</button>
                   </div>
                </div>

             </div>
          </div>
        </div>

        {/* --- ADVANCED DOWNLOAD MANAGER MODAL --- */}
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
                    <button key={i} onClick={() => executeMp3PackerDownload(opt.url, opt.num.toString())} className="w-full flex items-center justify-between p-3 rounded-lg bg-[#282828] hover:bg-[#333] transition-colors border border-white/5 active:scale-95 text-left">
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
             <div className="w-full max-w-sm bg-[#282828] rounded-2xl p-6 shadow-2xl flex flex-col gap-2 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <h4 className="text-white font-bold text-lg mb-2 flex justify-between items-center">Sleep Timer <button onClick={() => window.history.back()} className="text-white/50 hover:text-white"><X size={20}/></button></h4>
                {[5, 15, 30, 45, 60].map(mins => (
                   <button key={mins} onClick={() => { setSleepTimer(mins); window.history.back(); }} className={`py-3 px-4 rounded-lg flex justify-between items-center transition-colors ${sleepTimer === mins ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                      <span className="font-medium">{mins} minutes</span>{sleepTimer === mins && <Check size={18} />}
                   </button>
                ))}
                <button onClick={() => { setSleepTimer('end'); window.history.back(); }} className={`py-3 px-4 rounded-lg flex justify-between items-center transition-colors ${sleepTimer === 'end' ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                   <span className="font-medium">End of track</span>{sleepTimer === 'end' && <Check size={18} />}
                </button>
                <button onClick={() => { setSleepTimer(null); window.history.back(); }} className="py-3 px-4 rounded-lg text-white/50 hover:bg-white/5 text-left mt-2 border border-white/10 transition-colors">
                   Turn off timer
                </button>
             </div>
          </div>
        )}

        {/* QUEUE OVERLAY */}
        <div className={`absolute inset-0 z-[60] bg-[#121212] transition-transform duration-300 flex flex-col pointer-events-auto ${showQueue ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 sticky top-0 bg-[#121212] z-20 shadow-md no-select-text">
            <button onClick={() => { setIsQueueEditMode(false); window.history.back(); }} className="p-2 -ml-2 text-white/80 active:opacity-50"><ChevronDown size={28} /></button>
            <span className="text-[15px] font-bold text-white">Queue</span>
            {isQueueEditMode ? (
               <button onClick={() => { setIsQueueEditMode(false); setSelectedQueueItems([]); }} className="text-[14px] font-bold text-[#1db954] active:opacity-50">Done</button>
            ) : (
               <button onClick={() => setIsQueueEditMode(true)} className="text-[14px] font-medium text-white/80 active:opacity-50">Edit</button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto px-5 pb-32 no-select-text relative scrollbar-hide" ref={queueContainerRef}>
            <span className="text-[14px] font-medium text-white/60 block mb-6 uppercase tracking-wider">Playing from {playContext?.type || 'App'}</span>
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
                        setUpcomingQueue(prev => {
                            const arr = [...prev]; 
                            const toMove = selectedQueueItems.map(idx => prev[idx]);
                            const remaining = arr.filter((_, i) => !selectedQueueItems.includes(i));
                            return[...toMove, ...remaining];
                        });
                        setSelectedQueueItems([]); setIsQueueEditMode(false);
                    }} className="text-white font-bold text-[13px] bg-white/10 px-4 py-2 rounded-full active:bg-white/20 transition-colors">Move to Top</button>
                    <span className="text-white/50 text-[12px] font-bold">{selectedQueueItems.length} Selected</span>
                    <button onClick={() => {
                        if (selectedQueueItems.length === 0) return;
                        setUpcomingQueue(prev => prev.filter((_, i) => !selectedQueueItems.includes(i)));
                        setSelectedQueueItems([]); setIsQueueEditMode(false);
                    }} className="text-[#ff4444] font-bold text-[13px] bg-[#ff4444]/10 px-4 py-2 rounded-full active:bg-[#ff4444]/20 transition-colors">Remove</button>
                </div>
            ) : (
                <>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer" onClick={() => setIsShuffle(!isShuffle)}><Shuffle size={24} className={isShuffle ? 'text-[#1db954]' : 'text-white/70'} /><span className={`text-[11px] font-medium ${isShuffle ? 'text-[#1db954]' : 'text-white/70'}`}>Shuffle</span></div>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer" onClick={() => setRepeatMode((prev) => (prev + 1) % 3)}><div className="relative"><Repeat size={24} className={repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'} />{repeatMode === 2 && <span className="absolute -top-1 -right-1 bg-[#1db954] text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">1</span>}</div><span className={`text-[11px] font-medium ${repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'}`}>Repeat</span></div>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer text-white/70" onClick={openTimer}><div className={`relative ${sleepTimer ? 'text-[#1db954]' : 'text-white/70'}`}><Timer size={24} /></div><span className={`text-[11px] font-medium ${sleepTimer ? 'text-[#1db954]' : 'text-white/70'}`}>{timerRemaining ? formatSleepTimerStr(timerRemaining) : sleepTimer === 'end' ? 'Track End' : 'Timer'}</span></div>
                </>
            )}
          </div>
        </div>
      </div>

      <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={handleMiniPlayerClick} className={`fixed bottom-[65px] left-[8px] right-[8px] h-[56px] rounded-[6px] z-[99990] cursor-pointer overflow-hidden transition-all duration-[400ms] shadow-md no-select-text ${isExpanded ? 'opacity-0 pointer-events-none translate-y-6 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`} style={{ backgroundColor: dominantColor, transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined, transition: swipeX === 0 && !isExpanded ? 'transform 0.4s ease-out, opacity 0.4s' : 'none' }}>
        <div className="absolute inset-0 bg-black/25 z-0 pointer-events-none" />
        <div className="relative z-10 w-full h-full flex items-center px-2">
          <div className="w-[40px] h-[40px] flex-shrink-0 rounded-[4px] shadow-sm overflow-hidden bg-[#282828] relative mr-3">
            {(loading || isVideoLoading) && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-white" /></div>}
            {displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />}
          </div>
          <div className="flex flex-col flex-1 min-w-0 pr-3 justify-center"><MarqueeText text={displayTitle} className="text-[13px] font-bold text-white leading-tight mb-[2px] w-full" /><MarqueeText text={displayArtists} className="text-[12px] font-medium text-white/70 leading-tight w-full" /></div>
          <div className="flex items-center gap-4 flex-shrink-0 pr-2 text-white">
            <button className="active:scale-75 transition-transform flex items-center justify-center w-[20px] h-[20px]" onClick={toggleVideoMode}><MonitorPlay size={20} className={isVideoMode ? "text-[#1db954]" : ""} /></button>
            <button className="active:scale-75 transition-transform flex items-center justify-center w-[24px] h-[24px]" onClick={handlePlayPauseToggle}>
               {(loading || isVideoLoading) ? <Loader2 size={24} className="animate-spin text-white" /> : (isPlaying ? <Pause fill="white" stroke="white" size={24} /> : <Play fill="white" stroke="white" size={24} className="translate-x-[1px]" />)}
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/20 rounded-full z-20 pointer-events-none overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} /></div>
      </div>
    </>
  );
}
