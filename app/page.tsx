/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from "react";
import { useAppContext } from "../context/AppContext";
import { Search as SearchIcon, Mic, ChevronLeft, Sparkles, Flame } from "lucide-react";
import { useRouter } from "next/navigation";

// --- API CONSTANTS & SECRETS ---
const VERCEL_API_BASE = "https://gaanaayush.vercel.app/api/superserch";
const CF_API_BASE = "https://gaanaayush.wonder945177.workers.dev/api/superserch";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const AUTOMATION_SECRET = "pR3nSUsTI9HQxb2RbdasB5mjKqUoSP8m";

const SECTION_CONFIGS = [
  { key: "showcase", title: "Top Picks", url: "/home/showcase?userlanguage={lang}", noPagination: true },
  { key: "trending", title: "Trending Songs", url: "/home/smartfeed/765?view=all&userlanguage={lang}", showSubtitle: true, noPagination: true },
{ key: "new_releases", title: "New Releases", url: "/home/album/featured/more?userlanguage={lang}", showSubtitle: true },
  { key: "just_arrived", title: "Just Arrived", url: "/home/section-data?seokey=just-arrived&view=all&userlanguage={lang}" },
  { key: "top_charts", title: "Top Charts", url: "/home/playlist/top-charts?userlanguage={lang}" },
    { key: "city_charts", title: "City Top Charts", url: "/home/section-data?seokey=city-top-charts&view=all&userlanguage={lang}" },
  { key: "top_playlists", title: "Top Playlists", url: "/home/section-data?seokey=top-playlists-1&view=all&userlanguage={lang}" },
  { key: "90s", title: "Back to 90s", url: "/home/section-data?seokey=90s-2000s&view=all&userlanguage={lang}" },
  { key: "bhakti", title: "Bhakti", url: "/home/section-data?seokey=bhakti&view=all&userlanguage={lang}" },
  { key: "lohri", title: "Shades of Love", url: "/home/section-data?seokey=lohri&view=all&userlanguage={lang}" },
  { key: "mid_year", title: "Top Streamed Artists", url: "/home/section-data?seokey=mid-year-recap-2024&view=all&userlanguage={lang}" },
  { key: "romance", title: "Romance", url: "/home/section-data?seokey=romance&view=all&userlanguage={lang}" },
  { key: "star_gallery", title: "Star Gallery", url: "/home/section-data?seokey=star-gallery&view=all&userlanguage={lang}" },
 { key: "top_search", title: "Top Searched Artists", url: "/home/section-data?seokey=top-searched-artists&view=all&userlanguage={lang}" },
  { key: "mehfil", title: "Mehfil-e-ghazal", url: "/home/section-data?seokey=mehfil-e-ghazal&view=all&userlanguage={lang}" },
];

// --- IRONCLAD GLOBAL FETCH LOCKS & CONCURRENCY CONTROLS ---
declare global {
  interface Window {
    __API_QUEUE_PROMISE__?: Promise<any>;
    __CF_ACTIVE_REQUESTS__?: number;
    __CF_QUEUE__?: (() => void)[];
  }
}

// 1. STRICT FETCHER (For Vercel API only - max 1 request/second)
const fetchVercelStrictly = (url: string): Promise<any> => {
  try {
    const cachedStr = sessionStorage.getItem(`api_cache_${url}`);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (Date.now() - cached.timestamp < CACHE_DURATION) return Promise.resolve(cached.data);
    }
  } catch (e) {}

  if (typeof window === "undefined") return Promise.resolve(null);

  if (!window.__API_QUEUE_PROMISE__) {
    window.__API_QUEUE_PROMISE__ = Promise.resolve();
  }

  const task = async () => {
    try {
      const res = await fetch(url, {
        headers: { "x-vercel-protection-bypass": AUTOMATION_SECRET },
      });

      let data = null;
      if (res.ok || res.status === 202 || res.status === 200) {
        data = await res.json();
        try {
          sessionStorage.setItem(`api_cache_${url}`, JSON.stringify({ timestamp: Date.now(), data }));
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

// 2. CONCURRENT FETCHER (For CF API - Up to 4 requests simultaneously)
const fetchCF = (url: string): Promise<any> => {
  try {
    const cachedStr = sessionStorage.getItem(`api_cache_${url}`);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (Date.now() - cached.timestamp < CACHE_DURATION) return Promise.resolve(cached.data);
    }
  } catch (e) {}

  if (typeof window === "undefined") return Promise.resolve(null);

  if (window.__CF_ACTIVE_REQUESTS__ === undefined) {
    window.__CF_ACTIVE_REQUESTS__ = 0;
    window.__CF_QUEUE__ = [];
  }

  return new Promise((resolve) => {
    const task = async () => {
      window.__CF_ACTIVE_REQUESTS__!++;
      try {
        const res = await fetch(url, {
          headers: { "x-vercel-protection-bypass": AUTOMATION_SECRET },
        });

        let data = null;
        if (res.ok || res.status === 202 || res.status === 200) {
          data = await res.json();
          try {
            sessionStorage.setItem(`api_cache_${url}`, JSON.stringify({ timestamp: Date.now(), data }));
          } catch (e) {}
        }
        resolve(data);
      } catch (e) {
        resolve(null);
      } finally {
        window.__CF_ACTIVE_REQUESTS__!--;
        if (window.__CF_QUEUE__!.length > 0) {
          const next = window.__CF_QUEUE__!.shift();
          if (next) next();
        }
      }
    };

    if (window.__CF_ACTIVE_REQUESTS__! < 4) {
      task();
    } else {
      window.__CF_QUEUE__!.push(task);
    }
  });
};

// --- UTILS (Optimized for Low-RAM Texture Memory) ---
const getImageUrl = (item: any) => {
  const img =
    item.artwork_web ||
    item.artwork_large ||
    item.atw ||
    item.artwork ||
    item.image ||
    "https://a10.gaanacdn.com/gn_img/default/Song/size_m.jpg";
  return img.replace(/size_[sl]/g, "size_m").replace("50x50", "175x175");
};

const getShowcaseImageUrl = (item: any) => {
  if (item.entity_info && Array.isArray(item.entity_info)) {
    const artworkAlt = item.entity_info.find((i: any) => i.key === "artwork_alt");
    if (artworkAlt && artworkAlt.value) return artworkAlt.value.replace(/size_[ms]/g, "size_l");
    const atwAlt = item.entity_info.find((i: any) => i.key === "atw_alt");
    if (atwAlt && atwAlt.value) return atwAlt.value.replace(/size_[ms]/g, "size_l");
  }
  const imgUrl = item.artwork_alt || item.atw_alt || item.artwork_web || item.artwork_large || item.artwork || item.atw;
  if (imgUrl) return imgUrl.replace(/size_[ms]/g, "size_l").replace("150x150", "500x500");
  return "https://a10.gaanacdn.com/gn_img/default/Song/size_l.jpg";
};

const decodeEntities = (text: string) =>
  text
    ? text
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
    : "";

const getSubtitle = (item: any) => {
  let names: string[] = [];
  if (item.entity_info) {
    const artistInfo = item.entity_info.find((info: any) => info.key === "artist" || info.key === "singers");
    if (artistInfo && Array.isArray(artistInfo.value)) names = artistInfo.value.map((a: any) => a.name);
  }
  if (names.length === 0) {
    if (Array.isArray(item.artist)) names = item.artist.map((a: any) => a.name);
    else if (Array.isArray(item.singers)) names = item.singers.map((a: any) => a.name);
    else if (Array.isArray(item.artists)) names = item.artists.map((a: any) => a.name);
  }
  return Array.from(new Set(names)).join(", ");
};

// --- DYNAMIC TIME GREETING & SUPER-COLORFUL THEME ENGINE ---
const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Hello, Good Morning",
      subtext: "Energize your morning with vibrant hits",
      gradient: "from-amber-200 via-orange-400 to-pink-500",
      badge: "bg-gradient-to-r from-amber-500/20 to-pink-500/20 border-amber-400/40 text-amber-200",
      orb1: "rgba(245, 158, 11, 0.28)",
      orb2: "rgba(236, 72, 153, 0.25)",
      orb3: "rgba(139, 92, 246, 0.22)",
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      greeting: "Hello, Good Afternoon",
      subtext: "Keep your afternoon groove alive",
      gradient: "from-cyan-200 via-sky-400 to-fuchsia-400",
      badge: "bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border-cyan-400/40 text-cyan-200",
      orb1: "rgba(6, 182, 212, 0.28)",
      orb2: "rgba(217, 70, 239, 0.24)",
      orb3: "rgba(59, 130, 246, 0.22)",
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      greeting: "Hello, Good Evening",
      subtext: "Unwind with neon evening melodies",
      gradient: "from-fuchsia-200 via-pink-400 to-indigo-400",
      badge: "bg-gradient-to-r from-fuchsia-500/20 to-indigo-500/20 border-fuchsia-400/40 text-fuchsia-200",
      orb1: "rgba(236, 72, 153, 0.30)",
      orb2: "rgba(139, 92, 246, 0.28)",
      orb3: "rgba(6, 182, 212, 0.20)",
    };
  }
  return {
    greeting: "Hello, Good Night",
    subtext: "Dive into late-night colorful vibes",
    gradient: "from-violet-200 via-fuchsia-400 to-cyan-400",
    badge: "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border-violet-400/40 text-violet-200",
    orb1: "rgba(168, 85, 247, 0.30)",
    orb2: "rgba(14, 165, 233, 0.25)",
    orb3: "rgba(236, 72, 153, 0.22)",
  };
};

// --- SECTION COLOR ACCENTS ---
const ACCENT_PALETTES = [
  { pill: "from-pink-500 to-rose-500", btn: "text-pink-200 bg-pink-500/15 border-pink-400/30" },
  { pill: "from-cyan-400 to-blue-500", btn: "text-cyan-200 bg-cyan-500/15 border-cyan-400/30" },
  { pill: "from-violet-400 to-fuchsia-500", btn: "text-fuchsia-200 bg-fuchsia-500/15 border-fuchsia-400/30" },
  { pill: "from-amber-400 to-orange-500", btn: "text-amber-200 bg-amber-500/15 border-amber-400/30" },
  { pill: "from-emerald-400 to-teal-500", btn: "text-emerald-200 bg-emerald-500/15 border-emerald-400/30" },
];

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

// --- ULTRA-LIGHTWEIGHT LAZY IMAGE COMPONENT ---
const LazyImage = memo(({ src, alt, className, objectFit = "object-cover" }: any) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#1E1438] via-[#131C38] to-[#0B1024] ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          e.currentTarget.src = "https://a10.gaanacdn.com/gn_img/default/Song/size_m.jpg";
          setLoaded(true);
        }}
        className={`w-full h-full ${objectFit} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
});
LazyImage.displayName = "LazyImage";

// --- GPU-OPTIMIZED PREMIUM CARD COMPONENT (Crystal Clear Artwork - No Black Overlay) ---
const PremiumCard = memo(({ item, onClick, showSubtitle, fullWidth = false }: any) => {
  const title = useMemo(() => decodeEntities(item.track_title || item.name || item.title || "Unknown"), [item]);
  const subtitle = useMemo(() => (showSubtitle ? decodeEntities(getSubtitle(item)) : ""), [item, showSubtitle]);
  const imageUrl = useMemo(() => getImageUrl(item), [item]);
  const isLongTitle = title.length > 15;

  return (
    <div
      onClick={() => onClick(item)}
      className={`${
        fullWidth ? "w-full" : "w-[29.5vw] sm:w-[175px] md:w-[200px]"
      } flex-shrink-0 snap-start cursor-pointer group pb-1 select-none`}
    >
      <div className="relative overflow-hidden rounded-2xl mb-2 p-[1px] bg-gradient-to-br from-white/25 via-fuchsia-500/25 to-cyan-400/25 transition-transform duration-150 active:scale-95">
        <div className="relative overflow-hidden rounded-[15px] bg-[#12162E]">
          <LazyImage
            src={imageUrl}
            alt={title}
            className="w-full aspect-square group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      {/* Smart Marquee: Truncates during scroll (0 lag), scrolls smoothly on touch/hover */}
      <div className="w-full overflow-hidden whitespace-nowrap text-center px-1">
        <span
          className={`inline-block text-[13px] md:text-[14px] font-extrabold text-white/95 tracking-tight truncate max-w-full ${
            isLongTitle ? "group-hover:max-w-none group-active:max-w-none group-hover:animate-ping-pong group-active:animate-ping-pong" : ""
          }`}
        >
          {title}
        </span>
      </div>

      {showSubtitle && subtitle && (
        <div className="w-full px-1 text-center mt-0.5">
          <p className="text-[11px] md:text-[12px] font-medium text-fuchsia-200/65 truncate">{subtitle}</p>
        </div>
      )}
    </div>
  );
});
PremiumCard.displayName = "PremiumCard";

// --- MEMOIZED HORIZONTAL SECTION RAIL ---
const HorizontalSection = memo(({ section, index, onItemClick, onOpenViewAll }: any) => {
  const palette = ACCENT_PALETTES[index % ACCENT_PALETTES.length];

  return (
    <section className="mb-8 section-contain relative z-10">
      <div className="flex items-center justify-between px-4 mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className={`w-1.5 h-5 rounded-full bg-gradient-to-b ${palette.pill}`} />
          <h2 className="text-[19px] md:text-[22px] font-black tracking-tight text-white drop-shadow-sm">
            {section.title}
          </h2>
        </div>
        <button
          onClick={() => onOpenViewAll(section)}
          className={`text-[11px] font-extrabold px-3.5 py-1.5 rounded-full border active:scale-95 transition-transform ${palette.btn}`}
        >
          View All
        </button>
      </div>
      <div className="flex gap-3.5 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 pt-0.5 gpu-scroll">
        {section.data.map((item: any, i: number) => (
          <PremiumCard
            key={item.track_id || item.seokey || i}
            item={item}
            showSubtitle={section.showSubtitle}
            onClick={onItemClick}
          />
        ))}
      </div>
    </section>
  );
});
HorizontalSection.displayName = "HorizontalSection";

// --- COLORFUL SHIMMER SKELETON ---
const SectionSkeleton = memo(({ isShowcase = false }: { isShowcase?: boolean }) => (
  <div className={`w-full relative z-10 ${isShowcase ? "mt-2 mb-8 px-4" : "mb-8"}`}>
    {isShowcase ? (
      <div className="w-[88vw] md:w-[560px] aspect-[720/375] rounded-2xl border border-white/10 skeleton-colorful" />
    ) : (
      <>
        <div className="flex items-center justify-between px-4 mb-3.5">
          <div className="h-[22px] rounded-md w-36 md:w-48 skeleton-colorful" />
          <div className="h-[26px] rounded-full w-16 skeleton-colorful" />
        </div>
        <div className="flex gap-3.5 overflow-hidden px-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-[29.5vw] sm:w-[175px] md:w-[200px] flex-shrink-0">
              <div className="w-full aspect-square rounded-2xl mb-2 border border-white/10 skeleton-colorful" />
              <div className="h-3 rounded w-3/4 mx-auto mt-2 skeleton-colorful" />
              <div className="h-2 rounded w-1/2 mx-auto mt-1.5 skeleton-colorful" />
            </div>
          ))}
        </div>
      </>
    )}
  </div>
));
SectionSkeleton.displayName = "SectionSkeleton";

export default function Home() {
  const { language, setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  const router = useRouter();

  const [isInitializing, setIsInitializing] = useState(true);
  const [isChunkLoading, setIsChunkLoading] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [greetingData, setGreetingData] = useState(getTimeGreeting);

  const nextIndexRef = useRef(0);
  const isLoadingRef = useRef(false);

  const [viewAll, setViewAll] = useState<any | null>(null);
  const [isFetchingViewAll, setIsFetchingViewAll] = useState(false);

  const showcaseRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const viewAllObserverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGreetingData(getTimeGreeting());
  }, []);

  // --- STRICT SCROLL-DRIVEN FETCHER ---
  const fetchNextChunk = useCallback(
    async (chunkSize = 1) => {
      if (nextIndexRef.current >= SECTION_CONFIGS.length || isLoadingRef.current || viewAll) return;

      isLoadingRef.current = true;
      setIsChunkLoading(true);

      try {
        for (let i = 0; i < chunkSize; i++) {
          const idx = nextIndexRef.current;
          if (idx >= SECTION_CONFIGS.length) break;

          const conf = SECTION_CONFIGS[idx];
          const isVercel = conf.key === "showcase" || conf.key === "trending";
          const apiBase = isVercel ? VERCEL_API_BASE : CF_API_BASE;

          let url = `${apiBase}${conf.url.replace("{lang}", language || "hindi")}`;
          if (!conf.noPagination) url += url.includes("?") ? "&limit=0,15" : "?limit=0,15";

          const json = isVercel ? await fetchVercelStrictly(url) : await fetchCF(url);

          if (json) {
            const items = json?.data?.entities || json?.data?.tracks || json?.data || [];

            if (Array.isArray(items) && items.length > 0) {
              setSections((prev) => {
                if (prev.some((s) => s.key === conf.key)) return prev;
                const updated = [...prev, { ...conf, data: items }];
                if (typeof window !== "undefined") {
                  try {
                    sessionStorage.setItem("homeState_sections", JSON.stringify(updated));
                  } catch (e) {}
                }
                return updated;
              });
            }
          }

          nextIndexRef.current += 1;
          if (typeof window !== "undefined") {
            sessionStorage.setItem("homeState_nextIndex", nextIndexRef.current.toString());
          }

          if (nextIndexRef.current >= 1) {
            setIsInitializing(false);
          }
        }
      } catch (e) {
        /* Silent */
      }

      isLoadingRef.current = false;
      setIsChunkLoading(false);
    },
    [language, viewAll]
  );

  // --- INITIAL MOUNT & STATE RESTORATION ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initLoad = async () => {
      const savedLang = sessionStorage.getItem("homeState_lang");

      if (savedLang === language) {
        const savedSections = sessionStorage.getItem("homeState_sections");
        if (savedSections) {
          const parsed = JSON.parse(savedSections);
          if (parsed.length > 0) {
            setSections(parsed);
            nextIndexRef.current = parseInt(sessionStorage.getItem("homeState_nextIndex") || "0", 10);

            const savedViewAll = sessionStorage.getItem("homeState_viewAll");
            if (savedViewAll && savedViewAll !== "null") {
              window.history.replaceState({ home: true }, "");
              window.history.pushState({ viewAllOpen: true }, "", window.location.href);
              setViewAll(JSON.parse(savedViewAll));
              setTimeout(() => window.scrollTo(0, parseInt(sessionStorage.getItem("viewAllScrollY") || "0", 10)), 80);
            } else {
              setTimeout(() => window.scrollTo(0, parseInt(sessionStorage.getItem("homeScrollY") || "0", 10)), 80);
            }
            setIsInitializing(false);
            return;
          }
        }
      }

      sessionStorage.removeItem("homeState_viewAll");
      sessionStorage.removeItem("homeScrollY");
      sessionStorage.removeItem("viewAllScrollY");
      sessionStorage.setItem("homeState_lang", language || "Hindi");
      setSections([]);
      setViewAll(null);
      nextIndexRef.current = 0;
      setIsInitializing(true);

      fetchNextChunk(2);
    };

    initLoad();
  }, [language]);

  // --- HARDWARE BACK BUTTON LOGIC ---
  useEffect(() => {
    const handlePopState = () => {
      if (viewAll) closeViewAll(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [viewAll]);

  // Auto-Sliding Showcase
  useEffect(() => {
    if (viewAll || sections.length === 0 || sections[0]?.key !== "showcase" || !sections[0]?.data) return;
    const interval = setInterval(() => {
      if (document.hidden || !showcaseRef.current) return;
      const el = showcaseRef.current;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: el.clientWidth, behavior: "smooth" });
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [sections.length, viewAll]);

  // Lazy Load REMAINING Sections strictly 1-by-1 on Scroll
  useEffect(() => {
    if (viewAll || isInitializing) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingRef.current && nextIndexRef.current < SECTION_CONFIGS.length) {
          fetchNextChunk(1);
        }
      },
      { rootMargin: "500px" }
    );

    const currentTarget = observerRef.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => observer.disconnect();
  }, [viewAll, isInitializing, fetchNextChunk, sections.length]);

  // Infinite Scroll for "View All"
  useEffect(() => {
    if (!viewAll || viewAll.noPagination || !viewAll.hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingViewAll) {
          setIsFetchingViewAll(true);

          const isVercel = viewAll.key === "showcase" || viewAll.key === "trending";
          const apiBase = isVercel ? VERCEL_API_BASE : CF_API_BASE;
          const url = `${apiBase}${viewAll.endpoint.replace("{lang}", language || "hindi")}&limit=${viewAll.offset},40`;

          const fetchPromise = isVercel ? fetchVercelStrictly(url) : fetchCF(url);

          fetchPromise
            .then((json) => {
              const newItems = json?.data?.entities || json?.data?.tracks || json?.data || [];
              if (Array.isArray(newItems) && newItems.length > 0) {
                setViewAll((prev: any) => {
                  const updated = { ...prev, data: [...prev.data, ...newItems], offset: prev.offset + 40 };
                  try {
                    sessionStorage.setItem("homeState_viewAll", JSON.stringify(updated));
                  } catch (e) {}
                  return updated;
                });
              } else {
                setViewAll((prev: any) => {
                  const updated = { ...prev, hasMore: false };
                  try {
                    sessionStorage.setItem("homeState_viewAll", JSON.stringify(updated));
                  } catch (e) {}
                  return updated;
                });
              }
              setIsFetchingViewAll(false);
            })
            .catch(() => {
              setIsFetchingViewAll(false);
              setViewAll((prev: any) => ({ ...prev, hasMore: false }));
            });
        }
      },
      { rootMargin: "400px" }
    );

    if (viewAllObserverRef.current) observer.observe(viewAllObserverRef.current);
    return () => observer.disconnect();
  }, [viewAll, isFetchingViewAll, language]);

  const handleItemClick = useCallback(
    (item: any) => {
      if (typeof window !== "undefined") {
        if (viewAll) sessionStorage.setItem("viewAllScrollY", window.scrollY.toString());
        else sessionStorage.setItem("homeScrollY", window.scrollY.toString());
      }

      const type = item.entity_type || item.type;
      const isSong = type === "TR" || type === "song" || item.track_id;

      if (isSong) {
        setPlayContext({ type: "Home", name: "Gaana Play" });
        setQueue([item]);
        setCurrentSong(item);
        setIsPlaying(true);
      } else if (type === "PL" || type === "playlist") {
        router.push(`/playlist/${item.seokey}`);
      } else if (type === "AL" || type === "album") {
        router.push(`/album/${item.seokey}`);
      } else if (type === "AR" || type === "artist") {
        router.push(`/artist/${item.seokey}`);
      }
    },
    [viewAll, router, setPlayContext, setQueue, setCurrentSong, setIsPlaying]
  );

  const openViewAll = useCallback((section: any) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("homeScrollY", window.scrollY.toString());
      window.history.pushState({ viewAllOpen: true }, "", window.location.href);
    }
    const vAll = {
      key: section.key,
      title: section.title,
      endpoint: section.url.split("&limit")[0].split("?limit")[0],
      noPagination: section.noPagination,
      showSubtitle: section.showSubtitle,
      data: section.data,
      offset: section.data.length,
      hasMore: true,
    };
    setViewAll(vAll);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("homeState_viewAll", JSON.stringify(vAll));
      } catch (e) {}
    }
    window.scrollTo(0, 0);
  }, []);

  const closeViewAll = useCallback((fromPopState = false) => {
    setViewAll(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("homeState_viewAll");
      sessionStorage.removeItem("viewAllScrollY");

      const savedHomeScroll = sessionStorage.getItem("homeScrollY");
      setTimeout(() => window.scrollTo(0, savedHomeScroll ? parseInt(savedHomeScroll, 10) : 0), 50);

      if (!fromPopState) window.history.back();
    }
  }, []);

  // --- GLOBAL STYLES (Hardware Accelerated & Low-RAM Friendly) ---
  const globalStyles = `
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .gpu-scroll { -webkit-overflow-scrolling: touch; transform: translateZ(0); }
    .section-contain { content-visibility: auto; contain-intrinsic-size: 0 275px; }
    @keyframes ping-pong { 0%, 15% { transform: translateX(0); } 85%, 100% { transform: translateX(calc(-100% + 125px)); } }
    .animate-ping-pong { animation: ping-pong 4.5s ease-in-out infinite alternate; }
    @keyframes pulse-colorful { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.9; } }
    .skeleton-colorful {
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.14), rgba(139, 92, 246, 0.14), rgba(6, 182, 212, 0.14));
      animation: pulse-colorful 1.5s ease-in-out infinite;
    }
  `;

  // --- INITIAL SKELETON (With 30px Top Space) ---
  if (isInitializing) {
    return (
      <div className="relative flex min-h-screen flex-col bg-[#070514] text-white pt-[30px] pb-28 overflow-x-hidden">
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
        <ColorfulBlurBackground orb1={greetingData.orb1} orb2={greetingData.orb2} orb3={greetingData.orb3} />
        <div className="px-4 mb-5 relative z-10">
          <div className="h-5 w-28 rounded-full skeleton-colorful mb-2.5" />
          <div className="h-8 w-64 rounded-lg skeleton-colorful" />
        </div>
        <div className="mx-4 mb-8 rounded-2xl h-[54px] skeleton-colorful relative z-10" />
        <SectionSkeleton isShowcase={true} />
        <SectionSkeleton />
      </div>
    );
  }

  // --- PREMIUM SUPER-COLORFUL "VIEW ALL" WINDOW (No Black Bar Overlay) ---
  if (viewAll) {
    return (
      <main className="relative min-h-screen bg-[#070514] pt-[30px] pb-28 text-white overflow-x-hidden">
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
        <ColorfulBlurBackground orb1={greetingData.orb1} orb2={greetingData.orb2} orb3={greetingData.orb3} />

        {/* Clean Seamless Header (Removed Black Bar Overlay) */}
        <div className="relative z-20 px-4 pt-1 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              onClick={() => closeViewAll(false)}
              className="p-2.5 rounded-2xl bg-gradient-to-br from-fuchsia-500/30 via-purple-500/25 to-cyan-500/30 border border-white/25 text-white active:scale-90 transition-transform flex-shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-400/30 mb-1">
                <Flame size={11} className="text-fuchsia-300 flex-shrink-0" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-fuchsia-200">
                  Collection
                </span>
              </div>
              <h1 className="text-[22px] sm:text-3xl font-black tracking-tight bg-gradient-to-r from-white via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent truncate leading-tight">
                {viewAll.title}
              </h1>
            </div>
          </div>

          {/* Live Item Count Pill */}
          <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-500/25 to-cyan-500/25 border border-white/20 text-[11px] font-extrabold text-cyan-100 flex-shrink-0 ml-2">
            {viewAll.data.length}+ Items
          </div>
        </div>

        {/* Colorful Grid Container */}
        <div className="relative z-10 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-y-6 gap-x-3 px-4 w-full justify-items-center">
          {viewAll.data.map((item: any, i: number) => (
            <PremiumCard
              key={item.track_id || item.seokey || i}
              item={item}
              showSubtitle={viewAll.showSubtitle}
              fullWidth={true}
              onClick={handleItemClick}
            />
          ))}

          {isFetchingViewAll && viewAll.hasMore && (
            <>
              {[...Array(6)].map((_, i) => (
                <div key={`skel-${i}`} className="w-full flex-shrink-0">
                  <div className="w-full aspect-square rounded-2xl mb-2 border border-white/10 skeleton-colorful" />
                  <div className="h-3 rounded w-3/4 mx-auto mt-2 skeleton-colorful" />
                  <div className="h-2 rounded w-1/2 mx-auto mt-1.5 skeleton-colorful" />
                </div>
              ))}
            </>
          )}
        </div>

        {!viewAll.noPagination && (
          <div ref={viewAllObserverRef} className="relative z-10 w-full flex justify-center py-6 mt-2">
            {!viewAll.hasMore && (
              <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-fuchsia-200/60 text-xs font-semibold">
                You&apos;ve explored all tracks in {viewAll.title}
              </span>
            )}
          </div>
        )}
      </main>
    );
  }

  // --- MAIN HOME VIEW (With Exact 30px Top Space) ---
  return (
    <main
      className="relative pt-[30px] pb-28 min-h-screen bg-[#070514] text-white selection:bg-fuchsia-500 selection:text-white overflow-x-hidden"
      style={{ touchAction: "pan-y" }}
    >
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* Super-Colorful Blur Ambient Mesh (Zero Scroll Lag) */}
      <ColorfulBlurBackground orb1={greetingData.orb1} orb2={greetingData.orb2} orb3={greetingData.orb3} />

      {/* Dynamic Time-Based Greeting Header */}
      <header className="relative z-10 px-4 mb-5 flex items-center justify-between">
        <div>
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border mb-2 ${greetingData.badge}`}
          >
            <Sparkles size={11} />
            <span>Premium Vibes</span>
          </div>
          <h1
            className={`text-[26px] sm:text-[32px] font-black tracking-tight bg-gradient-to-r ${greetingData.gradient} bg-clip-text text-transparent leading-tight drop-shadow-sm`}
          >
            {greetingData.greeting}
          </h1>
          <p className="text-[13px] text-fuchsia-100/65 font-medium mt-0.5">{greetingData.subtext}</p>
        </div>
      </header>

      {/* Super-Colorful Neon Glass Search Bar */}
      <div className="relative z-10 mx-4 mb-8 p-[1px] rounded-2xl bg-gradient-to-r from-fuchsia-500/50 via-purple-500/40 to-cyan-400/50 shadow-lg">
        <div
          onClick={() => router.push("/search?action=focus")}
          className="flex items-center bg-[#120E2E]/75 rounded-[15px] h-[52px] px-4 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-500/25 to-cyan-500/25 flex items-center justify-center flex-shrink-0">
            <SearchIcon size={18} className="text-fuchsia-300" />
          </div>
          <span className="text-fuchsia-100/65 ml-3 text-[14px] sm:text-[15px] font-semibold truncate">
            Search songs, artists, moods...
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push("/search?action=mic");
            }}
            className="ml-auto p-2.5 text-white active:scale-90 transition-transform rounded-xl bg-gradient-to-tr from-fuchsia-600 to-cyan-500 shadow-sm flex-shrink-0"
            aria-label="Voice Search"
          >
            <Mic size={16} />
          </button>
        </div>
      </div>

      {/* Top Picks Showcase Banner */}
      {sections.length > 0 && sections[0].key === "showcase" && (
        <div className="relative z-10 mb-8 mt-1">
          <div
            ref={showcaseRef}
            className="flex gap-3.5 overflow-x-auto hide-scrollbar px-4 snap-x pb-2 items-center gpu-scroll"
          >
            {sections[0].data.map((item: any, i: number) => (
              <div
                key={item.track_id || item.seokey || i}
                onClick={() => handleItemClick(item)}
                className="w-[88vw] md:w-[560px] flex-shrink-0 snap-center cursor-pointer rounded-2xl p-[1.5px] bg-gradient-to-r from-fuchsia-500/60 via-purple-500/40 to-cyan-400/60 active:scale-[0.98] transition-transform duration-200"
              >
                <div className="rounded-[14.5px] overflow-hidden bg-[#12162E]">
                  <LazyImage
                    src={getShowcaseImageUrl(item)}
                    alt="Showcase"
                    objectFit="object-cover"
                    className="w-full aspect-[720/375]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Horizontal Content Rails */}
      {sections.map((section, idx) => {
        if (section.key === "showcase" || !section.data || section.data.length === 0) return null;
        return (
          <HorizontalSection
            key={section.key}
            index={idx}
            section={section}
            onItemClick={handleItemClick}
            onOpenViewAll={openViewAll}
          />
        );
      })}

      {/* Scroll-Driven Lazy Loading Anchor & Skeleton Buffer */}
      {nextIndexRef.current < SECTION_CONFIGS.length && (
        <>
          <div ref={observerRef} className="w-full h-2" />
          {isChunkLoading && <SectionSkeleton />}
        </>
      )}
    </main>
  );
}
