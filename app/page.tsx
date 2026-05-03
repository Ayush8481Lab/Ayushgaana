"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import { Search as SearchIcon, Mic, ChevronLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const getImageUrl = (item: any) => {
  let img = item.artwork_large || item.artwork_web || item.atw || item.artwork || item.image || "https://via.placeholder.com/500x500?text=Music";
  return img.replace("150x150", "500x500").replace("50x50", "500x500");
};

const decodeEntities = (text: string) => text ? text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";

const PremiumCard = ({ item, isCircular, onClick }: any) => {
  const title = decodeEntities(item.track_title || item.name || item.title || "Unknown");
  const isLongTitle = title.length > 15;

  return (
    <div onClick={() => onClick(item)} className="w-[140px] flex-shrink-0 snap-start cursor-pointer group pb-1">
      <div className={`relative overflow-hidden bg-[#131d30] border border-[#1e293b] mb-2 transition-transform duration-200 active:scale-95 shadow-lg ${isCircular ? "rounded-full aspect-square" : "rounded-xl aspect-[1/1]"}`}>
        <img src={getImageUrl(item)} alt={title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
      </div>
      <div className="w-full overflow-hidden whitespace-nowrap text-center">
        <span className={`inline-block text-[14px] font-bold text-white tracking-wide ${isLongTitle ? "animate-ping-pong" : ""}`} style={isLongTitle ? { animationDuration: `${Math.max(4, title.length * 0.15)}s` } : {}}>{title}</span>
      </div>
    </div>
  );
};

export default function Home() {
  const { language, setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext() as any;
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const[viewAll, setViewAll] = useState<{ title: string; endpoint: string } | null>(null);
  const[viewAllData, setViewAllData] = useState<any[]>([]);
  const[viewAllOffset, setViewAllOffset] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const [showcase, setShowcase] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const showcaseRef = useRef<HTMLDivElement>(null);

  // Auto-scroll showcase
  useEffect(() => {
    if (viewAll || showcase.length === 0) return;
    const interval = setInterval(() => {
      if (showcaseRef.current) {
        const maxScroll = showcaseRef.current.scrollWidth - showcaseRef.current.clientWidth;
        if (showcaseRef.current.scrollLeft >= maxScroll - 10) showcaseRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        else showcaseRef.current.scrollBy({ left: showcaseRef.current.clientWidth, behavior: 'smooth' });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [showcase, viewAll]);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const endpoints =[
          { title: "Top Picks", url: `/home/showcase?userlanguage=${language}` },
          { title: "Trending Songs", url: `/home/trending/songs/v1?trending_section=1&pkc=true&userlanguage=${language}` },
          { title: "Top Charts", url: `/home/playlist/top-charts?limit=0,15&userlanguage=${language}` },
          { title: "Top Playlists", url: `/home/section-data?seokey=top-playlists-1&view=all&limit=0,15&userlanguage=${language}` },
          { title: "New Releases", url: `/home/album/featured/more?limit=0,15&userlanguage=${language}` },
          { title: "Back to 90s", url: `/home/section-data?seokey=90s-2000s&view=all&limit=0,15&userlanguage=${language}` },
          { title: "Bhakti", url: `/home/section-data?seokey=bhakti&view=all&limit=0,15&userlanguage=${language}` },
          { title: "Romance", url: `/home/section-data?seokey=romance&view=all&limit=0,15&userlanguage=${language}` },
          { title: "City Top Charts", url: `/home/section-data?seokey=city-top-charts&view=all&limit=0,15&userlanguage=${language}` }
        ];

        const fetchPromises = endpoints.map(ep => fetch(`https://gaanaayush.vercel.app/api/superserch${ep.url}`).then(res => res.json()));
        const results = await Promise.all(fetchPromises);

        setShowcase(results[0]?.data?.entities ||[]);
        
        const mappedSections = endpoints.slice(1).map((ep, i) => {
          let items = results[i + 1]?.data?.entities || results[i + 1]?.data?.tracks ||[];
          // Strip out the limit part to save dynamic endpoint for "View All"
          let baseEndpoint = ep.url.replace(/limit=0,15&?/, ""); 
          return { title: ep.title, data: items, endpoint: baseEndpoint };
        });
        setSections(mappedSections);
      } catch (error) {}
      setLoading(false);
    };
    fetchHomeData();
  }, [language]);

  const handleItemClick = (item: any) => {
    const type = item.entity_type || item.type;
    const isSong = type === "TR" || type === "song" || item.track_id;

    if (isSong) {
      setPlayContext({ type: "Home", name: "Home Selected" });
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
    setViewAll({ title: section.title, endpoint: section.endpoint });
    setViewAllData(section.data);
    setViewAllOffset(15);
  };

  // Infinite Scroll Logic for View All
  useEffect(() => {
    if (!viewAll) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingMore) loadMore();
    }, { rootMargin: "100px" });

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [viewAll, viewAllOffset, isFetchingMore]);

  const loadMore = async () => {
    if (!viewAll) return;
    setIsFetchingMore(true);
    try {
      const url = `https://gaanaayush.vercel.app/api/superserch${viewAll.endpoint}${viewAll.endpoint.includes('?') ? '&' : '?'}limit=${viewAllOffset},40`;
      const res = await fetch(url);
      const json = await res.json();
      const newItems = json?.data?.entities || json?.data?.tracks ||[];
      if (newItems.length > 0) {
        setViewAllData(prev => [...prev, ...newItems]);
        setViewAllOffset(prev => prev + 40);
      }
    } catch (e) {}
    setIsFetchingMore(false);
  };

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#0B1320] text-white">
       <Loader2 size={40} className="animate-spin text-[#1db954] mb-4" />
    </div>
  );

  if (viewAll) {
    return (
      <main className="min-h-screen bg-[#0B1320] pt-10 pb-28 text-white">
        <div className="flex items-center px-4 mb-6 sticky top-0 bg-[#0B1320]/90 backdrop-blur-md z-10 py-3">
           <button onClick={() => setViewAll(null)} className="p-2 bg-[#131d30] rounded-full active:scale-95"><ChevronLeft size={24} /></button>
           <h1 className="text-2xl font-bold ml-4">{viewAll.title}</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
           {viewAllData.map((item, i) => <PremiumCard key={i} item={item} onClick={handleItemClick} />)}
        </div>
        <div ref={loaderRef} className="w-full flex justify-center py-6">
           {isFetchingMore && <Loader2 className="animate-spin text-[#1db954]" size={30} />}
        </div>
      </main>
    );
  }

  return (
    <main className="pt-10 pb-28 min-h-screen bg-[#0B1320]" style={{ touchAction: 'pan-y' }}>
      <style dangerouslySetInnerHTML={{__html:`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(calc(-100% + 140px)); } }
        .animate-ping-pong { animation-name: ping-pong; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
      `}} />

      {/* Header */}
      <div className="px-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="https://raw.githubusercontent.com/Ayush8481Lab/musicayush/refs/heads/main/app/android-chrome-192x192.png" alt="Logo" className="w-8 h-8 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          <h1 className="text-[26px] font-black tracking-tighter text-white">Music@8481</h1>
        </div>
      </div>

      <div onClick={() => router.push('/search?action=focus')} className="mx-4 mb-8 flex items-center bg-[#131d30] border border-[#1e293b] rounded-full h-[52px] px-4 cursor-pointer hover:bg-[#1a263d] active:scale-[0.98] transition-all shadow-lg">
         <SearchIcon size={20} className="text-white/50" />
         <span className="text-white/50 ml-3 text-[15px] font-medium tracking-wide">Search songs, artists...</span>
         <button onClick={(e) => { e.stopPropagation(); router.push('/search?action=mic'); }} className="ml-auto p-2 text-white/50 hover:text-white active:scale-90 transition-all rounded-full bg-[#1a263d]">
           <Mic size={18} />
         </button>
      </div>

      {/* Auto Scrolling Showcase */}
      {showcase.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[20px] font-bold mb-3 px-4 text-white">Top Picks</h2>
          <div ref={showcaseRef} className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 pt-1">
            {showcase.map((item, i) => (
              <div key={i} onClick={() => handleItemClick(item)} className="w-[300px] h-[160px] flex-shrink-0 snap-start cursor-pointer rounded-xl overflow-hidden relative shadow-lg">
                <img src={getImageUrl(item)} alt="Banner" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Sections */}
      {sections.map((section, idx) => {
        if (!section.data || section.data.length === 0) return null;
        return (
          <div key={idx} className="mb-8">
            <div className="flex items-center justify-between px-4 mb-3">
               <h2 className="text-[20px] font-bold tracking-tight text-white">{section.title}</h2>
               <button onClick={() => openViewAll(section)} className="text-[13px] font-bold text-[#1db954] uppercase tracking-wider">View All</button>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 pt-1">
              {section.data.map((item: any, i: number) => <PremiumCard key={i} item={item} onClick={handleItemClick} />)}
            </div>
          </div>
        );
      })}
    </main>
  );
}
