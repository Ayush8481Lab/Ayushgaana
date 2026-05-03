"use client";
import React, { useEffect, useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Search as SearchIcon, Mic, ChevronLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// --- API CONSTANTS ---
const API_BASE = "https://gaanaayush.vercel.app/api/superserch";

const SECTION_CONFIGS =[
  { key: "showcase", title: "Top Picks", url: "/home/showcase?userlanguage={lang}" },
  { key: "trending", title: "Trending", url: "/home/trending/songs/v1?trending_section=1&pkc=true&userlanguage={lang}" },
  { key: "top_charts", title: "Top Charts", url: "/home/playlist/top-charts?userlanguage={lang}" },
  { key: "top_playlists", title: "Top Playlists", url: "/home/section-data?seokey=top-playlists-1&view=all&userlanguage={lang}" },
  { key: "new_releases", title: "New Releases", url: "/home/album/featured/more?userlanguage={lang}" },
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

const getSubtitle = (item: any) => {
  let names =[];
  if (Array.isArray(item.artist)) names = item.artist.map((a: any) => a.name);
  else if (Array.isArray(item.singers)) names = item.singers.map((a: any) => a.name);
  else if (Array.isArray(item.artists)) names = item.artists.map((a: any) => a.name);
  else if (item.language) return item.language;
  return Array.from(new Set(names)).join(", ");
};

const PremiumCard = ({ item, isCircular, onClick }: any) => {
  const title = decodeEntities(item.track_title || item.name || item.title || "Unknown");
  const subtitle = decodeEntities(getSubtitle(item));
  const isLongTitle = title.length > 15;

  return (
    <div onClick={() => onClick(item)} className="w-[30vw] md:w-[150px] max-w-[140px] flex-shrink-0 snap-start cursor-pointer group pb-1">
      <div className={`relative overflow-hidden bg-[#0A192F] border border-[#112240] mb-2 transition-transform duration-200 active:scale-95 shadow-md ${isCircular ? "rounded-full aspect-square" : "rounded-xl aspect-[1/1]"}`}>
        <img src={getImageUrl(item)} alt={title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
      </div>
      <div className="w-full overflow-hidden whitespace-nowrap text-center">
        <span className={`inline-block text-[13px] md:text-[14px] font-extrabold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`} style={isLongTitle ? { animationDuration: `${Math.max(4, title.length * 0.15)}s` } : {}}>{title}</span>
      </div>
      {subtitle && (
        <div className="w-full overflow-hidden whitespace-nowrap text-center mt-0.5">
          <span className="inline-block text-[11px] md:text-[12px] font-medium text-blue-200/60 truncate w-full">{subtitle}</span>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const { language, setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  const router = useRouter();
  
  const [sections, setSections] = useState<any[]>([]);
  const[visibleCount, setVisibleCount] = useState(5); // Load 5 initially
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [viewAll, setViewAll] = useState<{ title: string; endpoint: string } | null>(null);
  const[viewAllData, setViewAllData] = useState<any[]>([]);
  const[viewAllOffset, setViewAllOffset] = useState(0);
  const [isFetchingViewAll, setIsFetchingViewAll] = useState(false);

  const showcaseRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const viewAllObserverRef = useRef<HTMLDivElement>(null);

  // Auto-Sliding Showcase
  useEffect(() => {
    if (viewAll || sections.length === 0 || !sections[0]?.data) return;
    const interval = setInterval(() => {
      if (showcaseRef.current) {
        const maxScroll = showcaseRef.current.scrollWidth - showcaseRef.current.clientWidth;
        if (showcaseRef.current.scrollLeft >= maxScroll - 10) showcaseRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        else showcaseRef.current.scrollBy({ left: showcaseRef.current.clientWidth, behavior: 'smooth' });
      }
    }, 4000);
    return () => clearInterval(interval);
  },[sections, viewAll]);

  // Initial Data Load (First 5 sections)
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const initialConfigs = SECTION_CONFIGS.slice(0, 5);
        const promises = initialConfigs.map(conf => 
          fetch(`${API_BASE}${conf.url.replace('{lang}', language)}&limit=0,15`).then(res => res.json())
        );
        const results = await Promise.all(promises);

        const mapped = initialConfigs.map((conf, i) => {
          const json = results[i];
          const data = json?.data?.entities || json?.data?.tracks || json?.data ||[];
          return { ...conf, data };
        });

        setSections(mapped);
      } catch (e) {}
      setLoading(false);
    };
    fetchInitial();
  }, [language]);

  // Lazy Load Remaining Sections on Scroll
  useEffect(() => {
    if (loading || viewAll || visibleCount >= SECTION_CONFIGS.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore) {
        setLoadingMore(true);
        const nextConf = SECTION_CONFIGS[visibleCount];
        fetch(`${API_BASE}${nextConf.url.replace('{lang}', language)}&limit=0,15`)
          .then(res => res.json())
          .then(json => {
            const data = json?.data?.entities || json?.data?.tracks || json?.data ||[];
            setSections(prev => [...prev, { ...nextConf, data }]);
            setVisibleCount(prev => prev + 1);
            setLoadingMore(false);
          }).catch(() => setLoadingMore(false));
      }
    }, { rootMargin: "200px" });

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  },[loading, visibleCount, viewAll, loadingMore, language]);

  // Infinite Scroll for "View All"
  useEffect(() => {
    if (!viewAll) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingViewAll) {
        setIsFetchingViewAll(true);
        const url = `${API_BASE}${viewAll.endpoint.replace('{lang}', language)}&limit=${viewAllOffset},40`;
        fetch(url).then(res => res.json()).then(json => {
           const newItems = json?.data?.entities || json?.data?.tracks || json?.data ||[];
           if (newItems.length > 0) {
             setViewAllData(prev => [...prev, ...newItems]);
             setViewAllOffset(prev => prev + 40);
           }
           setIsFetchingViewAll(false);
        }).catch(() => setIsFetchingViewAll(false));
      }
    }, { rootMargin: "200px" });

    if (viewAllObserverRef.current) observer.observe(viewAllObserverRef.current);
    return () => observer.disconnect();
  },[viewAll, viewAllOffset, isFetchingViewAll, language]);

  const handleItemClick = (item: any) => {
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
    setViewAll({ title: section.title, endpoint: section.url.split('&limit')[0].split('?limit')[0] });
    setViewAllData(section.data);
    setViewAllOffset(15);
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#020813] text-white">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse opacity-40 px-4 w-full">
           {[...Array(12)].map((_, i) => <div key={i} className="w-full aspect-[1/1] bg-[#0A192F] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (viewAll) {
    return (
      <main className="min-h-screen bg-[#020813] pt-10 pb-28 text-white">
        <div className="flex items-center px-4 mb-6 sticky top-0 bg-[#020813]/90 backdrop-blur-md z-10 py-3">
           <button onClick={() => setViewAll(null)} className="p-2 bg-[#0A192F] border border-[#112240] rounded-full active:scale-95"><ChevronLeft size={24} /></button>
           <h1 className="text-2xl font-extrabold ml-4 tracking-tight">{viewAll.title}</h1>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-y-6 gap-x-2 px-4 justify-items-center">
           {viewAllData.map((item, i) => <PremiumCard key={i} item={item} onClick={handleItemClick} />)}
        </div>
        <div ref={viewAllObserverRef} className="w-full flex justify-center py-6">
           {isFetchingViewAll && <Loader2 className="animate-spin text-[#1db954]" size={30} />}
        </div>
      </main>
    );
  }

  return (
    <main className="pt-10 pb-28 min-h-screen bg-[#020813] selection:bg-[#1db954] selection:text-black" style={{ touchAction: 'pan-y' }}>
      <style dangerouslySetInnerHTML={{__html:`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(calc(-100% + 140px)); } }
        .animate-ping-pong { animation-name: ping-pong; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
      `}} />

      {/* Header */}
      <div className="px-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="https://raw.githubusercontent.com/Ayush8481Lab/musicayush/refs/heads/main/app/android-chrome-192x192.png" alt="Logo" className="w-9 h-9 rounded-full shadow-[0_0_20px_rgba(29,185,84,0.4)]" />
          <h1 className="text-[28px] font-black tracking-tighter text-white drop-shadow-md">Music@8481</h1>
        </div>
      </div>

      <div onClick={() => router.push('/search?action=focus')} className="mx-4 mb-8 flex items-center bg-[#0A192F] border border-[#112240] rounded-full h-[54px] px-5 cursor-pointer hover:bg-[#112240] active:scale-[0.98] transition-all shadow-xl">
         <SearchIcon size={22} className="text-blue-200/50" />
         <span className="text-blue-200/50 ml-3 text-[15px] font-medium tracking-wide">Search songs, artists, podcasts...</span>
         <button onClick={(e) => { e.stopPropagation(); router.push('/search?action=mic'); }} className="ml-auto p-2.5 text-blue-200/50 hover:text-white active:scale-90 transition-all rounded-full bg-[#020813] border border-[#112240]">
           <Mic size={18} />
         </button>
      </div>

      {/* Showcase / Top Picks */}
      {sections[0] && sections[0].key === "showcase" && sections[0].data.length > 0 && (
        <div className="mb-10">
          <h2 className="text-[22px] font-black mb-4 px-4 text-white tracking-tight">Top Picks</h2>
          <div ref={showcaseRef} className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 pt-1">
            {sections[0].data.map((item: any, i: number) => (
              <div key={i} onClick={() => handleItemClick(item)} className="w-[85vw] md:w-[400px] h-[45vw] md:h-[220px] flex-shrink-0 snap-center cursor-pointer rounded-2xl overflow-hidden relative shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:scale-95 transition-transform duration-300 border border-[#112240]">
                <img src={getImageUrl(item)} alt="Showcase" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-bold text-lg drop-shadow-md truncate">{item.track_title || item.name || item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Render of All Other Sections */}
      {sections.slice(1).map((section, idx) => {
        if (!section.data || section.data.length === 0) return null;
        const isArtists = section.key === "mid_year" || section.key === "top_search" || section.key === "star_gallery";
        
        return (
          <div key={idx} className="mb-10">
            <div className="flex items-center justify-between px-4 mb-4">
               <h2 className="text-[22px] font-black tracking-tight text-white">{section.title}</h2>
               <button onClick={() => openViewAll(section)} className="text-[12px] font-bold text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full hover:bg-blue-400/20 active:scale-95 transition-all">View All</button>
            </div>
            <div className="flex gap-3 md:gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 pt-1">
              {section.data.map((item: any, i: number) => <PremiumCard key={i} item={item} isCircular={isArtists} onClick={handleItemClick} />)}
            </div>
          </div>
        );
      })}

      {/* Bottom Loader Anchor */}
      {visibleCount < SECTION_CONFIGS.length && (
         <div ref={observerRef} className="w-full flex justify-center py-6">
            <Loader2 className="animate-spin text-[#1db954]" size={30} />
         </div>
      )}
    </main>
  );
}
