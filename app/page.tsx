/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Search as SearchIcon, Mic, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

// --- API CONSTANTS & SECRETS ---
const API_BASE = "https://gaanaayush.vercel.app/api/superserch";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const AUTOMATION_SECRET = "pR3nSUsTI9HQxb2RbdasB5mjKqUoSP8m";

const SECTION_CONFIGS =[
  { key: "showcase", title: "Top Picks", url: "/home/showcase?userlanguage={lang}", noPagination: true },
  { key: "trending", title: "Trending Songs", url: "/home/trending/songs/v1?trending_section=1&pkc=true&userlanguage={lang}", showSubtitle: true, noPagination: true },
  { key: "top_charts", title: "Top Charts", url: "/home/playlist/top-charts?userlanguage={lang}" },
  { key: "top_playlists", title: "Top Playlists", url: "/home/section-data?seokey=top-playlists-1&view=all&userlanguage={lang}" },
  { key: "new_releases", title: "New Releases", url: "/home/album/featured/more?userlanguage={lang}", showSubtitle: true },
  { key: "90s", title: "Back to 90s", url: "/home/section-data?seokey=90s-2000s&view=all&userlanguage={lang}" },
  { key: "bhakti", title: "Bhakti", url: "/home/section-data?seokey=bhakti&view=all&userlanguage={lang}" },
  { key: "lohri", title: "Shades of Love", url: "/home/section-data?seokey=lohri&view=all&userlanguage={lang}" },
  { key: "mid_year", title: "Top Streamed Artists", url: "/home/section-data?seokey=mid-year-recap-2024&view=all&userlanguage={lang}" },
  { key: "romance", title: "Romance", url: "/home/section-data?seokey=romance&view=all&userlanguage={lang}" },
  { key: "star_gallery", title: "Star Gallery", url: "/home/section-data?seokey=star-gallery&view=all&userlanguage={lang}" },
  { key: "city_charts", title: "City Top Charts", url: "/home/section-data?seokey=city-top-charts&view=all&userlanguage={lang}" },
  { key: "top_search", title: "Top Searched Artists", url: "/home/section-data?seokey=top-searched-artists&view=all&userlanguage={lang}" },
  { key: "just_arrived", title: "Just Arrived", url: "/home/section-data?seokey=just-arrived&view=all&userlanguage={lang}" },
  { key: "mehfil", title: "Mehfil-e-ghazal", url: "/home/section-data?seokey=mehfil-e-ghazal&view=all&userlanguage={lang}" },
];

// --- IRONCLAD GLOBAL FETCH LOCK (Guarantees exactly 1s gap AFTER response) ---
declare global {
  interface Window {
    __API_QUEUE_PROMISE__?: Promise<any>;
  }
}

const fetchStrictly = (url: string): Promise<any> => {
  // 1. Check cache first to completely avoid network calls if data is fresh
  try {
    const cachedStr = sessionStorage.getItem(`api_cache_${url}`);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (Date.now() - cached.timestamp < CACHE_DURATION) return Promise.resolve(cached.data);
    }
  } catch (e) {}

  if (typeof window === 'undefined') return Promise.resolve(null);

  // 2. Queue system ensures requests never run parallel, and 1-second rule is strictly followed
  if (!window.__API_QUEUE_PROMISE__) {
    window.__API_QUEUE_PROMISE__ = Promise.resolve();
  }

  const task = async () => {
    try {
      // INJECTED VERCEL AUTOMATION PROTECTION BYPASS (Official Method)
      const res = await fetch(url, {
        headers: {
          "x-vercel-protection-bypass": AUTOMATION_SECRET
        }
      });
      
      let data = null;
      if (res.ok || res.status === 202 || res.status === 200) {
        data = await res.json();
        try { sessionStorage.setItem(`api_cache_${url}`, JSON.stringify({ timestamp: Date.now(), data })); } catch (e) {}
      }
      
      // STRICTLY WAIT 1 FULL SECOND AFTER RECEIVING THE RESPONSE
      await new Promise(r => setTimeout(r, 1000));
      return data;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000)); // Enforce wait even on failure to prevent spam
      return null;
    }
  };

  const newPromise = window.__API_QUEUE_PROMISE__.then(task);
  window.__API_QUEUE_PROMISE__ = newPromise.catch(() => {});
  return newPromise;
};


// --- UTILS ---
const getImageUrl = (item: any) => {
  let img = item.artwork_large || item.artwork_web || item.atw || item.artwork || item.image || "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return img.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500").replace("50x50", "500x500");
};

const getShowcaseImageUrl = (item: any) => {
  if (item.entity_info && Array.isArray(item.entity_info)) {
     const artworkAlt = item.entity_info.find((i: any) => i.key === "artwork_alt");
     if (artworkAlt && artworkAlt.value) return artworkAlt.value.replace(/size_[ms]/g, "size_l");
     const atwAlt = item.entity_info.find((i: any) => i.key === "atw_alt");
     if (atwAlt && atwAlt.value) return atwAlt.value.replace(/size_[ms]/g, "size_l");
  }
  let imgUrl = item.artwork_alt || item.atw_alt || item.artwork_web || item.artwork_large || item.artwork || item.atw;
  if (imgUrl) return imgUrl.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500");
  return "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
};

const decodeEntities = (text: string) => text ? text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";

const getSubtitle = (item: any) => {
  let names: string[] =[];
  if (item.entity_info) {
     const artistInfo = item.entity_info.find((info: any) => info.key === 'artist' || info.key === 'singers');
     if (artistInfo && Array.isArray(artistInfo.value)) names = artistInfo.value.map((a: any) => a.name);
  }
  if (names.length === 0) {
     if (Array.isArray(item.artist)) names = item.artist.map((a: any) => a.name);
     else if (Array.isArray(item.singers)) names = item.singers.map((a: any) => a.name);
     else if (Array.isArray(item.artists)) names = item.artists.map((a: any) => a.name);
  }
  return Array.from(new Set(names)).join(", ");
};

// --- LAZY IMAGE COMPONENT ---
const LazyImage = ({ src, alt, className, objectFit = "object-cover" }: any) => {
  const[loaded, setLoaded] = useState(false);
  const placeholder = "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundImage: `url(${placeholder})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <img 
        src={src || placeholder} 
        alt={alt} 
        loading="lazy" 
        decoding="async" 
        onLoad={(e) => { if (e.currentTarget.src !== placeholder) setLoaded(true); }} 
        className={`w-full h-full ${objectFit} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`} 
      />
    </div>
  );
};

// --- PREMIUM CARD COMPONENT ---
const PremiumCard = ({ item, onClick, showSubtitle, fullWidth = false }: any) => {
  const title = decodeEntities(item.track_title || item.name || item.title || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item));
  const isLongTitle = title.length > 13;

  return (
    <div onClick={() => onClick(item)} className={`${fullWidth ? 'w-full' : 'w-[29vw] sm:w-[180px] md:w-[210px]'} flex-shrink-0 snap-start cursor-pointer group pb-1`}>
      <div className="relative overflow-hidden bg-[#131D30] border border-[#1e293b] rounded-2xl mb-2 transition-transform duration-200 active:scale-95 shadow-md">
        <LazyImage src={getImageUrl(item)} alt={title} className="w-full aspect-[1/1] group-hover:scale-105 transition-transform duration-500 ease-out" />
      </div>
      <div className="w-full overflow-hidden whitespace-nowrap text-center px-1">
        <span className={`inline-block text-[13px] md:text-[15px] font-extrabold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`} style={isLongTitle ? { animationDuration: `${Math.max(4, title.length * 0.15)}s` } : {}}>{title}</span>
      </div>
      {showSubtitle && subtitle && (
        <div className="w-full overflow-hidden whitespace-nowrap text-center mt-0.5 px-1">
          <span className="inline-block text-[11px] md:text-[13px] font-medium text-blue-200/60 truncate w-full">{subtitle}</span>
        </div>
      )}
    </div>
  );
};

// --- YOUTUBE/SPOTIFY STYLE WAVE SKELETON ---
const SectionSkeleton = ({ isShowcase = false }: { isShowcase?: boolean }) => (
  <div className={`w-full ${isShowcase ? "mt-2 mb-10 px-4" : "mb-10"}`}>
    {isShowcase ? (
      <div className="w-[90vw] md:w-[600px] aspect-[720/375] rounded-2xl border border-[#1e293b] skeleton-wave"></div>
    ) : (
      <>
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="h-[22px] rounded-md w-32 md:w-48 skeleton-wave"></div>
          <div className="h-[24px] rounded-full w-16 skeleton-wave"></div>
        </div>
        <div className="flex gap-4 overflow-hidden px-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-[29vw] sm:w-[180px] md:w-[210px] flex-shrink-0">
              <div className="w-full aspect-[1/1] rounded-2xl mb-2 border border-[#1e293b] skeleton-wave"></div>
              <div className="h-3 rounded w-3/4 mx-auto mt-2 skeleton-wave"></div>
              <div className="h-2 rounded w-1/2 mx-auto mt-1.5 skeleton-wave"></div>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);


export default function Home() {
  const { language, setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  const router = useRouter();
  
  const [isInitializing, setIsInitializing] = useState(true);
  const[isChunkLoading, setIsChunkLoading] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  
  const nextIndexRef = useRef(0);
  const isLoadingRef = useRef(false);

  const [viewAll, setViewAll] = useState<any | null>(null);
  const[isFetchingViewAll, setIsFetchingViewAll] = useState(false);

  const showcaseRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const viewAllObserverRef = useRef<HTMLDivElement>(null);

  // --- STRICT SCROLL-DRIVEN FETCHER ---
  const fetchNextChunk = async (chunkSize = 1) => {
    if (nextIndexRef.current >= SECTION_CONFIGS.length || isLoadingRef.current || viewAll) return;
    
    isLoadingRef.current = true;
    setIsChunkLoading(true);
    
    try {
      for (let i = 0; i < chunkSize; i++) {
        const idx = nextIndexRef.current;
        if (idx >= SECTION_CONFIGS.length) break;
        
        const conf = SECTION_CONFIGS[idx];
        let url = `${API_BASE}${conf.url.replace('{lang}', language || 'hindi')}`;
        if (!conf.noPagination) url += url.includes('?') ? '&limit=0,15' : '?limit=0,15';

        // Wait strictly for response AND the 1-sec gap with Automation Token
        const json = await fetchStrictly(url);
        
        if (json) {
           const items = json?.data?.entities || json?.data?.tracks || json?.data ||[];
           
           if (Array.isArray(items) && items.length > 0) {
              setSections(prev => {
                  if (prev.some(s => s.key === conf.key)) return prev;
                  const updated =[...prev, { ...conf, data: items }];
                  if (typeof window !== 'undefined') sessionStorage.setItem('homeState_sections', JSON.stringify(updated));
                  return updated;
              });
           }
        }

        nextIndexRef.current += 1;
        if (typeof window !== 'undefined') sessionStorage.setItem('homeState_nextIndex', nextIndexRef.current.toString());

        // SHOW PAGE INSTANTLY: Stop initializing the moment the 1st section ("Top Picks") is completely processed 
        if (nextIndexRef.current >= 1) {
           setIsInitializing(false);
        }
      }
    } catch (e) { /* Silent */ }
    
    isLoadingRef.current = false;
    setIsChunkLoading(false);
  };

  // --- INITIAL MOUNT & STATE RESTORATION ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initLoad = async () => {
      const savedLang = sessionStorage.getItem('homeState_lang');
      
      if (savedLang === language) {
         const savedSections = sessionStorage.getItem('homeState_sections');
         if (savedSections && JSON.parse(savedSections).length > 0) {
            setSections(JSON.parse(savedSections));
            nextIndexRef.current = parseInt(sessionStorage.getItem('homeState_nextIndex') || '0');
            
            const savedViewAll = sessionStorage.getItem('homeState_viewAll');
            if (savedViewAll && savedViewAll !== 'null') {
               window.history.replaceState({ home: true }, ''); 
               window.history.pushState({ viewAllOpen: true }, '', window.location.href); 
               setViewAll(JSON.parse(savedViewAll));
               setTimeout(() => window.scrollTo(0, parseInt(sessionStorage.getItem('viewAllScrollY') || '0')), 100);
            } else {
               setTimeout(() => window.scrollTo(0, parseInt(sessionStorage.getItem('homeScrollY') || '0')), 100);
            }
            setIsInitializing(false);
            return; 
         }
      }

      sessionStorage.removeItem('homeState_viewAll');
      sessionStorage.removeItem('homeScrollY');
      sessionStorage.removeItem('viewAllScrollY');
      sessionStorage.setItem('homeState_lang', language || 'Hindi');
      setSections([]);
      setViewAll(null);
      nextIndexRef.current = 0;
      setIsInitializing(true);
      
      // Load 2 chunks initially (Top Picks + Trending) to guarantee screen is filled, then switch to scroll-driven.
      fetchNextChunk(2); 
    };

    initLoad();
  }, [language]); 

  // --- HARDWARE BACK BUTTON LOGIC ---
  useEffect(() => {
    const handlePopState = () => { if (viewAll) closeViewAll(true); };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewAll]);

  // Auto-Sliding Showcase
  useEffect(() => {
    if (viewAll || sections.length === 0 || sections[0]?.key !== "showcase" || !sections[0]?.data) return;
    const interval = setInterval(() => {
      if (showcaseRef.current) {
        const maxScroll = showcaseRef.current.scrollWidth - showcaseRef.current.clientWidth;
        if (showcaseRef.current.scrollLeft >= maxScroll - 10) showcaseRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        else showcaseRef.current.scrollBy({ left: showcaseRef.current.clientWidth, behavior: 'smooth' });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [sections, viewAll]);

  // Lazy Load REMAINING Sections strictly 1-by-1 on Scroll
  useEffect(() => {
    if (viewAll || isInitializing) return; 
    const observer = new IntersectionObserver((entries) => {
      // Exactly 1 section processed per intersection when user scrolls down
      if (entries[0].isIntersecting && !isLoadingRef.current) fetchNextChunk(1);
    }, { rootMargin: "600px" });

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  },[sections, viewAll, isInitializing, language]);

  // Infinite Scroll for "View All"
  useEffect(() => {
    if (!viewAll || viewAll.noPagination || !viewAll.hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingViewAll) {
        setIsFetchingViewAll(true);
        const url = `${API_BASE}${viewAll.endpoint.replace('{lang}', language || 'hindi')}&limit=${viewAll.offset},40`;
        
        fetchStrictly(url).then(json => {
           const newItems = json?.data?.entities || json?.data?.tracks || json?.data ||[];
           if (Array.isArray(newItems) && newItems.length > 0) {
             setViewAll((prev: any) => {
                const updated = { ...prev, data: [...prev.data, ...newItems], offset: prev.offset + 40 };
                sessionStorage.setItem('homeState_viewAll', JSON.stringify(updated));
                return updated;
             });
           } else {
             setViewAll((prev: any) => {
                const updated = { ...prev, hasMore: false };
                sessionStorage.setItem('homeState_viewAll', JSON.stringify(updated));
                return updated;
             });
           }
           setIsFetchingViewAll(false);
        }).catch(() => {
           setIsFetchingViewAll(false);
           setViewAll((prev: any) => ({ ...prev, hasMore: false }));
        });
      }
    }, { rootMargin: "400px" });

    if (viewAllObserverRef.current) observer.observe(viewAllObserverRef.current);
    return () => observer.disconnect();
  },[viewAll, isFetchingViewAll, language]);

  const handleItemClick = (item: any) => {
    if (typeof window !== 'undefined') {
       if (viewAll) sessionStorage.setItem('viewAllScrollY', window.scrollY.toString());
       else sessionStorage.setItem('homeScrollY', window.scrollY.toString());
    }

    const type = item.entity_type || item.type;
    const isSong = type === "TR" || type === "song" || item.track_id;

    if (isSong) {
      setPlayContext({ type: "Home", name: "Gaana Play" });
      setQueue([item]); setCurrentSong(item); setIsPlaying(true);
    } else if (type === "PL" || type === "playlist") {
      router.push(`/playlist/${item.seokey}`);
    } else if (type === "AL" || type === "album") {
      router.push(`/album/${item.seokey}`);
    } else if (type === "AR" || type === "artist") {
      router.push(`/artist/${item.seokey}`);
    }
  };

  const openViewAll = (section: any) => {
    if (typeof window !== 'undefined') {
       sessionStorage.setItem('homeScrollY', window.scrollY.toString());
       window.history.pushState({ viewAllOpen: true }, '', window.location.href); 
    }
    const vAll = { 
        title: section.title, 
        endpoint: section.url.split('&limit')[0].split('?limit')[0],
        noPagination: section.noPagination,
        showSubtitle: section.showSubtitle,
        data: section.data,
        offset: section.data.length,
        hasMore: true
    };
    setViewAll(vAll);
    if (typeof window !== 'undefined') sessionStorage.setItem('homeState_viewAll', JSON.stringify(vAll));
    window.scrollTo(0, 0);
  };

  const closeViewAll = (fromPopState = false) => {
    setViewAll(null);
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('homeState_viewAll');
        sessionStorage.removeItem('viewAllScrollY');
        
        const savedHomeScroll = sessionStorage.getItem('homeScrollY');
        setTimeout(() => window.scrollTo(0, savedHomeScroll ? parseInt(savedHomeScroll) : 0), 50);

        if (!fromPopState) window.history.back(); 
    }
  };

  // --- INITIAL YOUTUBE STYLE SKELETON ---
  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0B1320] text-white pt-10 pb-28">
         <style dangerouslySetInnerHTML={{__html:`
           @keyframes wave { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
           .skeleton-wave { position: relative; overflow: hidden; background-color: #131D30; }
           .skeleton-wave::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent); animation: wave 1.5s infinite; }
         `}} />
         <div className="px-4 mb-6 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full skeleton-wave"></div>
             <div className="h-7 w-32 rounded-md skeleton-wave"></div>
           </div>
         </div>
         <div className="mx-4 mb-8 rounded-full h-[54px] skeleton-wave"></div>
         <SectionSkeleton isShowcase={true} />
         <SectionSkeleton />
      </div>
    );
  }

  // --- VIEW ALL PAGE ---
  if (viewAll) {
    return (
      <main className="min-h-screen bg-[#0B1320] pt-10 pb-28 text-white">
        <style dangerouslySetInnerHTML={{__html:`
           @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(calc(-100% + 140px)); } }
           .animate-ping-pong { animation-name: ping-pong; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
           @keyframes wave { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
           .skeleton-wave { position: relative; overflow: hidden; background-color: #131D30; }
           .skeleton-wave::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent); animation: wave 1.5s infinite; }
        `}} />
        <div className="flex items-center px-4 mb-6 sticky top-0 bg-[#0B1320]/90 backdrop-blur-md z-10 py-3 border-b border-[#131D30]">
           <button onClick={() => closeViewAll(false)} className="p-2 bg-[#131D30] border border-[#1e293b] rounded-full active:scale-95"><ChevronLeft size={24} /></button>
           <h1 className="text-2xl font-extrabold ml-4 tracking-tight">{viewAll.title}</h1>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-y-8 gap-x-3 px-4 w-full justify-items-center">
           {viewAll.data.map((item: any, i: number) => (
               <PremiumCard key={i} item={item} showSubtitle={viewAll.showSubtitle} fullWidth={true} onClick={handleItemClick} />
           ))}

           {isFetchingViewAll && viewAll.hasMore && (
              <>
                 {[...Array(7)].map((_, i) => (
                    <div key={`skel-${i}`} className="w-full flex-shrink-0">
                      <div className="w-full aspect-[1/1] rounded-2xl mb-2 border border-[#1e293b] skeleton-wave"></div>
                      <div className="h-3 rounded w-3/4 mx-auto mt-2 skeleton-wave"></div>
                      <div className="h-2 rounded w-1/2 mx-auto mt-1.5 skeleton-wave"></div>
                    </div>
                 ))}
              </>
           )}
        </div>
        
        {!viewAll.noPagination && (
           <div ref={viewAllObserverRef} className="w-full flex justify-center py-4 mt-2">
              {!viewAll.hasMore && <p className="text-blue-200/50 text-sm font-medium">You have reached the end.</p>}
           </div>
        )}
      </main>
    );
  }

  return (
    <main className="pt-10 pb-28 min-h-screen bg-[#0B1320] selection:bg-[#1db954] selection:text-black" style={{ touchAction: 'pan-y' }}>
      <style dangerouslySetInnerHTML={{__html:`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(calc(-100% + 140px)); } }
        .animate-ping-pong { animation-name: ping-pong; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        @keyframes wave { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .skeleton-wave { position: relative; overflow: hidden; background-color: #131D30; }
        .skeleton-wave::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent); animation: wave 1.5s infinite; }
      `}} />

      {/* Header */}
      <div className="px-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="https://raw.githubusercontent.com/Ayush8481Lab/musicayush/refs/heads/main/app/android-chrome-192x192.png" alt="Logo" className="w-9 h-9 rounded-full shadow-[0_0_20px_rgba(29,185,84,0.3)]" />
          <h1 className="text-[28px] font-black tracking-tighter text-white drop-shadow-md">Music@8481</h1>
        </div>
      </div>

      <div onClick={() => router.push('/search?action=focus')} className="mx-4 mb-8 flex items-center bg-[#131D30] border border-[#1e293b] rounded-full h-[54px] px-5 cursor-pointer hover:bg-[#1a263d] active:scale-[0.98] transition-all shadow-lg">
         <SearchIcon size={22} className="text-blue-200/50" />
         <span className="text-blue-200/50 ml-3 text-[15px] font-medium tracking-wide">Search songs, artists, podcasts...</span>
         <button onClick={(e) => { e.stopPropagation(); router.push('/search?action=mic'); }} className="ml-auto p-2.5 text-blue-200/50 hover:text-white active:scale-90 transition-all rounded-full bg-[#0B1320] border border-[#1e293b]">
           <Mic size={18} />
         </button>
      </div>

      {sections.length > 0 && sections[0].key === "showcase" && (
        <div className="mb-10 mt-2">
          <div ref={showcaseRef} className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 items-center">
            {sections[0].data.map((item: any, i: number) => {
               return (
                  <div key={i} onClick={() => handleItemClick(item)} className="w-[90vw] md:w-[600px] flex-shrink-0 snap-center cursor-pointer rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-[#1e293b] active:scale-95 transition-transform duration-300">
                    <LazyImage src={getShowcaseImageUrl(item)} alt="Showcase" objectFit="object-contain" className="w-full aspect-[720/375]" />
                  </div>
               );
            })}
          </div>
        </div>
      )}

      {sections.map((section, idx) => {
        if (section.key === "showcase" || !section.data || section.data.length === 0) return null;
        return (
          <div key={idx} className="mb-10">
            <div className="flex items-center justify-between px-4 mb-4">
               <h2 className="text-[22px] font-black tracking-tight text-white">{section.title}</h2>
               <button onClick={() => openViewAll(section)} className="text-[12px] font-bold text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full hover:bg-blue-400/20 active:scale-95 transition-all">View All</button>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 pt-1">
              {section.data.map((item: any, i: number) => (
                  <PremiumCard key={i} item={item} showSubtitle={section.showSubtitle} onClick={handleItemClick} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Scroll Driven Lazy Loading Anchor & Wave Skeleton Buffer */}
      {nextIndexRef.current < SECTION_CONFIGS.length && (
         <>
            <div ref={observerRef} className="w-full h-1" />
            {isChunkLoading && <SectionSkeleton />}
         </>
      )}
    </main>
  );
}
