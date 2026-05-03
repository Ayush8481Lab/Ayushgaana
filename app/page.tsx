/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Search as SearchIcon, Mic, ChevronLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// --- API CONSTANTS ---
const API_BASE = "https://gaanaayush.vercel.app/api/superserch";

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

const getImageUrl = (item: any) => {
  let img = item.artwork_large || item.artwork_web || item.atw || item.artwork || item.image || "https://via.placeholder.com/500x500?text=Music";
  return img.replace("150x150", "500x500").replace("50x50", "500x500");
};

const decodeEntities = (text: string) => text ? text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";

// Intelligently parse Gaana's nested arrays for artists (for Trending & New Releases)
const getSubtitle = (item: any) => {
  let names: string[] =[];
  
  if (item.entity_info) {
     const artistInfo = item.entity_info.find((info: any) => info.key === 'artist' || info.key === 'singers');
     if (artistInfo && Array.isArray(artistInfo.value)) {
        names = artistInfo.value.map((a: any) => a.name);
     }
  }
  
  if (names.length === 0) {
     if (Array.isArray(item.artist)) names = item.artist.map((a: any) => a.name);
     else if (Array.isArray(item.singers)) names = item.singers.map((a: any) => a.name);
     else if (Array.isArray(item.artists)) names = item.artists.map((a: any) => a.name);
  }
  
  return Array.from(new Set(names)).join(", ");
};

const PremiumCard = ({ item, onClick, showSubtitle, fullWidth = false }: any) => {
  const title = decodeEntities(item.track_title || item.name || item.title || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item));
  const isLongTitle = title.length > 13;

  return (
    // Scaled exactly by 1.5x, fitting 3 cards automatically on mobile screens with nice spacing.
    <div onClick={() => onClick(item)} className={`${fullWidth ? 'w-full' : 'w-[38vw] sm:w-[180px] md:w-[210px]'} flex-shrink-0 snap-start cursor-pointer group pb-1`}>
      <div className="relative overflow-hidden bg-[#131D30] border border-[#1e293b] rounded-2xl aspect-[1/1] mb-2 transition-transform duration-200 active:scale-95 shadow-md">
        <img src={getImageUrl(item)} alt={title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
      </div>
      <div className="w-full overflow-hidden whitespace-nowrap text-center px-1">
        <span className={`inline-block text-[14px] md:text-[16px] font-extrabold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`} style={isLongTitle ? { animationDuration: `${Math.max(4, title.length * 0.15)}s` } : {}}>{title}</span>
      </div>
      {showSubtitle && subtitle && (
        <div className="w-full overflow-hidden whitespace-nowrap text-center mt-0.5 px-1">
          <span className="inline-block text-[12px] md:text-[14px] font-medium text-blue-200/60 truncate w-full">{subtitle}</span>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const { language, setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  const router = useRouter();
  
  const [sections, setSections] = useState<any[]>([]);
  const nextIndexRef = useRef(0);
  const isLoadingRef = useRef(false);

  const[viewAll, setViewAll] = useState<any | null>(null);
  const[viewAllData, setViewAllData] = useState<any[]>([]);
  const [viewAllOffset, setViewAllOffset] = useState(0);
  const [isFetchingViewAll, setIsFetchingViewAll] = useState(false);
  const[hasMoreViewAll, setHasMoreViewAll] = useState(true);

  const showcaseRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const viewAllObserverRef = useRef<HTMLDivElement>(null);

  // Clear Session storage specifically tied to home cache safely
  const clearHomeState = () => {
     Object.keys(sessionStorage).forEach(k => {
        if(k.startsWith('homeState_') || k === 'homeScrollY' || k === 'viewAllScrollY') sessionStorage.removeItem(k);
     });
  };

  // --- PROGRESSIVE SCROLL FETCHER (Loads 3 sections simultaneously to prevent blanking) ---
  const fetchNextChunk = async (chunkSize = 3) => {
    if (nextIndexRef.current >= SECTION_CONFIGS.length || isLoadingRef.current || viewAll) return;
    isLoadingRef.current = true;
    
    try {
      const newSections: any[] =[];
      const promises = [];
      const configs =[];

      for (let i = 0; i < chunkSize; i++) {
        const idx = nextIndexRef.current + i;
        if (idx >= SECTION_CONFIGS.length) break;
        
        const conf = SECTION_CONFIGS[idx];
        let url = `${API_BASE}${conf.url.replace('{lang}', language)}`;
        if (!conf.noPagination) url += url.includes('?') ? '&limit=0,15' : '?limit=0,15';

        promises.push(fetch(url).then(res => res.json()).catch(() => null));
        configs.push(conf);
      }

      const results = await Promise.all(promises);
      
      results.forEach((json, i) => {
         if(json) {
            const data = json?.data?.entities || json?.data?.tracks || json?.data ||[];
            if (data.length > 0) newSections.push({ ...configs[i], data });
         }
      });

      setSections(prev => {
          const updated = [...prev, ...newSections];
          sessionStorage.setItem('homeState_sections', JSON.stringify(updated));
          return updated;
      });

      nextIndexRef.current += chunkSize;
      sessionStorage.setItem('homeState_nextIndex', nextIndexRef.current.toString());
    } catch (e) { console.error(e); }
    
    isLoadingRef.current = false;
  };

  // --- INITIAL MOUNT & STATE RESTORATION ---
  useEffect(() => {
    const initLoad = async () => {
      const savedLang = sessionStorage.getItem('homeState_lang');
      
      // If language matches, strictly restore position perfectly from Session
      if (savedLang === language) {
         const savedSections = sessionStorage.getItem('homeState_sections');
         if (savedSections && JSON.parse(savedSections).length > 0) {
            setSections(JSON.parse(savedSections));
            nextIndexRef.current = parseInt(sessionStorage.getItem('homeState_nextIndex') || '0');
            
            const savedViewAll = sessionStorage.getItem('homeState_viewAll');
            if (savedViewAll && savedViewAll !== 'null') {
               setViewAll(JSON.parse(savedViewAll));
               setViewAllData(JSON.parse(sessionStorage.getItem('homeState_viewAllData') || '[]'));
               setViewAllOffset(parseInt(sessionStorage.getItem('homeState_viewAllOffset') || '0'));
               setHasMoreViewAll(sessionStorage.getItem('homeState_hasMore') === 'true');
               setTimeout(() => window.scrollTo(0, parseInt(sessionStorage.getItem('viewAllScrollY') || '0')), 50);
            } else {
               setTimeout(() => window.scrollTo(0, parseInt(sessionStorage.getItem('homeScrollY') || '0')), 50);
            }
            return; 
         }
      }

      // If language changed or cache is empty, fresh fast-paint load
      clearHomeState();
      sessionStorage.setItem('homeState_lang', language);
      setSections([]);
      setViewAll(null);
      nextIndexRef.current = 0;
      await fetchNextChunk(3); 
    };

    initLoad();
  }, [language]);

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

  // Lazy Load Remaining Sections on Scroll
  useEffect(() => {
    if (viewAll) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
         fetchNextChunk(3);
      }
    }, { rootMargin: "800px" });

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [sections, viewAll, language]);

  // Infinite Scroll for "View All" (Stops fetching if blank data triggers end)
  useEffect(() => {
    if (!viewAll || viewAll.noPagination || !hasMoreViewAll) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingViewAll) {
        setIsFetchingViewAll(true);
        const url = `${API_BASE}${viewAll.endpoint.replace('{lang}', language)}&limit=${viewAllOffset},40`;
        fetch(url).then(res => res.json()).then(json => {
           const newItems = json?.data?.entities || json?.data?.tracks || json?.data ||[];
           
           if (newItems.length > 0) {
             setViewAllData(prev => {
                const updated =[...prev, ...newItems];
                sessionStorage.setItem('homeState_viewAllData', JSON.stringify(updated));
                return updated;
             });
             setViewAllOffset(prev => {
                const nextOff = prev + 40;
                sessionStorage.setItem('homeState_viewAllOffset', nextOff.toString());
                return nextOff;
             });
           } else {
             // Reached the end of content
             setHasMoreViewAll(false);
             sessionStorage.setItem('homeState_hasMore', 'false');
           }
           setIsFetchingViewAll(false);
        }).catch(() => {
           setIsFetchingViewAll(false);
           setHasMoreViewAll(false);
        });
      }
    }, { rootMargin: "400px" });

    if (viewAllObserverRef.current) observer.observe(viewAllObserverRef.current);
    return () => observer.disconnect();
  },[viewAll, viewAllOffset, isFetchingViewAll, hasMoreViewAll, language]);

  const handleItemClick = (item: any) => {
    if (viewAll) {
       sessionStorage.setItem('viewAllScrollY', window.scrollY.toString());
    } else {
       sessionStorage.setItem('homeScrollY', window.scrollY.toString());
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
    sessionStorage.setItem('homeScrollY', window.scrollY.toString());
    const vAll = { 
        title: section.title, 
        endpoint: section.url.split('&limit')[0].split('?limit')[0],
        noPagination: section.noPagination,
        showSubtitle: section.showSubtitle
    };
    setViewAll(vAll);
    setViewAllData(section.data);
    setViewAllOffset(section.data.length);
    setHasMoreViewAll(true);
    
    sessionStorage.setItem('homeState_viewAll', JSON.stringify(vAll));
    sessionStorage.setItem('homeState_viewAllData', JSON.stringify(section.data));
    sessionStorage.setItem('homeState_viewAllOffset', section.data.length.toString());
    sessionStorage.setItem('homeState_hasMore', 'true');
    
    window.scrollTo(0, 0);
  };

  const closeViewAll = () => {
    setViewAll(null);
    sessionStorage.removeItem('homeState_viewAll');
    setTimeout(() => {
        window.scrollTo(0, parseInt(sessionStorage.getItem('homeScrollY') || '0'));
    }, 50);
  };

  // Immediate Initial Loader
  if (sections.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0B1320] text-white">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse opacity-40 px-4 w-full">
           {[...Array(12)].map((_, i) => <div key={i} className="w-full aspect-[1/1] bg-[#131D30] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // --- VIEW ALL PAGE ---
  if (viewAll) {
    return (
      <main className="min-h-screen bg-[#0B1320] pt-10 pb-28 text-white">
        <div className="flex items-center px-4 mb-6 sticky top-0 bg-[#0B1320]/90 backdrop-blur-md z-10 py-3 border-b border-[#131D30]">
           <button onClick={closeViewAll} className="p-2 bg-[#131D30] border border-[#1e293b] rounded-full active:scale-95"><ChevronLeft size={24} /></button>
           <h1 className="text-2xl font-extrabold ml-4 tracking-tight">{viewAll.title}</h1>
        </div>
        
        {/* Dynamic perfect grid filling area evenly */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-y-8 gap-x-3 px-4 w-full justify-items-center">
           {viewAllData.map((item, i) => (
               <PremiumCard key={i} item={item} showSubtitle={viewAll.showSubtitle} fullWidth={true} onClick={handleItemClick} />
           ))}
        </div>
        
        {!viewAll.noPagination && (
           <div ref={viewAllObserverRef} className="w-full flex justify-center py-8 mt-4">
              {isFetchingViewAll && hasMoreViewAll && <Loader2 className="animate-spin text-[#1db954]" size={30} />}
              {!hasMoreViewAll && <p className="text-blue-200/50 text-sm font-medium">You have reached the end.</p>}
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
      `}} />

      {/* Header */}
      <div className="px-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="https://raw.githubusercontent.com/Ayush8481Lab/musicayush/refs/heads/main/app/android-chrome-192x192.png" alt="Logo" className="w-9 h-9 rounded-full shadow-[0_0_20px_rgba(29,185,84,0.3)]" />
          <h1 className="text-[28px] font-black tracking-tighter text-white drop-shadow-md">Music@8481</h1>
        </div>
      </div>

      {/* Search Bar */}
      <div onClick={() => router.push('/search?action=focus')} className="mx-4 mb-8 flex items-center bg-[#131D30] border border-[#1e293b] rounded-full h-[54px] px-5 cursor-pointer hover:bg-[#1a263d] active:scale-[0.98] transition-all shadow-lg">
         <SearchIcon size={22} className="text-blue-200/50" />
         <span className="text-blue-200/50 ml-3 text-[15px] font-medium tracking-wide">Search songs, artists, podcasts...</span>
         <button onClick={(e) => { e.stopPropagation(); router.push('/search?action=mic'); }} className="ml-auto p-2.5 text-blue-200/50 hover:text-white active:scale-90 transition-all rounded-full bg-[#0B1320] border border-[#1e293b]">
           <Mic size={18} />
         </button>
      </div>

      {/* Showcase / Top Picks (Uncropped native ratio prioritizing artwork_alt) */}
      {sections.length > 0 && sections[0].key === "showcase" && (
        <div className="mb-10">
          <h2 className="text-[22px] font-black mb-4 px-4 text-white tracking-tight">Top Picks</h2>
          <div ref={showcaseRef} className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 pt-1 items-center">
            {sections[0].data.map((item: any, i: number) => {
               // Safely extract the original showcase wide image
               let imgUrl = item.artwork_alt || item.atw_alt || item.artwork_web || item.artwork_large || item.artwork || item.atw;
               if (imgUrl) imgUrl = imgUrl.replace('size_m', 'size_l').replace('150x150', '500x500');

               return (
                  <div key={i} onClick={() => handleItemClick(item)} className="w-[90vw] md:w-[600px] flex-shrink-0 snap-center cursor-pointer rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.4)] active:scale-95 transition-transform duration-300">
                    <img src={imgUrl} alt="Showcase" className="w-full h-auto block object-contain" />
                  </div>
               );
            })}
          </div>
        </div>
      )}

      {/* Dynamic Render of All Other Sections */}
      {sections.map((section, idx) => {
        if (section.key === "showcase" || !section.data || section.data.length === 0) return null;
        
        return (
          <div key={idx} className="mb-10">
            <div className="flex items-center justify-between px-4 mb-4">
               <h2 className="text-[22px] font-black tracking-tight text-white">{section.title}</h2>
               <button onClick={() => openViewAll(section)} className="text-[12px] font-bold text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full hover:bg-blue-400/20 active:scale-95 transition-all">View All</button>
            </div>
            <div className="flex gap-4 md:gap-5 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 pt-1">
              {section.data.map((item: any, i: number) => (
                  <PremiumCard key={i} item={item} showSubtitle={section.showSubtitle} onClick={handleItemClick} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Bottom Loader Anchor for Infinite Section Scroll */}
      {nextIndexRef.current < SECTION_CONFIGS.length && (
         <div ref={observerRef} className="w-full flex justify-center py-6 mt-4">
            <Loader2 className="animate-spin text-[#1db954]" size={30} />
         </div>
      )}
    </main>
  );
}
