/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo, useSyncExternalStore, useLayoutEffect } from "react";
import Link from "next/link";
import { useAppContext } from "../context/AppContext";
import {
  Loader2, Menu, Timer, Disc3, Calendar, Clock, Hash, Globe, Settings2, Check, Share2, Download, Video, X, Server, Sparkles,
  Users, LogOut, Copy, Radio, MessageCircle, Send, MessageCircleOff, Shield, Crown, AlertTriangle, UserMinus, Tag,
  Type, Gauge, Film, Trash2, Pause, Play, RotateCcw, ArrowUp
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

// --- 30-MINUTE CACHE ENGINE (in-memory L1 + IndexedDB L2, single shared connection) ---
const DB_NAME = "GrooveCacheDB";
const STORE_NAME = "caches";
const CACHE_EXPIRY_MS = 30 * 60 * 1000;
const memCache = new Map<string, { data: any; timestamp: number }>();
let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) return reject();
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject();
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
};

const getCache = async (key: string): Promise<any> => {
  const m = memCache.get(key);
  if (m && Date.now() - m.timestamp < CACHE_EXPIRY_MS) return m.data;
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const res = req.result;
        if (res && Date.now() - res.timestamp < CACHE_EXPIRY_MS) {
          if (!res.isAudio) memCache.set(key, { data: res.data, timestamp: res.timestamp });
          resolve(res.data);
        } else resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  } catch(e) { return null; }
};

const setCache = async (key: string, data: any, isAudio = false): Promise<void> => {
  if (!isAudio) {
    memCache.set(key, { data, timestamp: Date.now() });
    if (memCache.size > 300) { const k = memCache.keys().next().value; if (k) memCache.delete(k); }
  }
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
      tx.onerror = () => resolve();
    });
  } catch(e) {}
};

// --- FLAWLESS LYRICS TRANSLITERATION ENGINE ---
const transliterateLyrics = async (originalLyrics: any[], lang: 'hi' | 'en' | 'original') => {
    if (!originalLyrics || !originalLyrics.length || lang === 'original') return originalLyrics;

    const wordMap = new Map<string, string>();
    const tokenRegex = /[\p{L}\p{M}]+(?:['-][\p{L}\p{M}]+)*/gu;

    originalLyrics.forEach(line => {
        if (!line.words) return;
        const matches = line.words.match(tokenRegex);
        if (matches) {
            matches.forEach((word: string) => {
                if (!wordMap.has(word)) wordMap.set(word, word);
            });
        }
    });

    const uniqueWords = Array.from(wordMap.keys());
    const englishWords = uniqueWords.filter(w => /^[a-zA-Z'-]+$/.test(w));
    const nonEnglishWords = uniqueWords.filter(w => /[^\x00-\x7F]/.test(w));

    const processInBatches = async (items: string[], processor: (batch: string[]) => Promise<void>) => {
        const chunkSize = 15;
        for (let i = 0; i < items.length; i += chunkSize) {
            await processor(items.slice(i, i + chunkSize));
        }
    };

    if (lang === 'hi') {
        if (englishWords.length > 0) {
            await processInBatches(englishWords, async (batch) => {
                const promises = batch.map(async (word) => {
                    try {
                        const queryText = encodeURIComponent(" " + word);
                        const res = await fetch(`https://inputtools.google.com/request?text=${queryText}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`);
                        const data = await res.json();
                        if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
                            wordMap.set(word, data[1][0][1][0].trim());
                        }
                    } catch(e) {}
                });
                await Promise.all(promises);
            });
        }
        if (nonEnglishWords.length > 0) {
            const needsIndicToDevanagari = nonEnglishWords.filter(w => !/^[\u0900-\u097F\p{M}'-]+$/u.test(w));
            if (needsIndicToDevanagari.length > 0) {
                const query = needsIndicToDevanagari.join('\n');
                try {
                    const res = await fetch(`https://aksharamukha-plugin.appspot.com/api/public?target=Devanagari&text=${encodeURIComponent(query)}`);
                    if (res.ok) {
                        const translated = (await res.text()).split('\n');
                        needsIndicToDevanagari.forEach((word, idx) => {
                            if (translated[idx]) wordMap.set(word, translated[idx].trim());
                        });
                    }
                } catch(e) {}
            }
        }
    } else if (lang === 'en') {
        if (nonEnglishWords.length > 0) {
            const query = nonEnglishWords.join('\n');
            try {
                const res = await fetch(`https://aksharamukha-plugin.appspot.com/api/public?target=ISO&text=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const translated = (await res.text()).split('\n');
                    nonEnglishWords.forEach((word, idx) => {
                        if (translated[idx]) wordMap.set(word, translated[idx].trim());
                    });
                }
            } catch(e) {}
        }
    }

    return originalLyrics.map(line => {
        if (!line.words) return line;
        const newWords = line.words.replace(tokenRegex, (match: string) => {
            return wordMap.get(match) || match;
        });
        return { ...line, words: newWords };
    });
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
  let names: string[] = [];
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

const getThumbUrl = (item: any) => {
  const u = getImageUrl(item);
  return typeof u === "string" ? u.replace(/size_l/g, "size_m").replace("500x500", "150x150") : u;
};

const getArtistImage = (artist: any): string => {
  const raw = getImageUrl(artist);
  return typeof raw === "string" && raw.length > 0 && !raw.includes("via.placeholder.com") ? raw : "";
};

const getArtistHue = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

const formatTime = (time: number) => {
  if (!time || isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const formatLongTime = (secs: number) => {
  if (!secs || isNaN(secs) || secs <= 0) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} min`;
  return `${Math.floor(secs)}s`;
};

const findActiveIdx = (lines: any[], t: number) => {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (lines[m].time <= t) { ans = m; lo = m + 1; } else hi = m - 1;
  }
  return ans;
};

// ===================== COLOR DICTIONARY ENGINE =====================
// Every extracted artwork colour is snapped to the nearest named dictionary colour.
// Lyrics keep their own hand-tuned hue shifts (past / playing / upcoming).
// "Song DNA" and "About this track" now stay in the SAME colour family as the artwork (small analogous shifts only).
type Palette = {
  name: string; hue: number; sat: number; base: string; deep: string; accent: string; light: string; glow: string;
  active: string; upcoming: string; past: string;
  cards: { lyrics: [string, string]; dna: [string, string]; album: [string, string]; about: [string, string]; queue: [string, string]; stats: [string, string] };
};
type DictEntry = { n: string; h: number; s: number; l: number; u: number; c: number };
const E = (n: string, h: number, s: number, l: number, u: number, c: number): DictEntry => ({ n, h, s, l, u, c });

const COLOR_DICTIONARY: DictEntry[] = [
  E("Crimson", 350, .70, .28, -28, 24), E("Ruby", 358, .74, .29, 32, 28), E("Scarlet", 6, .78, .30, 34, 26),
  E("Vermilion", 14, .80, .30, -30, 30), E("Burnt Orange", 22, .76, .29, 40, 28), E("Tangerine", 30, .82, .31, -34, 30),
  E("Amber", 38, .80, .30, 36, 32), E("Honey", 45, .72, .30, -32, 28), E("Gold", 50, .70, .29, 40, 30),
  E("Lemon", 58, .62, .28, -40, 32), E("Olive", 72, .48, .24, 50, 34), E("Lime", 88, .55, .26, -44, 30),
  E("Fern", 105, .45, .24, 48, 34), E("Forest", 125, .46, .22, -40, 30), E("Emerald", 146, .58, .25, 44, 30),
  E("Jade", 158, .60, .25, -38, 28), E("Mint", 168, .52, .27, 40, 30), E("Teal", 178, .62, .25, -36, 28),
  E("Turquoise", 186, .66, .28, 40, 30), E("Cyan", 194, .70, .29, -38, 28), E("Sky", 204, .70, .30, 42, 30),
  E("Azure", 212, .72, .31, -40, 28), E("Ocean", 220, .66, .28, 40, 30), E("Royal Blue", 228, .68, .31, -42, 30),
  E("Cobalt", 236, .64, .32, 44, 30), E("Indigo", 246, .56, .32, -40, 30), E("Iris", 256, .58, .34, 42, 28),
  E("Violet", 268, .56, .34, -42, 28), E("Amethyst", 278, .52, .33, 44, 30), E("Orchid", 290, .48, .34, -42, 30),
  E("Plum", 302, .44, .30, 40, 30), E("Magenta", 314, .62, .31, -38, 28), E("Fuchsia", 324, .68, .32, 40, 28),
  E("Hot Pink", 334, .70, .33, -40, 28), E("Rose", 342, .66, .31, 38, 26),
];
const NEUTRAL_DICTIONARY = {
  noir: E("Noir", 230, .05, .11, 0, 0),
  graphite: E("Graphite", 220, .05, .25, 0, 0),
  slate: E("Slate", 215, .14, .26, 0, 0),
  ash: E("Warm Ash", 28, .10, .26, 0, 0),
  silver: E("Silver", 210, .05, .34, 0, 0),
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const H360 = (h: number) => ((h % 360) + 360) % 360;
const hs = (h: number, s: number, l: number, a?: number) =>
  a === undefined
    ? `hsl(${Math.round(H360(h))}, ${Math.round(clamp(s, 0, 1) * 100)}%, ${Math.round(clamp(l, 0, 1) * 100)}%)`
    : `hsla(${Math.round(H360(h))}, ${Math.round(clamp(s, 0, 1) * 100)}%, ${Math.round(clamp(l, 0, 1) * 100)}%, ${a})`;

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
};

const nearestEntry = (hue: number): DictEntry => {
  let best = COLOR_DICTIONARY[0], bd = 999;
  for (const e of COLOR_DICTIONARY) {
    const d = Math.abs(((hue - e.h + 540) % 360) - 180);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
};

const buildPalette = (hue: number, s: number, l: number, neutral: boolean): Palette => {
  let e: DictEntry;
  if (neutral) {
    const N = NEUTRAL_DICTIONARY;
    e = l < 0.2 ? N.noir : l > 0.62 ? N.silver : (hue >= 180 && hue <= 270) ? N.slate : (hue < 70 || hue > 330) ? N.ash : N.graphite;
  } else e = nearestEntry(hue);
  const sat = neutral ? e.s : clamp(e.s * 0.6 + s * 0.4, 0.3, 0.8);
  const baseL = neutral ? clamp(e.l * 0.6 + l * 0.4, 0.1, 0.4) : clamp(e.l * 0.7 + l * 0.3, 0.2, 0.36);
  const h = e.h, sh = neutral ? 0 : e.c, up = neutral ? 0 : e.u;
  return {
    name: e.n, hue: h, sat,
    base: hs(h, sat, baseL),
    deep: hs(h, sat * 0.9, baseL * 0.5),
    accent: hs(h, neutral ? sat : Math.min(0.85, sat + 0.15), 0.66),
    light: hs(h, neutral ? 0.05 : sat * 0.75, 0.9),
    glow: hs(h, sat, 0.5, 0.45),
    active: hs(h, neutral ? 0.04 : 0.55, 0.97),
    past: hs(h, neutral ? 0.04 : 0.35, 0.9, 0.36),
    upcoming: hs(h + up, neutral ? 0.05 : 0.85, 0.77, 0.9),
    cards: {
      lyrics: [hs(h, sat, baseL), hs(h, sat * 0.9, baseL * 0.5)],
      // Song DNA + About: same colour family as the artwork (tiny analogous drift only → rich but harmonious)
      dna: [hs(h + 6, sat * 0.95, 0.30), hs(h + 14, sat * 0.85, 0.14)],
      album: [hs(h - sh, sat, 0.30), hs(h - sh, sat * 0.8, 0.15)],
      about: [hs(h - 6, sat, 0.27), hs(h - 14, sat * 0.85, 0.12)],
      queue: [hs(h, sat, 0.24), hs(h + sh * 0.5, sat * 0.8, 0.08)],
      stats: [hs(h - sh * 2, sat, 0.36), hs(h - sh * 2, sat * 0.8, 0.2)],
    },
  };
};

const DEFAULT_PALETTE: Palette = buildPalette(0, 0, 0.325, true);
const DARK_FALLBACK_PALETTE: Palette = buildPalette(0, 0, 0.12, true);

const extractPalette = (data: Uint8ClampedArray): Palette | null => {
  const HUES = 24;
  const buckets = Array.from({ length: HUES + 1 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [h, s, l] = rgbToHsl(r, g, b);
    if (l < 0.07 || l > 0.95) continue;
    const vivid = s * (1 - Math.abs(l - 0.5) * 1.4);
    const w = 0.05 + vivid * vivid * 3;
    const idx = s < 0.14 ? HUES : Math.floor(h * HUES) % HUES;
    const bk = buckets[idx];
    bk.w += w; bk.r += r * w; bk.g += g * w; bk.b += b * w;
    total += w;
  }
  if (total === 0) return null;
  let best = 0;
  for (let i = 1; i <= HUES; i++) if (buckets[i].w > buckets[best].w) best = i;
  const bk = buckets[best];
  if (bk.w === 0) return null;
  const [h, s, l] = rgbToHsl(bk.r / bk.w, bk.g / bk.w, bk.b / bk.w);
  return buildPalette(h * 360, s, l, best === HUES);
};

const RAPID_KEYS = ["d1edce158amshec139440d20658ap1f2545jsnbb7da9add82f", "6cf7f03014msh787c51a713c0264p15c20djsna1f9a9f6a378", "13d48f6bb8msh459c11b91bdcc44p110f4ejsn099443894115", "03fc23317fmsh0535ef9ec8c6f5bp1db59bjsn545991df9343", "e54e3fbc4dmshfc16d4417b618fdp1a2fafjsn30c72d8cf3ab"];
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
      const rTitle = clean(track.name); const rArtists = (track.artists?.items || track.artists || []).map((a: any) => clean(a.profile?.name || a.name));
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

let hlsPromise: Promise<any> | null = null;
const loadHlsJS = (): Promise<any> => {
  if (typeof window !== 'undefined' && (window as any).Hls) return Promise.resolve((window as any).Hls);
  if (hlsPromise) return hlsPromise;
  hlsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
    script.onload = () => resolve((window as any).Hls);
    script.onerror = (e) => { hlsPromise = null; reject(e); };
    document.head.appendChild(script);
  });
  return hlsPromise;
};

const loadAblyJS = (): Promise<any> => new Promise((resolve, reject) => {
    if ((window as any).Ably) return resolve((window as any).Ably);
    const script = document.createElement('script');
    script.src = "https://cdn.ably.com/lib/ably.min-1.js";
    script.onload = () => resolve((window as any).Ably);
    script.onerror = reject;
    document.head.appendChild(script);
});

// ===================== LYRICS ENGINE =====================
// Design goals: zero React work on line changes (isolated store), zero layout/paint work at line start (next line is
// pre-built), no animation "jumps" (drift is corrected by gently changing playback rate), exact timing (no lead).
const LYRIC_LEAD = 0; // seconds — 0 = lines/words land exactly on their timestamps

let lyricIdx = -1;
const lyricSubs = new Set<() => void>();
const getLyricIdx = () => lyricIdx;
const setLyricIdx = (n: number) => { if (n === lyricIdx) return; lyricIdx = n; lyricSubs.forEach(f => f()); };
const subLyric = (f: () => void) => { lyricSubs.add(f); return () => { lyricSubs.delete(f); }; };
const useLyricIdx = () => useSyncExternalStore(subLyric, getLyricIdx, () => -1);
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const canAnimate = () => typeof Element !== 'undefined' && typeof (Element.prototype as any).animate === 'function';

// How long a line is actually SUNG (not the whole gap to the next line, which includes instrumental pauses)
const computePace = (lines: any[]) => {
  const r: number[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const gap = lines[i + 1].time - lines[i].time;
    const ch = (lines[i].words || '').length;
    if (ch > 5 && gap > 0.4 && gap < 6) r.push(gap / ch);
  }
  if (r.length < 4) return 0.075;
  r.sort((a, b) => a - b);
  return Math.min(0.14, Math.max(0.045, r[Math.floor(r.length * 0.5)]));
};
const lineSpanSec = (lines: any[], i: number, pace: number) => {
  const t = lines[i].time;
  const gap = (lines[i + 1]?.time ?? t + 5) - t;
  const est = Math.max(0.8, (lines[i].words || '').length * pace);
  return Math.max(0.35, Math.min(gap * 0.97, est));
};

// ---- soft-edge word highlight, built per visual ROW (2 composited layers per row instead of 2 per word) ----
// A row = clipped band + a feathered mask. The bright copy of the row text slides opposite to its wrapper so it stays
// put while the soft edge travels across it. One piece-wise linear animation follows the real word boundaries.
type FxRow = { wrap: HTMLElement; inn: HTMLElement; T: number[]; offs: number[]; before: number; weight: number };
type FxLine = { el: HTMLElement; host: HTMLElement; rows: FxRow[]; total: number; sig: string };

const fxSig = (el: HTMLElement) => `${el.clientWidth}|${getComputedStyle(el).fontSize}|${(el.firstChild as Text | null)?.data ?? ''}`;

const buildFx = (el: HTMLElement, sig: string): FxLine | null => {
  const host = el.querySelector(':scope > .lw-fx') as HTMLElement | null;
  const tn = el.firstChild as Text | null;
  if (!host || !tn || tn.nodeType !== 3 || !el.isConnected) return null;
  const cs = getComputedStyle(el);
  const fs = parseFloat(cs.fontSize) || 16;
  const pl = parseFloat(cs.paddingLeft) || 0, prr = parseFloat(cs.paddingRight) || 0;
  const Wc = el.clientWidth - pl - prr;
  if (Wc <= 0) return null;
  const text = tn.data;
  const re = /\S+/g;
  const ws: { s: number; e: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) ws.push({ s: m.index, e: m.index + m[0].length });
  if (!ws.length) return null;

  const box = el.getBoundingClientRect();
  const sx = el.offsetWidth ? box.width / el.offsetWidth : 1;   // undo any CSS scale on the line (mini lyrics use scale .9)
  const sy = el.offsetHeight ? box.height / el.offsetHeight : 1;
  if (!sx || !sy) return null;
  const range = document.createRange();
  const items = ws.map(w => {
    range.setStart(tn, w.s); range.setEnd(tn, w.e);
    const r = range.getBoundingClientRect();
    return { l: (r.left - box.left) / sx, r: (r.right - box.left) / sx, t: (r.top - box.top) / sy, b: (r.bottom - box.top) / sy, c: (w.e - w.s) + 0.6 };
  });

  const rowsRaw: { it: typeof items; t: number; b: number }[] = [];
  for (const w of items) {
    const last = rowsRaw[rowsRaw.length - 1];
    if (last && Math.abs(w.t - last.it[0].t) < (w.b - w.t) * 0.5) { last.it.push(w); last.b = Math.max(last.b, w.b); }
    else rowsRaw.push({ it: [w], t: w.t, b: w.b });
  }

  const F = fs * 0.75, P = fs * 0.4, Pv = fs * 0.4, Wbox = pl + Wc;
  host.textContent = ''; host.style.opacity = '1';
  const rows: FxRow[] = [];
  let before = 0;
  rowsRaw.forEach((r, ri) => {
    const x0 = r.it[0].l, x1 = r.it[r.it.length - 1].r, span = Math.max(1, x1 - x0);
    const weight = r.it.reduce((a, x) => a + x.c, 0);
    const T: number[] = [], offs: number[] = [];
    let cw = 0;
    r.it.forEach(w => { // edge position at the START of each word: from (x0 − F) hidden … to x1 fully lit
      const u = (w.l - x0) / span;
      T.push(x0 - F + u * (span + F) - Wbox);
      offs.push(cw / weight);
      cw += w.c;
    });
    T.push(x1 - Wbox); offs.push(1);
    const top = ri === 0 ? r.t - Pv : (rowsRaw[ri - 1].b + r.t) / 2;
    const bot = ri === rowsRaw.length - 1 ? r.b + Pv : (r.b + rowsRaw[ri + 1].t) / 2;

    const wrap = document.createElement('div');
    wrap.className = 'lw-row';
    wrap.style.cssText = `left:${-P}px;top:${top}px;width:${Wbox + P + F}px;height:${bot - top}px;--f:${F}px;transform:translate3d(${T[0]}px,0,0)`;
    const inn = document.createElement('div');
    inn.className = 'lw-row-in';
    inn.style.cssText = `left:${P + pl}px;top:${-top}px;width:${Wc}px;transform:translate3d(${-T[0]}px,0,0)`;
    inn.textContent = text;
    wrap.appendChild(inn); host.appendChild(wrap);
    rows.push({ wrap, inn, T, offs, before, weight });
    before += weight;
  });
  return { el, host, rows, total: before, sig };
};

const startFx = (line: FxLine, spanMs: number): Animation[] => {
  const out: Animation[] = [];
  line.rows.forEach(r => {
    const delay = (r.before / line.total) * spanMs;
    const dur = Math.max(60, (r.weight / line.total) * spanMs);
    // endDelay keeps the animation "alive" so play()/pause()/rate changes never restart a finished one
    const timing: KeyframeAnimationOptions = { duration: dur, delay, fill: 'both', easing: 'linear', endDelay: 60000 };
    out.push(r.wrap.animate(r.T.map((t, i) => ({ offset: r.offs[i], transform: `translate3d(${t}px,0,0)` })), timing));
    out.push(r.inn.animate(r.T.map((t, i) => ({ offset: r.offs[i], transform: `translate3d(${-t}px,0,0)` })), timing));
  });
  return out;
};

const finishFx = (line: FxLine) => { // sung line: freeze fully lit, then fade softly into the dim "past" colour
  line.rows.forEach(r => {
    const t = r.T[r.T.length - 1];
    r.wrap.style.transform = `translate3d(${t}px,0,0)`;
    r.inn.style.transform = `translate3d(${-t}px,0,0)`;
  });
  line.host.style.opacity = '0';
  setTimeout(() => { if (line.host.style.opacity === '0') line.host.textContent = ''; }, 750);
};

type FxOpts = { rootRef: React.RefObject<HTMLElement | null>; lines: any[]; enabled: boolean; isPlaying: boolean; buffering: boolean; audioRef: React.RefObject<HTMLAudioElement | null>; depKey: string };

// true while the element is (nearly) on screen → card AND mini lyrics can animate at the same time, off-screen ones cost nothing
const useInView = (ref: React.RefObject<HTMLElement | null>, margin = '160px') => {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setV(true); return; }
    const io = new IntersectionObserver(es => { setV(es[es.length - 1].isIntersecting); }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return v;
};

const FX_LATENCY_MS = 16; // one display frame between "audio clock" and "pixels on screen"
const useLyricFx = (o: FxOpts) => {
  const idx = useLyricIdx();
  const S = useRef<{ built: Map<number, FxLine>; active: number | null; key: string; lines: any[] | null }>({ built: new Map(), active: null, key: '', lines: null });
  const [tick, setTick] = useState(0);
  const pace = useMemo(() => computePace(o.lines), [o.lines]);

  useEffect(() => { // rebuild geometry after resize / rotation
    let t: any;
    const on = () => { clearTimeout(t); t = setTimeout(() => { S.current.built.forEach(l => { l.host.textContent = ''; }); S.current.built.clear(); setTick(x => x + 1); }, 220); };
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('resize', on); clearTimeout(t); };
  }, []);

  useIsoLayoutEffect(() => {
    const st = S.current, root = o.rootRef.current, lines = o.lines;
    const clearAll = () => { st.built.forEach(l => { l.host.textContent = ''; l.host.style.opacity = '1'; }); st.built.clear(); st.active = null; };
    if (st.key !== o.depKey || st.lines !== lines) { clearAll(); st.key = o.depKey; st.lines = lines; }
    if (!o.enabled || !root || idx < 0 || !lines[idx] || !canAnimate()) { clearAll(); return; }

    // sung line: fade it out softly (only for natural progression; after a seek clear instantly)
    if (st.active !== null && st.active !== idx) {
      const pl = st.built.get(st.active);
      if (pl) { if (st.active === idx - 1) finishFx(pl); else pl.host.textContent = ''; }
      st.built.delete(st.active);
    }
    st.built.forEach((l, k) => { if (k < idx || k > idx + 2) { l.host.textContent = ''; st.built.delete(k); } });
    st.active = idx;

    const getEl = (i: number) => root.querySelector(`[data-li="${i}"]`) as HTMLElement | null;
    const ensure = (i: number) => {
      const el = getEl(i); if (!el) return null;
      let l = st.built.get(i);
      if (l && l.el === el && el.isConnected && l.host.firstChild) return l; // hot path: no layout reads at all
      if (l) l.host.textContent = '';
      l = buildFx(el, '') || undefined;
      if (l) st.built.set(i, l); else st.built.delete(i);
      return l || null;
    };

    const cur = ensure(idx);
    const a = o.audioRef.current;
    if (!cur || !a) return;
    cur.host.style.opacity = '1';
    const lt = lines[idx].time;
    const spanMs = lineSpanSec(lines, idx, pace) * 1000;
    const anims = startFx(cur, spanMs);
    const fast = spanMs < 2500; // rap / fast lines: tighter control loop, stronger correction, small snaps are invisible
    const hardThr = Math.min(400, Math.max(90, spanMs * 0.12));
    const every = fast ? 100 : 250;
    const gain = Math.max(700, spanMs * 0.9);
    const maxRate = fast ? 0.15 : 0.07;
    const target = () => Math.max(0, (a.currentTime + LYRIC_LEAD - lt) * 1000 + FX_LATENCY_MS);
    const setRate = (r: number) => anims.forEach(an => { try { if ((an as any).updatePlaybackRate) (an as any).updatePlaybackRate(r); else an.playbackRate = r; } catch (e) {} });
    let errF = 0;
    const hard = () => { const t = target(); anims.forEach(an => { an.currentTime = t; }); setRate(1); errF = 0; };

    anims.forEach(an => an.pause());
    hard();
    let id: any = null;
    if (o.isPlaying && !o.buffering) {
      anims.forEach(an => an.play());
      id = setInterval(() => {
        const err = target() - Number(anims[0]?.currentTime);
        if (Math.abs(err) > hardThr) { hard(); return; }
        errF = errF * 0.5 + err * 0.5;
        setRate(Math.abs(errF) < 20 ? 1 : 1 + Math.max(-maxRate, Math.min(maxRate, errF / gain)));
      }, every);
    }
    const onResync = () => hard();
    window.addEventListener('lyricfx-resync', onResync);

    // pre-build the next TWO lines while the browser is idle → activating a line never touches layout
    const w = window as any;
    let idleId: any = null, tId: any = null;
    const warm = () => { ensure(idx + 1); ensure(idx + 2); };
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(warm, { timeout: 150 }); else tId = setTimeout(warm, 60);

    return () => {
      clearInterval(id); clearTimeout(tId);
      if (idleId != null && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      window.removeEventListener('lyricfx-resync', onResync);
      anims.forEach(an => an.cancel());
    };
  }, [idx, tick, o.enabled, o.isPlaying, o.buffering, o.lines, o.depKey, pace]);
};

// ---- fast, user-friendly auto scroll (Spotify-style ease-out; yields to the user's finger) ----
const useLyricScroll = (ref: React.RefObject<HTMLElement | null>, idx: number, active: boolean, mode: 'top' | 'center') => {
  const st = useRef({ raf: 0, user: 0, first: true });
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const stop = () => { st.current.user = performance.now(); cancelAnimationFrame(st.current.raf); };
    c.addEventListener('wheel', stop, { passive: true });
    c.addEventListener('touchmove', stop, { passive: true });
    return () => { c.removeEventListener('wheel', stop); c.removeEventListener('touchmove', stop); cancelAnimationFrame(st.current.raf); };
  }, [ref]);
  useEffect(() => {
    const c = ref.current;
    if (!c || !active || idx < 0) { st.current.first = true; return; } // next time it becomes visible: jump straight to the line
    if (performance.now() - st.current.user < 2800) return;
    const el = c.querySelector(`[data-li="${idx}"]`) as HTMLElement | null;
    if (!el) return;
    const base = el.offsetParent === c ? 0 : c.offsetTop;
    let to = el.offsetTop - base - (mode === 'top' ? 20 : c.clientHeight / 2 - 60);
    to = Math.max(0, Math.min(to, c.scrollHeight - c.clientHeight));
    const from = c.scrollTop, dist = to - from;
    cancelAnimationFrame(st.current.raf);
    if (st.current.first || Math.abs(dist) < 1.5) { c.scrollTop = to; st.current.first = false; return; }
    const dur = Math.min(440, Math.max(260, 200 + Math.abs(dist) * 0.45));
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      c.scrollTop = from + dist * (1 - Math.pow(1 - p, 4)); // ease-out quart: fast start, soft landing
      if (p < 1) st.current.raf = requestAnimationFrame(step);
    };
    st.current.raf = requestAnimationFrame(step);
  }, [idx, active, mode, ref]);
};

// ---- memoised rows / lists ----
const lyricVars = (on: string, off: string, glow: string) => ({ ['--lw-on' as any]: on, ['--lw-off' as any]: off, ['--lw-glow' as any]: glow } as React.CSSProperties);

type LyricLineProps = { idx: number; text: string; time: number; state: 0 | 1 | 2; sync: boolean; fz: string; seekable: boolean; onSeek: (t: number) => void; cActive: string; cPast: string; cUp: string; cGlow: string };
const LyricLine = React.memo((p: LyricLineProps) => {
  const isActive = p.state === 1;
  const fx = isActive && p.sync && canAnimate();
  const cls = p.state === 0 ? '-translate-y-2' : p.state === 2 ? 'translate-y-3' : '';
  const vars = lyricVars(p.cActive, p.cPast, p.cGlow);
  const style: React.CSSProperties = isActive
    ? { ...vars, color: fx ? p.cPast : p.cActive, opacity: 1, textShadow: fx ? undefined : `0 0 28px ${p.cGlow}, 0 2px 18px rgba(0,0,0,0.35)` }
    : p.state === 0
      ? { ...vars, color: p.cPast, opacity: 1 }
      : { ...vars, color: p.cUp, opacity: 0.85, textShadow: '0 1px 10px rgba(0,0,0,0.25)' };
  return (
    <p data-li={p.idx} onClick={() => { if (p.seekable) p.onSeek(p.time); }} className={`relative cursor-pointer transition-[transform,opacity,color] duration-[600ms] ease-out origin-left no-select-text transform font-extrabold leading-tight ${p.fz} ${cls}`} style={style}>
      {p.text || "♪"}<span className="lw-fx" aria-hidden="true" />
    </p>
  );
});
LyricLine.displayName = 'LyricLine';

type LyricListProps = {
  lines: any[]; className: string; header?: React.ReactNode; containerRef: React.RefObject<HTMLDivElement | null>; mode: 'top' | 'center';
  scrollActive: boolean; fxOn: boolean; fz: string; sync: boolean; seekable: boolean; onSeek: (t: number) => void;
  cActive: string; cPast: string; cUp: string; cGlow: string; isPlaying: boolean; buffering: boolean; audioRef: React.RefObject<HTMLAudioElement | null>;
};
const LyricList = React.memo((p: LyricListProps) => {
  const idx = useLyricIdx();
  const inView = useInView(p.containerRef);
  useLyricFx({ rootRef: p.containerRef, lines: p.lines, enabled: p.fxOn && p.sync && inView, isPlaying: p.isPlaying, buffering: p.buffering, audioRef: p.audioRef, depKey: p.fz });
  useLyricScroll(p.containerRef, idx, p.scrollActive && inView, p.mode);
  return (
    <div ref={p.containerRef} className={p.className}>
      {p.header}
      {p.lines.map((line: any, i: number) => (
        <LyricLine key={i} idx={i} text={line.words} time={line.time} state={i === idx ? 1 : i < idx ? 0 : 2} sync={p.sync} fz={p.fz}
          seekable={p.seekable} onSeek={p.onSeek} cActive={p.cActive} cPast={p.cPast} cUp={p.cUp} cGlow={p.cGlow} />
      ))}
    </div>
  );
});
LyricList.displayName = 'LyricList';

type MiniLyricsProps = { lines: any[]; fz: string; sync: boolean; fxOn: boolean; cActive: string; cPast: string; cGlow: string; isPlaying: boolean; buffering: boolean; audioRef: React.RefObject<HTMLAudioElement | null> };
const MiniLyrics = React.memo((p: MiniLyricsProps) => {
  const idx = useLyricIdx();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  useLyricFx({ rootRef, lines: p.lines, enabled: p.fxOn && p.sync && inView, isPlaying: p.isPlaying, buffering: p.buffering, audioRef: p.audioRef, depKey: p.fz });
  const fxMode = p.sync && canAnimate();
  const vars = lyricVars(p.cActive, p.cPast, p.cGlow);
  return (
    <div ref={rootRef} className="relative w-full h-full flex justify-start items-center">
      {[idx, idx + 1].map(i => {
        const line = p.lines[i];
        if (!line) return null;
        const cur = i === idx;
        return (
          <div key={i} data-li={i} className={`absolute left-0 w-full text-left pr-2 no-select-text font-extrabold leading-snug transition-[transform,opacity] duration-[1100ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${p.fz}`}
            style={{ ...vars, transform: cur ? 'translateY(0px) scale(1)' : 'translateY(35px) scale(0.9)', opacity: cur ? 1 : 0, color: cur && fxMode ? p.cPast : p.cActive, textShadow: '0 2px 14px rgba(0,0,0,0.38)', zIndex: cur ? 10 : 1, transformOrigin: 'left center' }}>
            {line.words || "♪"}<span className="lw-fx" aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );
});
MiniLyrics.displayName = 'MiniLyrics';

// ===================== AUDIO START-UP HELPERS =====================
const qualityUrl = (base: string, quality: string) => {
  const q = quality === "16" ? "16" : quality === "64" ? "64" : quality === "320" ? "320" : "128";
  return base.replace(/\/(\d+)\.mp4\.master\.m3u8/, `/${q}.mp4.master.m3u8`);
};
const makeHlsConfig = (preload: boolean) => ({
  enableWorker: true, lowLatencyMode: false, startFragPrefetch: true, testBandwidth: false, startLevel: 0,
  abrEwmaDefaultEstimate: 8000000, capLevelToPlayerSize: false,
  maxBufferLength: preload ? 12 : 30, maxMaxBufferLength: preload ? 20 : 60, backBufferLength: preload ? 5 : 20,
  manifestLoadingMaxRetry: 2, levelLoadingMaxRetry: 2, fragLoadingMaxRetry: 3,
  manifestLoadingTimeOut: 8000, levelLoadingTimeOut: 8000, fragLoadingTimeOut: 12000,
  manifestLoadingRetryDelay: 300, levelLoadingRetryDelay: 300, fragLoadingRetryDelay: 300,
});
const warmedOrigins = new Set<string>();
const warmOrigin = (url: string) => { // open DNS + TLS to the CDN before the first request
  try {
    const o = new URL(url).origin;
    if (warmedOrigins.has(o)) return;
    warmedOrigins.add(o);
    const l = document.createElement('link');
    l.rel = 'preconnect'; l.href = o; l.crossOrigin = 'anonymous';
    document.head.appendChild(l);
  } catch (e) {}
};

// ===================== CANVAS VIDEO (loads only when on screen, cached as a blob → seamless loop, zero re-download) =====================
const canvasBlobCache = new Map<string, string>();
const getCanvasSrc = async (url: string, signal: AbortSignal): Promise<string> => {
  const hit = canvasBlobCache.get(url);
  if (hit) { canvasBlobCache.delete(url); canvasBlobCache.set(url, hit); return hit; }
  const r = await fetch(url, { signal, referrerPolicy: 'no-referrer' });
  if (!r.ok) throw new Error('canvas http ' + r.status);
  const obj = URL.createObjectURL(await r.blob());
  canvasBlobCache.set(url, obj);
  while (canvasBlobCache.size > 4) {
    const k = canvasBlobCache.keys().next().value as string;
    const o = canvasBlobCache.get(k); if (o) URL.revokeObjectURL(o);
    canvasBlobCache.delete(k);
  }
  return obj;
};
const CanvasVideo = React.memo(({ url, poster, load, play, onFail }: { url: string; poster: string; load: boolean; play: boolean; onFail: () => void }) => {
  const [src, setSrc] = useState<string | null>(() => canvasBlobCache.get(url) || null);
  const vref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!load) { // app in background / player closed: release network + decoder, keep only the poster
      const v = vref.current;
      if (v && v.getAttribute('src')) { v.removeAttribute('src'); try { v.load(); } catch (e) {} }
      return;
    }
    const hit = canvasBlobCache.get(url);
    if (hit) { setSrc(hit); return; }
    setSrc(null);
    let alive = true; const ac = new AbortController();
    getCanvasSrc(url, ac.signal).then(s2 => { if (alive) setSrc(s2); }).catch(e => { if (alive && e?.name !== 'AbortError') setSrc(url); }); // CORS fallback → stream directly
    return () => { alive = false; ac.abort(); };
  }, [url, load]);
  useEffect(() => {
    const v = vref.current;
    if (!v || !src || !load) return;
    if (!play) { v.pause(); return; }
    const t = setTimeout(() => { v.play().catch(() => {}); }, 40);
    return () => clearTimeout(t);
  }, [play, src, load]);
  return <video ref={vref} src={load && src ? src : undefined} poster={poster || undefined} loop muted playsInline preload="auto" disablePictureInPicture disableRemotePlayback onError={() => { if (load && src) onFail(); }} className="absolute inset-0 w-full h-full object-cover cv-video" />;
});
CanvasVideo.displayName = 'CanvasVideo';

// ===================== DOWNLOAD HELPERS =====================
type DlState = { type: "music" | "video" | null; status: string; options?: any[]; progress?: number; packStep?: string; server?: number; phase?: number; error?: string; quality?: string };

// Up to 3 artist names, separated by ", "
const packArtists = (s: string) => (s || "").split(",").map(x => x.trim()).filter(Boolean).slice(0, 3).join(", ") || "Unknown Artist";
const cleanMeta = (s: string | null | undefined) => (s ? String(s).replace(/[\r\n]+/g, " ").trim() : "");

const concatChunks = (parts: Uint8Array[], total: number) => {
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { if (!p) continue; out.set(p, o); o += p.length; }
  return out;
};

const fetchRetry = async (u: string, opts: RequestInit, tries = 3): Promise<Response> => {
  let err: any;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(u, opts);
      if (r.ok) return r;
      err = new Error(`HTTP ${r.status}`);
      if (r.status >= 400 && r.status < 500 && r.status !== 429) break;
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      err = e;
    }
    await new Promise(res => setTimeout(res, 350 * (i + 1)));
  }
  throw err;
};

// Downloads an HLS playlist (master or media) OR a direct audio file → one Uint8Array. 6 parallel segments with retries.
const fetchAudioBytes = async (url: string, onProgress: (f: number) => void, signal: AbortSignal): Promise<{ data: Uint8Array; ext: string }> => {
  const opts: RequestInit = { signal, referrerPolicy: "no-referrer" };

  if (!/\.m3u8(\?|$)/i.test(url)) {
    const res = await fetchRetry(url, opts);
    const total = Number(res.headers.get('content-length') || 0);
    if (!res.body) { const b = new Uint8Array(await res.arrayBuffer()); onProgress(1); return { data: b, ext: 'bin' }; }
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); loaded += value.length;
      if (total) onProgress(Math.min(1, loaded / total));
    }
    onProgress(1);
    return { data: concatChunks(parts, loaded), ext: 'bin' };
  }

  let current = url;
  let text = '';
  for (let depth = 0; depth < 4; depth++) {
    const res = await fetchRetry(current, opts);
    text = await res.text();
    if (!text.includes('#EXT-X-STREAM-INF')) break;
    const lines = text.split('\n');
    const idx = lines.findIndex(l => l.startsWith('#EXT-X-STREAM-INF'));
    const sub = lines.slice(idx + 1).find(l => l.trim() && !l.startsWith('#'));
    if (!sub) break;
    current = new URL(sub.trim(), current).href;
  }

  const baseSearch = new URL(current).search;
  const segs = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => {
    const u = new URL(l, current);
    if (!l.includes('?')) u.search = baseSearch;
    return u.href;
  });
  if (segs.length === 0) throw new Error("No media segments found in playlist.");

  const results: Uint8Array[] = new Array(segs.length);
  let doneCount = 0, cursor = 0, total = 0;
  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= segs.length) return;
      const r = await fetchRetry(segs[i], opts);
      const buf = new Uint8Array(await r.arrayBuffer());
      results[i] = buf; total += buf.length; doneCount++;
      onProgress(doneCount / segs.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, segs.length) }, worker));
  return { data: concatChunks(results, total), ext: 'ts' };
};

const fetchCover = async (image: string, signal: AbortSignal): Promise<Uint8Array | null> => {
  if (!image || image.includes('via.placeholder.com')) return null;
  try {
    const r = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(image)}&w=800&h=800&fit=cover&output=jpg&q=90`, { signal });
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    return null;
  }
};

const triggerSave = (blob: Blob, name: string) => {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(u), 10000);
};

// ===================== BACKGROUND DOWNLOAD ENGINE (module-level: survives UI changes, queue + pipeline) =====================
// • ONE shared ffmpeg.wasm encoder for the whole session (core files also cached in Cache Storage → no re-download ever)
// • Pipeline: while song N is encoding, song N+1 is already downloading
// • Per-job cancel (even mid-encode), queue reorder, retry, pause, "save again"
type DlStatus = 'queued' | 'downloading' | 'ready' | 'encoding' | 'done' | 'error' | 'canceled';
type DlJob = {
  id: string; trackId: string; title: string; artists: string; album: string; composer: string; year: string; genre: string;
  image: string; url: string; label: string; num: number; duration: number; includeLrc: boolean;
  status: DlStatus; progress: number; step: string; error?: string; addedAt: number; sizeMB?: number;
};
type DlSnap = { jobs: DlJob[]; paused: boolean; lastDoneAt: number };
const isActiveStatus = (s: DlStatus) => s === 'queued' || s === 'downloading' || s === 'ready' || s === 'encoding';

let dlSnap: DlSnap = { jobs: [], paused: false, lastDoneAt: 0 };
const DL_SERVER_SNAP: DlSnap = { jobs: [], paused: false, lastDoneAt: 0 };
const dlListeners = new Set<() => void>();
const dlSubscribe = (fn: () => void) => { dlListeners.add(fn); return () => { dlListeners.delete(fn); }; };
const dlGetSnap = () => dlSnap;
let dlEmitTimer: any = null;
const dlEmit = (immediate = true) => {
  const fire = () => { dlEmitTimer = null; dlListeners.forEach(l => l()); };
  if (immediate) { if (dlEmitTimer) { clearTimeout(dlEmitTimer); dlEmitTimer = null; } fire(); }
  else if (!dlEmitTimer) dlEmitTimer = setTimeout(fire, 140);
};
const dlPatch = (id: string, p: Partial<DlJob>, soft = false) => {
  const cur = dlSnap.jobs.find(j => j.id === id);
  if (!cur) return;
  if (soft && p.progress !== undefined && Math.round(p.progress) === Math.round(cur.progress) && (p.step === undefined || p.step === cur.step)) return;
  dlSnap = { ...dlSnap, jobs: dlSnap.jobs.map(j => (j.id === id ? { ...j, ...p } : j)) };
  dlEmit(!soft);
};
const dlGet = (id: string) => dlSnap.jobs.find(j => j.id === id);
const dlIsCanceled = (id: string) => { const j = dlGet(id); return !j || j.status === 'canceled'; };

const dlStore = {
  audio: new Map<string, { data: Uint8Array; ext: string }>(),
  cover: new Map<string, Uint8Array>(),
  aborts: new Map<string, AbortController>(),
  blobs: new Map<string, { blob: Blob; name: string }>(),
};

// ---- cached encoder ----
const FF_VER = '0.12.6';
const FF_BASE = `https://unpkg.com/@ffmpeg/core@${FF_VER}/dist/umd`;
let ffInst: any = null;
let ffLoading: Promise<any> | null = null;
let ffCoreUrls: { coreURL: string; wasmURL: string } | null = null;
let ffJobsSinceLoad = 0;

const coreBlobUrl = async (file: string, mime: string) => {
  const url = `${FF_BASE}/${file}`;
  let res: Response | undefined;
  try {
    if (typeof caches !== 'undefined') {
      const c = await caches.open(`ffmpeg-core-${FF_VER}`);
      res = await c.match(url);
      if (!res) {
        const net = await fetch(url);
        if (net.ok) { await c.put(url, net.clone()); res = net; }
      }
    }
  } catch (e) {}
  if (!res) res = await fetch(url);
  const buf = await res.arrayBuffer();
  return URL.createObjectURL(new Blob([buf], { type: mime }));
};

const dlGetFF = async (): Promise<any> => {
  if (ffInst && ffInst.loaded) return ffInst;
  if (ffLoading) return ffLoading;
  ffLoading = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    if (!ffCoreUrls) {
      const [coreURL, wasmURL] = await Promise.all([coreBlobUrl('ffmpeg-core.js', 'text/javascript'), coreBlobUrl('ffmpeg-core.wasm', 'application/wasm')]);
      ffCoreUrls = { coreURL, wasmURL };
    }
    const ff = new FFmpeg();
    await ff.load(ffCoreUrls);
    ffInst = ff; ffJobsSinceLoad = 0;
    return ff;
  })();
  try { return await ffLoading; } finally { ffLoading = null; }
};
const dlResetFF = () => { try { ffInst?.terminate(); } catch (e) {} ffInst = null; };
const warmEncoder = () => { dlGetFF().catch(() => {}); };

// ---- pipeline ----
let dlFetching = false, dlEncoding = false;

const dlFail = (id: string, e: any) => {
  const j = dlGet(id);
  if (!j || j.status === 'canceled') return;
  console.error('Download failed:', e);
  dlStore.audio.delete(id); dlStore.cover.delete(id); dlStore.aborts.delete(id);
  dlPatch(id, { status: 'error', error: e?.message || 'Download failed', step: 'Failed' });
};

const dlRunFetch = async (job: DlJob) => {
  const ac = new AbortController();
  dlStore.aborts.set(job.id, ac);
  dlPatch(job.id, { status: 'downloading', progress: 1, step: 'Downloading audio…' });
  const [audio, cover] = await Promise.all([
    fetchAudioBytes(job.url, f => dlPatch(job.id, { progress: 1 + f * 38, step: 'Downloading audio…' }, true), ac.signal),
    fetchCover(job.image, ac.signal),
  ]);
  dlStore.aborts.delete(job.id);
  const cur = dlGet(job.id);
  if (!cur || cur.status !== 'downloading') return;
  dlStore.audio.set(job.id, audio);
  if (cover) dlStore.cover.set(job.id, cover);
  dlPatch(job.id, { status: 'ready', progress: 40, step: 'Waiting for encoder…' });
  dlPumpEncode();
};

const dlRunEncode = async (job: DlJob) => {
  const id = job.id;
  const audio = dlStore.audio.get(id);
  if (!audio) throw new Error('Audio data missing');
  dlPatch(id, { status: 'encoding', progress: 41, step: 'Starting encoder…' });
  const ff = await dlGetFF();
  if (dlIsCanceled(id)) return;

  const urlQ = String(job.url).match(/\/(\d+)\.mp4/);
  const br = parseInt(urlQ ? urlQ[1] : String(job.num || ''), 10) || 192;
  const inName = `in_${id}.${audio.ext}`, tmpName = `t_${id}.mp3`, outName = `o_${id}.mp3`, covName = `c_${id}.img`;
  const files: string[] = [];
  const setP = (p: number, step: string) => { if (!dlIsCanceled(id)) dlPatch(id, { progress: Math.min(99, p), step }, true); };

  const onLog = (ev: { message: string }) => {
    if (!(job.duration > 0)) return;
    const m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(ev.message || '');
    if (m) setP(42 + Math.min(1, (+m[1] * 3600 + +m[2] * 60 + +m[3]) / job.duration) * 48, 'Encoding MP3…');
  };
  const onProg = (ev: { progress: number }) => {
    if (job.duration > 0) return;
    setP(42 + Math.min(1, Math.max(0, ev.progress || 0)) * 48, 'Encoding MP3…');
  };

  try {
    await ff.writeFile(inName, audio.data); files.push(inName);
    dlStore.audio.delete(id);
    const cov = dlStore.cover.get(id);
    let hasCover = false;
    if (cov) { await ff.writeFile(covName, cov); files.push(covName); hasCover = true; dlStore.cover.delete(id); }
    if (dlIsCanceled(id)) return;

    // PASS 1 — clean encode (audio only, strip stream metadata). Faster LAME preset for ≤192k; best quality for HD.
    setP(42, 'Encoding MP3…');
    ff.on('log', onLog); ff.on('progress', onProg);
    let code1: number;
    try {
      code1 = await ff.exec([
        '-i', inName, '-vn', '-c:a', 'libmp3lame', '-b:a', `${br}k`, '-compression_level', br >= 256 ? '4' : '7',
        ...(br < 32 ? ['-ar', '24000'] : []),
        '-map_metadata', '-1', tmpName
      ]);
    } finally { ff.off('log', onLog); ff.off('progress', onProg); }
    files.push(tmpName);
    if (dlIsCanceled(id)) return;
    if (code1 !== 0) throw new Error('Audio encoding failed.');

    // PASS 2 — ID3 tags + cover (audio is copied, never re-encoded)
    setP(92, 'Writing ID3 tags & cover…');
    const tagArgs: string[] = ['-i', tmpName];
    if (hasCover) {
      tagArgs.push('-i', covName, '-map', '0:a', '-map', '1:v', '-c:a', 'copy',
        '-c:v', 'mjpeg', '-pix_fmt', 'yuvj420p', '-id3v2_version', '3', '-disposition:v', 'attached_pic',
        '-metadata:s:v', 'title=Album cover', '-metadata:s:v', 'comment=Cover (front)');
    } else {
      tagArgs.push('-map', '0:a', '-c:a', 'copy', '-id3v2_version', '3');
    }
    const primary = job.artists.split(',')[0].trim();
    tagArgs.push('-metadata', `title=${job.title}`, '-metadata', `artist=${job.artists}`, '-metadata', `album_artist=${primary}`, '-metadata', `album=${job.album}`);
    if (job.composer) tagArgs.push('-metadata', `composer=${job.composer}`);
    if (job.year) tagArgs.push('-metadata', `date=${job.year}`, '-metadata', `year=${job.year}`);
    if (job.genre) tagArgs.push('-metadata', `genre=${job.genre}`);
    tagArgs.push(outName);
    const code2 = await ff.exec(tagArgs);
    files.push(outName);
    if (dlIsCanceled(id)) return;
    if (code2 !== 0) throw new Error('Writing tags failed.');

    setP(98, 'Saving file…');
    const data = (await ff.readFile(outName)) as Uint8Array;
    const blob = new Blob([data as unknown as BlobPart], { type: 'audio/mpeg' });
    const name = `${job.title.replace(/[/\\:*?<>|]/g, '').trim() || 'audio_download'}.mp3`;
    triggerSave(blob, name);
    dlStore.blobs.set(id, { blob, name });
    // keep only the last 8 finished files in memory for "save again"
    const keep = dlSnap.jobs.filter(j => j.status === 'done').slice(-7).map(j => j.id);
    Array.from(dlStore.blobs.keys()).forEach(k => { if (k !== id && !keep.includes(k)) dlStore.blobs.delete(k); });
    dlPatch(id, { status: 'done', progress: 100, step: 'Saved', sizeMB: blob.size / 1048576 });
    dlSnap = { ...dlSnap, lastDoneAt: Date.now() }; dlEmit(true);
  } finally {
    try { ff.off('log', onLog); ff.off('progress', onProg); } catch (e) {}
    if (ffInst === ff) { for (const f of files) { try { await ff.deleteFile(f); } catch (e) {} } }
    ffJobsSinceLoad++;
    if (ffJobsSinceLoad >= 12 && ffInst === ff) dlResetFF(); // recycle wasm heap now and then (core is cached → reload is instant)
  }
};

const dlPumpFetch = async () => {
  if (dlFetching) return;
  dlFetching = true;
  try {
    while (!dlSnap.paused) {
      if (dlSnap.jobs.some(j => j.status === 'ready')) break;
      const next = dlSnap.jobs.find(j => j.status === 'queued');
      if (!next) break;
      try { await dlRunFetch(next); } catch (e: any) { dlFail(next.id, e); }
    }
  } finally { dlFetching = false; }
};

const dlPumpEncode = async () => {
  if (dlEncoding) return;
  dlEncoding = true;
  try {
    while (!dlSnap.paused) {
      const j = dlSnap.jobs.find(x => x.status === 'ready');
      if (!j) break;
      try { await dlRunEncode(j); } catch (e: any) { dlFail(j.id, e); }
      dlPumpFetch();
    }
  } finally { dlEncoding = false; }
};
const dlPump = () => { dlPumpFetch(); dlPumpEncode(); };

type DlEnqueueInput = Omit<DlJob, 'id' | 'status' | 'progress' | 'step' | 'addedAt' | 'error' | 'sizeMB'>;
const dlEnqueue = (input: DlEnqueueInput): boolean => {
  if (dlSnap.jobs.some(j => j.trackId === input.trackId && j.num === input.num && isActiveStatus(j.status))) return false;
  const job: DlJob = { ...input, id: `dl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, status: 'queued', progress: 0, step: 'Waiting in queue', addedAt: Date.now() };
  dlSnap = { ...dlSnap, jobs: [...dlSnap.jobs, job] };
  dlEmit(true);
  setTimeout(warmEncoder, 700); // never compete with the UI animation
  dlPump();
  return true;
};
const dlCancel = (id: string) => {
  const j = dlGet(id);
  if (!j || !isActiveStatus(j.status)) return;
  const wasEncoding = j.status === 'encoding';
  dlPatch(id, { status: 'canceled', step: 'Canceled' });
  try { dlStore.aborts.get(id)?.abort(); } catch (e) {}
  dlStore.aborts.delete(id); dlStore.audio.delete(id); dlStore.cover.delete(id);
  if (wasEncoding) dlResetFF();
  dlPump();
};
const dlRemove = (id: string) => {
  const j = dlGet(id);
  if (!j) return;
  if (isActiveStatus(j.status)) dlCancel(id);
  dlStore.blobs.delete(id);
  dlSnap = { ...dlSnap, jobs: dlSnap.jobs.filter(x => x.id !== id) };
  dlEmit(true);
};
const dlRetry = (id: string) => {
  const j = dlGet(id);
  if (!j || isActiveStatus(j.status)) return;
  dlPatch(id, { status: 'queued', progress: 0, step: 'Waiting in queue', error: undefined });
  dlPump();
};
const dlCancelAll = () => { dlSnap.jobs.filter(j => isActiveStatus(j.status)).forEach(j => dlCancel(j.id)); };
const dlClearFinished = () => {
  dlSnap.jobs.filter(j => !isActiveStatus(j.status)).forEach(j => dlStore.blobs.delete(j.id));
  dlSnap = { ...dlSnap, jobs: dlSnap.jobs.filter(j => isActiveStatus(j.status)) };
  dlEmit(true);
};
const dlSetPaused = (paused: boolean) => { dlSnap = { ...dlSnap, paused }; dlEmit(true); if (!paused) dlPump(); };
const dlMoveToFront = (id: string) => {
  const j = dlSnap.jobs.find(x => x.id === id);
  if (!j || j.status !== 'queued') return;
  const rest = dlSnap.jobs.filter(x => x.id !== id);
  const at = rest.findIndex(x => x.status === 'queued');
  rest.splice(at < 0 ? rest.length : at, 0, j);
  dlSnap = { ...dlSnap, jobs: rest };
  dlEmit(true);
};
const dlSave = (id: string) => { const b = dlStore.blobs.get(id); if (b) triggerSave(b.blob, b.name); };

const useDlSnap = () => useSyncExternalStore(dlSubscribe, dlGetSnap, () => DL_SERVER_SNAP);

const DlCountBadge = React.memo(({ accent }: { accent: string }) => {
  const snap = useDlSnap();
  const n = snap.jobs.filter(j => isActiveStatus(j.status)).length;
  if (!n) return null;
  return <span className="min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-black text-black flex items-center justify-center" style={{ background: accent }}>{n}</span>;
});
DlCountBadge.displayName = 'DlCountBadge';

// ===================== FLOATING DOWNLOAD BUBBLE (draggable, circular progress, "+N" queue) =====================
const BUBBLE = 64;
const DownloadBubble = React.memo(({ accent, onOpen }: { accent: string; onOpen: () => void }) => {
  const snap = useDlSnap();
  const active = snap.jobs.filter(j => isActiveStatus(j.status));
  const current = snap.jobs.find(j => j.status === 'encoding') || snap.jobs.find(j => j.status === 'downloading') || active[0];
  const lastDone = [...snap.jobs].reverse().find(j => j.status === 'done');
  const [recentDone, setRecentDone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const frac = useRef<{ fx: number; fy: number }>({ fx: 1, fy: 0.74 });
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const posRef = useRef({ x: 0, y: 0 });

  const shown = current || (recentDone ? lastDone : undefined);
  const visible = !!shown;

  useEffect(() => {
    if (snap.lastDoneAt > 0 && active.length === 0) {
      setRecentDone(true);
      const t = setTimeout(() => setRecentDone(false), 3800);
      return () => clearTimeout(t);
    }
  }, [snap.lastDoneAt, active.length]);

  useEffect(() => {
    if (active.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active.length > 0]);

  const apply = useCallback((x: number, y: number, animate = false) => {
    const el = rootRef.current; if (!el) return;
    el.style.transition = animate ? 'transform .28s cubic-bezier(0.32,0.72,0,1), opacity .25s' : 'opacity .25s';
    el.style.transform = `translate3d(${x}px,${y}px,0)`;
    posRef.current = { x, y };
  }, []);
  const bounds = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    return { minX: 8, maxX: Math.max(8, vw - BUBBLE - 8), minY: 56, maxY: Math.max(56, vh - BUBBLE - 8) };
  };
  const place = useCallback(() => {
    const b = bounds();
    apply(b.minX + frac.current.fx * (b.maxX - b.minX), b.minY + frac.current.fy * (b.maxY - b.minY));
  }, [apply]);

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem('dl_bubble_pos') || 'null'); if (s && typeof s.fx === 'number' && typeof s.fy === 'number') frac.current = s; } catch (e) {}
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [place]);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: posRef.current.x, oy: posRef.current.y, moved: false };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch (er) {}
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 6) d.moved = true;
    if (!d.moved) return;
    const b = bounds();
    apply(Math.min(b.maxX, Math.max(b.minX, d.ox + dx)), Math.min(b.maxY, Math.max(b.minY, d.oy + dy)));
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch (er) {}
    if (!d) return;
    if (!d.moved) { onOpen(); return; }
    const b = bounds();
    const x = posRef.current.x + BUBBLE / 2 < window.innerWidth / 2 ? b.minX : b.maxX; // glide to nearest edge
    const y = posRef.current.y;
    frac.current = { fx: x === b.minX ? 0 : 1, fy: (y - b.minY) / Math.max(1, b.maxY - b.minY) };
    try { localStorage.setItem('dl_bubble_pos', JSON.stringify(frac.current)); } catch (er) {}
    apply(x, y, true);
  };

  const pct = shown ? Math.round(shown.progress) : 0;
  const isDone = shown?.status === 'done';
  const R = 29, C = 2 * Math.PI * R;
  const extra = Math.max(0, active.length - 1);

  return (
    <div ref={rootRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      className="fixed left-0 top-0 z-[100050] touch-none select-none cursor-pointer"
      style={{ width: BUBBLE, height: BUBBLE, opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', willChange: 'transform' }}
      aria-label="Downloads" role="button">
      <div className="relative w-full h-full rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-[5px] rounded-full overflow-hidden bg-[#282828]">
          {shown?.image && <img draggable={false} src={shown.image} alt="" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {isDone
              ? <Check size={22} className="stroke-[3px] text-white" />
              : <span className="text-white/90 font-black text-[14px] tabular-nums leading-none" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>{pct}<span className="text-[8px] font-bold opacity-80">%</span></span>}
          </div>
        </div>
        <svg className="absolute inset-0 -rotate-90 pointer-events-none" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
          <circle cx="32" cy="32" r={R} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (isDone ? 100 : pct) / 100)} style={{ transition: 'stroke-dashoffset .35s linear' }} />
        </svg>
        {extra > 0 && !isDone && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-white text-black text-[11px] font-black flex items-center justify-center shadow-md">+{extra}</span>
        )}
      </div>
    </div>
  );
});
DownloadBubble.displayName = 'DownloadBubble';

// ===================== DOWNLOAD MANAGER (queue, cancel, remove, retry, reorder, pause) =====================
const dlStatusText = (j: DlJob) =>
  j.status === 'queued' ? 'In queue'
  : j.status === 'ready' ? 'Downloaded · waiting for encoder'
  : j.status === 'downloading' ? (j.step || 'Downloading…')
  : j.status === 'encoding' ? (j.step || 'Encoding…')
  : j.status === 'done' ? `Saved${j.sizeMB ? ` · ${j.sizeMB.toFixed(1)} MB` : ''}`
  : j.status === 'canceled' ? 'Canceled'
  : (j.error || 'Failed');

const IconBtn = ({ onClick, label, children, danger = false }: { onClick: () => void; label: string; children: React.ReactNode; danger?: boolean }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label} title={label} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform ${danger ? 'bg-red-500/15 text-red-400' : 'bg-white/10 text-white/85'}`}>{children}</button>
);

const DlRow = React.memo(({ job, accent, canMoveUp }: { job: DlJob; accent: string; canMoveUp: boolean }) => {
  const inProg = job.status === 'downloading' || job.status === 'encoding';
  const pct = Math.round(job.progress);
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.06] border border-white/[0.07]">
      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#282828] flex-shrink-0">
        {job.image && <img draggable={false} src={job.image} alt="" className="w-full h-full object-cover" />}
        {job.status === 'done' && <div className="absolute inset-0 bg-black/45 flex items-center justify-center"><Check size={20} className="stroke-[3px] text-white" /></div>}
      </div>
      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white font-bold text-[14px] truncate">{job.title}</span>
          <span className="px-1.5 py-[2px] rounded-full text-[9px] font-black uppercase tracking-wider flex-shrink-0" style={{ background: `${accent}26`, color: accent }}>{job.num}k</span>
        </div>
        <span className="text-white/55 text-[12px] font-medium truncate">{job.artists}</span>
        {inProg ? (
          <div className="flex flex-col gap-1 mt-1">
            <div className="h-[5px] w-full rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${pct}%`, background: accent }} /></div>
            <div className="flex justify-between text-[10.5px] font-semibold text-white/50"><span className="truncate pr-2">{dlStatusText(job)}</span><span className="tabular-nums">{pct}%</span></div>
          </div>
        ) : (
          <span className={`text-[11px] font-semibold truncate ${job.status === 'error' ? 'text-red-400' : 'text-white/45'}`}>{dlStatusText(job)}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {job.status === 'queued' && canMoveUp && <IconBtn label="Move to front" onClick={() => dlMoveToFront(job.id)}><ArrowUp size={16} /></IconBtn>}
        {isActiveStatus(job.status) && <IconBtn label={inProg ? 'Cancel' : 'Remove from queue'} onClick={() => dlCancel(job.id)} danger><X size={16} /></IconBtn>}
        {job.status === 'done' && dlStore.blobs.has(job.id) && <IconBtn label="Save again" onClick={() => dlSave(job.id)}><Download size={16} /></IconBtn>}
        {(job.status === 'error' || job.status === 'canceled') && <IconBtn label="Retry" onClick={() => dlRetry(job.id)}><RotateCcw size={16} /></IconBtn>}
        {!isActiveStatus(job.status) && <IconBtn label="Remove" onClick={() => dlRemove(job.id)} danger><Trash2 size={16} /></IconBtn>}
      </div>
    </div>
  );
});
DlRow.displayName = 'DlRow';

const DownloadManager = React.memo(({ open, onClose, accent, bg, glow }: { open: boolean; onClose: () => void; accent: string; bg: string; glow: string }) => {
  const snap = useDlSnap();
  const jobs = snap.jobs;
  const inProgress = jobs.filter(j => j.status === 'downloading' || j.status === 'encoding');
  const upNext = jobs.filter(j => j.status === 'queued' || j.status === 'ready');
  const finished = jobs.filter(j => !isActiveStatus(j.status)).slice().reverse();
  const activeCount = inProgress.length + upNext.length;
  const section = (t: string, n?: number) => <span className="text-white/50 text-[11px] font-bold uppercase tracking-wider pl-1 flex items-center gap-2">{t}{n ? <span className="text-white/35">{n}</span> : null}</span>;
  const chip = 'px-3.5 py-2 rounded-full text-[12px] font-bold flex items-center gap-1.5 active:scale-95 transition-transform';

  return (
    <div className={`fixed inset-0 z-[100060] bg-black/70 sheet-scrim flex flex-col justify-end ${open ? 'opacity-100 pointer-events-auto scrim-in' : 'opacity-0 pointer-events-none scrim-out'}`} onClick={onClose}>
      <div className={`w-full rounded-t-[32px] border-t border-white/10 shadow-[0_-8px_28px_rgba(0,0,0,0.5)] relative overflow-hidden max-h-[88vh] flex flex-col sheet-panel ${open ? 'translate-y-0 sheet-in' : 'translate-y-full sheet-out'}`} style={{ background: `linear-gradient(180deg, ${bg} 0%, #0c0c0e 52%)` }} onClick={e => e.stopPropagation()}>
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[120%] h-56 pointer-events-none opacity-60" style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }} />
        <div className="relative z-10 flex flex-col items-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-[5px] rounded-full bg-white/25" /></div>

        <div className="relative z-10 flex items-center justify-between px-6 pt-2 pb-3 flex-shrink-0">
          <div className="flex flex-col">
            <h3 className="text-white font-black text-[22px] tracking-tight flex items-center gap-2.5"><Download size={22} style={{ color: accent }} /> Downloads</h3>
            <span className="text-white/50 text-[12px] font-semibold mt-0.5">{activeCount > 0 ? `${activeCount} active${snap.paused ? ' · paused' : ''}` : 'Nothing downloading'}</span>
          </div>
          <button onClick={onClose} className="text-white/70 p-2 hover:text-white bg-white/10 rounded-full active:scale-90 transition-transform" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="relative z-10 flex items-center gap-2 px-5 pb-3 flex-shrink-0 overflow-x-auto scrollbar-hide">
          <button onClick={() => dlSetPaused(!snap.paused)} className={`${chip} bg-white/10 text-white`}>{snap.paused ? <><Play size={14} /> Resume queue</> : <><Pause size={14} /> Pause queue</>}</button>
          {activeCount > 0 && <button onClick={dlCancelAll} className={`${chip} bg-red-500/15 text-red-400`}><X size={14} /> Cancel all</button>}
          {finished.length > 0 && <button onClick={dlClearFinished} className={`${chip} bg-white/10 text-white`}><Trash2 size={14} /> Clear finished</button>}
        </div>

        <div className="relative z-10 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] flex flex-col gap-4 overflow-y-auto scrollbar-hide">
          {jobs.length === 0 && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/50"><Download size={24} /></div>
              <span className="text-white/60 text-[13px] font-medium px-6">Your downloads will appear here. Pick “Music” in the player menu to add songs — they keep downloading in the background.</span>
            </div>
          )}
          {inProgress.length > 0 && (
            <div className="flex flex-col gap-2.5">{section('Now downloading', inProgress.length)}{inProgress.map(j => <DlRow key={j.id} job={j} accent={accent} canMoveUp={false} />)}</div>
          )}
          {upNext.length > 0 && (
            <div className="flex flex-col gap-2.5">{section('Up next', upNext.length)}{upNext.map((j, i) => <DlRow key={j.id} job={j} accent={accent} canMoveUp={j.status === 'queued' && i > 0} />)}</div>
          )}
          {finished.length > 0 && (
            <div className="flex flex-col gap-2.5">{section('Finished', finished.length)}{finished.map(j => <DlRow key={j.id} job={j} accent={accent} canMoveUp={false} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
});
DownloadManager.displayName = 'DownloadManager';

// ===================== PREMIUM SVG ICON SET =====================
type IcProps = { size?: number; className?: string };

const Svg = ({ size = 24, className, children, stroke = false, sw = 1.9 }: IcProps & { children: React.ReactNode; stroke?: boolean; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke ? "none" : "currentColor"} stroke={stroke ? "currentColor" : "none"} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
    {children}
  </svg>
);

const IcPlay = (p: IcProps) => (<Svg {...p}><path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.2-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z" /></Svg>);
const IcPause = (p: IcProps) => (<Svg {...p}><rect x="5.8" y="4.5" width="4.4" height="15" rx="1.7" /><rect x="13.8" y="4.5" width="4.4" height="15" rx="1.7" /></Svg>);
const IcNext = (p: IcProps) => (<Svg {...p}><path d="M5 6.1v11.8a1 1 0 0 0 1.5.86l8.9-5.9a1 1 0 0 0 0-1.72l-8.9-5.9A1 1 0 0 0 5 6.1z" /><rect x="17.2" y="5" width="2.8" height="14" rx="1.4" /></Svg>);
const IcPrev = (p: IcProps) => (<Svg {...p}><g transform="translate(24 0) scale(-1 1)"><path d="M5 6.1v11.8a1 1 0 0 0 1.5.86l8.9-5.9a1 1 0 0 0 0-1.72l-8.9-5.9A1 1 0 0 0 5 6.1z" /><rect x="17.2" y="5" width="2.8" height="14" rx="1.4" /></g></Svg>);
const IcShuffle = (p: IcProps) => (<Svg {...p} stroke sw={1.9}><path d="M3 7h3.2c1.6 0 3 .8 3.9 2.1l3.8 5.8c.9 1.3 2.3 2.1 3.9 2.1H21" /><path d="M3 17h3.2c1.2 0 2.3-.5 3.1-1.3" /><path d="M13.2 8.4c.8-.8 1.9-1.2 3-1.2H21" /><path d="M18.5 4.5 21 7l-2.5 2.5" /><path d="M18.5 14.5 21 17l-2.5 2.5" /></Svg>);
const IcRepeat = (p: IcProps) => (<Svg {...p} stroke sw={1.9}><path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H20" /><path d="m17 3 3 3-3 3" /><path d="M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H4" /><path d="m7 21-3-3 3-3" /></Svg>);
const IcHeart = ({ size = 24, className, filled = false }: IcProps & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false" fill={filled ? "url(#heartGrad)" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id="heartGrad" x1="4" y1="4" x2="20" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#4ff08a" /><stop offset="1" stopColor="#1db954" />
      </linearGradient>
    </defs>
    <path d="M12 20.4c-.3 0-.6-.1-.8-.3C6.2 16.3 3 13.4 3 9.8 3 7.2 5 5.2 7.5 5.2c1.7 0 3.3.9 4.5 2.4 1.2-1.5 2.8-2.4 4.5-2.4C19 5.2 21 7.2 21 9.8c0 3.6-3.2 6.5-8.2 10.3-.2.2-.5.3-.8.3z" />
  </svg>
);
const IcQueue = (p: IcProps) => (<Svg {...p} stroke><path d="M4 6h12" /><path d="M4 11h12" /><path d="M4 16h6" /><path d="M15.5 14.2v5.6l4.8-2.8z" fill="currentColor" /></Svg>);
const IcScreen = (p: IcProps) => (<Svg {...p} stroke><rect x="3" y="4.5" width="18" height="12.5" rx="3.2" /><path d="M10 8.4v5l4.1-2.5z" fill="currentColor" /><path d="M8.5 20.5h7" /></Svg>);
const IcJam = (p: IcProps) => (<Svg {...p} stroke><circle cx="9" cy="8.5" r="3.3" /><path d="M3 19.5c.4-3.2 2.8-5 6-5s5.6 1.8 6 5" /><circle cx="17" cy="9.5" r="2.5" /><path d="M17.5 14.7c2.2.2 3.6 1.7 3.9 4.3" /></Svg>);
const IcChat = (p: IcProps) => (<Svg {...p} stroke><path d="M20 12.5a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 12.5v-6A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z" /><path d="M8.5 8.5h7M8.5 11.5h4" /></Svg>);
const IcChatOff = (p: IcProps) => (<Svg {...p} stroke><path d="M20 12.5a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 12.5v-6A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z" /><path d="M3.5 3.5l17 17" /></Svg>);
const IcChevronDown = (p: IcProps) => (<Svg {...p} stroke sw={2.2}><path d="m6 9.5 6 6 6-6" /></Svg>);
const IcMore = (p: IcProps) => (<Svg {...p}><circle cx="5.5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="18.5" cy="12" r="1.9" /></Svg>);
const IcExpand = (p: IcProps) => (<Svg {...p} stroke sw={2}><path d="M14 4h6v6" /><path d="M10 20H4v-6" /><path d="m20 4-7 7" /><path d="m4 20 7-7" /></Svg>);
const IcLang = (p: IcProps) => (<Svg {...p} stroke sw={1.8}><path d="M4 6h9" /><path d="M8.5 4v2" /><path d="M6 6c.4 2.6 2.2 5 5 6.6" /><path d="M12 6c-.6 3-2.6 5.6-6 7.4" /><path d="m12.5 20 4-9 4 9" /><path d="M13.9 17h5.2" /></Svg>);

const EqBars = React.memo(({ playing, color }: { playing: boolean; color: string }) => (
  <div className="flex items-end gap-[3px] h-[16px] w-[18px]" aria-hidden="true">
    {[0, 0.25, 0.5].map((d, i) => (
      <span key={i} className="eq-bar w-[3px] h-full rounded-full origin-bottom" style={{ backgroundColor: color, animationDelay: `${d}s`, animationPlayState: playing ? 'running' : 'paused' }} />
    ))}
  </div>
));
EqBars.displayName = 'EqBars';

// --- SPOTIFY-STYLE PING-PONG MARQUEE ---
// Scrolls only the overflowing distance, pauses at both ends, then glides back. ResizeObserver-driven, GPU transform only.
const MarqueeText = React.memo(({ text, className = "" }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [dist, setDist] = useState(0);

  useEffect(() => {
    const measure = () => {
      const c = containerRef.current, t = textRef.current;
      if (!c || !t) return;
      const d = t.scrollWidth - c.clientWidth;
      setDist(d > 4 ? Math.ceil(d) : 0);
    };
    measure();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      if (containerRef.current) ro.observe(containerRef.current);
      if (textRef.current) ro.observe(textRef.current);
    } else window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap w-full block ${dist ? "mask-edges" : ""} ${className}`}>
      <span
        ref={textRef}
        className={`inline-block whitespace-nowrap ${dist ? "marquee-pp" : ""}`}
        style={dist ? ({ ['--d' as any]: `-${dist}px`, ['--t' as any]: `${Math.max(5, dist / 16 + 3.5)}s` } as React.CSSProperties) : undefined}
      >{text}</span>
    </div>
  );
});
MarqueeText.displayName = 'MarqueeText';

// --- ARTIST ROLE STYLING ---
const ROLE_STYLES: Record<string, { bg: string; fg: string }> = {
  Singer:   { bg: "rgba(29,185,84,0.18)",  fg: "#5df08f" },
  Composer: { bg: "rgba(96,165,250,0.18)", fg: "#8cc2ff" },
  Lyricist: { bg: "rgba(251,191,36,0.18)", fg: "#fcd462" },
  Cast:     { bg: "rgba(244,114,182,0.18)", fg: "#f9a8d4" },
};

// --- ARTIST CARD ("Song DNA") — rings now follow the artwork colour family ---
const SongDnaCard = React.memo(({ artist, closePlayer, isFew, baseHue, baseSat }: { artist: any, closePlayer: () => void, isFew: boolean, baseHue: number, baseSat: number }) => {
    const artistImg = getArtistImage(artist);
    const name = decodeEntities(artist.name || "Unknown");
    const hue = H360(baseHue + ((getArtistHue(name) % 41) - 20));
    const sPct = Math.round(clamp(baseSat + 0.25, 0.18, 0.8) * 100);
    const roles: string[] = artist.roles || [];
    const avatar = isFew ? 112 : 92;
    const widthClass = isFew ? "w-[124px]" : "w-[104px]";

    return (
        <Link prefetch={false} href={`/artist/${artist.seokey || artist.id}`} onClick={closePlayer} className={`flex flex-col items-center gap-3 flex-shrink-0 snap-start ${widthClass} group no-select-text`}>
            <div className="relative rounded-full p-[3px] transition-transform duration-300 group-active:scale-95 group-hover:scale-[1.04]" style={{ width: avatar, height: avatar, background: `conic-gradient(from 210deg, hsl(${hue},${sPct}%,62%), hsl(${H360(hue + 22)},${sPct}%,58%), hsl(${H360(hue - 22)},${sPct}%,55%), hsl(${hue},${sPct}%,62%))`, boxShadow: `0 12px 28px hsla(${hue},${sPct}%,40%,0.35)` }}>
                <div className="w-full h-full rounded-full overflow-hidden bg-[#121212] p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center" style={{ background: artistImg ? '#282828' : `linear-gradient(135deg, hsl(${hue},${Math.round(sPct * 0.6)}%,38%), hsl(${H360(hue + 16)},${Math.round(sPct * 0.6)}%,24%))` }}>
                        {!artistImg ? <span className="text-white font-black text-3xl no-select-text">{name.charAt(0).toUpperCase()}</span> : <img draggable={false} loading="lazy" src={artistImg} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover object-center relative z-10 no-select pointer-events-none" alt={name} />}
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-center w-full gap-1.5 no-select-text overflow-hidden">
                <MarqueeText text={name} className={`text-white ${isFew ? 'text-[15px]' : 'text-[13px]'} font-bold tracking-tight w-full text-center`} />
                <div className="flex flex-wrap items-center justify-center gap-1">
                    {roles.slice(0, 2).map(r => {
                        const st = ROLE_STYLES[r] || { bg: "rgba(255,255,255,0.1)", fg: "#d4d4d4" };
                        return <span key={r} className="px-2 py-[2px] rounded-full text-[10px] font-bold leading-none" style={{ backgroundColor: st.bg, color: st.fg }}>{r}</span>;
                    })}
                    {roles.length > 2 && <span className="px-1.5 py-[2px] rounded-full text-[10px] font-bold leading-none bg-white/10 text-white/70">+{roles.length - 2}</span>}
                </div>
            </div>
        </Link>
    )
});
SongDnaCard.displayName = 'SongDnaCard';

const StatTile = React.memo(({ icon, label, value, accent, wide = false, capitalize = false }: { icon: React.ReactNode; label: string; value: string; accent: string; wide?: boolean; capitalize?: boolean }) => (
  <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white/[0.06] border border-white/[0.07] ${wide ? 'col-span-2' : ''}`}>
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}22`, color: accent }}>{icon}</div>
    <div className="flex flex-col min-w-0">
      <span className="text-white/45 text-[11px] font-semibold tracking-wide">{label}</span>
      <span className={`text-white font-extrabold text-[15px] tracking-tight truncate ${capitalize ? 'capitalize' : ''}`}>{value}</span>
    </div>
  </div>
));
StatTile.displayName = 'StatTile';

const popularityPct = (n: number) => Math.min(100, Math.max(6, (Math.log10(Math.max(1, n) + 1) / 8) * 100));

const QueueStat = React.memo(({ label, value, bg }: { label: string; value: string; bg: string }) => (
  <div className="flex flex-col gap-0.5 p-3 rounded-2xl border border-white/[0.08]" style={{ background: bg }}>
    <span className="text-white font-extrabold text-[18px] tracking-tight leading-tight truncate">{value}</span>
    <span className="text-white/55 text-[11px] font-semibold">{label}</span>
  </div>
));
QueueStat.displayName = 'QueueStat';

// --- SETTINGS UI PRIMITIVES ---
const Toggle = React.memo(({ on, onClick, accent }: { on: boolean; onClick: () => void; accent: string }) => (
  <button role="switch" aria-checked={on} onClick={onClick} className="w-[48px] h-[29px] rounded-full relative transition-colors duration-300 flex-shrink-0" style={{ background: on ? accent : 'rgba(255,255,255,0.16)' }}>
    <span className="absolute top-[3px] left-0 w-[23px] h-[23px] bg-white rounded-full shadow-md transition-transform duration-300" style={{ transform: `translateX(${on ? 22 : 3}px)` }} />
  </button>
));
Toggle.displayName = 'Toggle';

const Segmented = React.memo(({ options, value, onChange, accent }: { options: { v: string; label: string; sub?: string }[]; value: string; onChange: (v: string) => void; accent: string }) => (
  <div className="flex p-1 rounded-2xl bg-black/30 border border-white/[0.06] gap-1">
    {options.map(o => (
      <button key={o.v} onClick={() => onChange(o.v)} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-[transform,opacity,background-color,color,border-color] duration-200 flex flex-col items-center leading-tight ${value === o.v ? 'text-black shadow-lg' : 'text-white/65 active:bg-white/10'}`} style={value === o.v ? { background: accent } : undefined}>
        {o.label}
        {o.sub && <span className="text-[10px] font-semibold opacity-70 mt-0.5">{o.sub}</span>}
      </button>
    ))}
  </div>
));
Segmented.displayName = 'Segmented';

const SettingRow = React.memo(({ icon, title, sub, accent, right, last = false }: { icon: React.ReactNode; title: string; sub?: string; accent: string; right: React.ReactNode; last?: boolean }) => (
  <div className={`flex items-center justify-between gap-3 px-4 py-3.5 ${last ? '' : 'border-b border-white/[0.06]'}`}>
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}26`, color: accent }}>{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-white font-bold text-[15px] leading-tight">{title}</span>
        {sub && <span className="text-white/45 text-[11.5px] font-medium mt-0.5 leading-snug">{sub}</span>}
      </div>
    </div>
    {right}
  </div>
));
SettingRow.displayName = 'SettingRow';

const QUALITY_OPTIONS = [
  { v: '16', label: 'Low', sub: '16 kbps' }, { v: '64', label: 'Medium', sub: '64 kbps' },
  { v: '128', label: 'High', sub: '128 kbps' }, { v: '320', label: 'HD', sub: '320 kbps' },
];
const SIZE_OPTIONS = [{ v: 'Small', label: 'S' }, { v: 'Medium', label: 'M' }, { v: 'Large', label: 'L' }];
const SERVER_OPTIONS = [{ v: 'Spotify', label: 'Spotify' }, { v: 'Gaana', label: 'Gaana' }];

export default function MiniPlayer() {
  const {
    currentSong, isPlaying, setIsPlaying, setCurrentSong,
    queue, upcomingQueue, setUpcomingQueue, historyQueue, setHistoryQueue,
    playContext, likedSongs, toggleLikeSong
  } = useAppContext();

  const [audioUrl, setAudioUrl] = useState("");
  const [streamBaseUrl, setStreamBaseUrl] = useState<string | null>(null);

  // Buffering States
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [isAudioBuffering, setIsAudioBuffering] = useState(false);

  const [progress, setProgress] = useState(0);
  const bufferedRef = useRef(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);

  // --- LYRICS TRANSLITERATION STATES ---
  const [lyricsLang, setLyricsLang] = useState<'original' | 'hi' | 'en'>('original');
  const [displayLyrics, setDisplayLyrics] = useState<any[]>([]);
  const [isTransliterating, setIsTransliterating] = useState(false);

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

  const localActionTimeRef = useRef<number>(0);
  const requestedDataForTrackRef = useRef<string | null>(null);

  const upcomingQueueRef = useRef<any[]>([]);
  const playContextRef = useRef<any>(null);

  useEffect(() => { upcomingQueueRef.current = upcomingQueue; }, [upcomingQueue]);
  useEffect(() => { playContextRef.current = playContext; }, [playContext]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { jamRoleRef.current = jamRole; }, [jamRole]);
  useEffect(() => { jamPlayBlockedRef.current = jamPlayBlocked; }, [jamPlayBlocked]);

  // Warm hls.js once so the first song starts instantly
  useEffect(() => { loadHlsJS().catch(() => {}); }, []);

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

  const songStartTrackingRef = useRef<number>(Date.now());
  const lastFetchedTrackIdRef = useRef<string | null>(null);

  // Dictionary-driven palette
  const [palette, setPalette] = useState<Palette>(DEFAULT_PALETTE);
  const paletteCacheRef = useRef<Map<string, Palette>>(new Map());
  const dominantColor = palette.base;

  const [isScrolledPastMain, setIsScrolledPastMain] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0);

  const [dragActiveIndex, setDragActiveIndex] = useState<number | null>(null);
  const dragRef = useRef({ activeIndex: -1, startY: 0, currentY: 0, startScrollTop: 0, scrollSpeed: 0, rafId: 0, targetIndex: -1 });
  const [isQueueEditMode, setIsQueueEditMode] = useState(false);
  const [selectedQueueItems, setSelectedQueueItems] = useState<number[]>([]);

  const [sleepTimer, setSleepTimer] = useState<number | 'end' | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);

  const currentTrackRef = useRef<any>(null);
  const maxListenRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0);
  const isNavigatingBackRef = useRef(false);
  const mediaMetadataSetRef = useRef(false);
  const hasCachedCurrentSongRef = useRef(false);

  const rapidKeyIdxRef = useRef(0);
  const [spotifyId, setSpotifyId] = useState<string | null>(null);
  const [spotifyUrl, setSpotifyUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<any[]>([]);
  const [syncType, setSyncType] = useState<string | null>(null);
  const setActiveLyricIndex = setLyricIdx; // lyric line lives in an isolated store → no full-player re-render per line
  const [isLyricsFullScreen, setIsLyricsFullScreen] = useState(false);
  const [canvasData, setCanvasData] = useState<any>(null);
  const [isCanvasLoaded, setIsCanvasLoaded] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [uiSettled, setUiSettled] = useState(false);

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
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioElA = useRef<HTMLAudioElement | null>(null);
  const audioElB = useRef<HTMLAudioElement | null>(null);
  const standbyRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<{ trackId: string; hls: any; url: string; baseUrl: string; el: HTMLAudioElement } | null>(null);
  const skipLoadUrlRef = useRef<string | null>(null);
  const registerAudio = (el: HTMLAudioElement | null) => {
    if (!el) return;
    const cur = audioRef.current;
    if (!cur || !cur.isConnected) { (audioRef as any).current = el; if (standbyRef.current === el) standbyRef.current = null; }
    else if (el !== cur) standbyRef.current = el;
  };
  const setAudioA = useCallback((el: HTMLAudioElement | null) => { audioElA.current = el; registerAudio(el); }, []);
  const setAudioB = useCallback((el: HTMLAudioElement | null) => { audioElB.current = el; registerAudio(el); }, []);
  
  const queueFillRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  const queueContainerRef = useRef<HTMLDivElement>(null);
  const isSeekingRef = useRef(false);
  const [songDetails, setSongDetails] = useState<any>(null);

  const [isVideoMode, setIsVideoMode] = useState(false);
  const [ytVideoId, setYtVideoId] = useState<string | null>(null);
  const prefetchedYtIdRef = useRef<string | null>(null);
  const iframeInitialTimeRef = useRef<number>(0);
  const videoStartTimeRef = useRef<number>(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const videoIframeRef = useRef<HTMLIFrameElement>(null);

  const fetchingRecsRef = useRef(false);
  const [isFetchingRecsUI, setIsFetchingRecsUI] = useState(false);
  const [isSessionRestored, setIsSessionRestored] = useState(false);

  const [selectedQuality, setSelectedQuality] = useState("128");
  const [lineFontSize, setLineFontSize] = useState("Medium");
  const [cardFontSize, setCardFontSize] = useState("Medium");
  const [isCanvasEnabled, setIsCanvasEnabled] = useState(true);
  const [isLyricsEnabled, setIsLyricsEnabled] = useState(true);
  const [isWordSyncEnabled, setIsWordSyncEnabled] = useState(true);
  const [isMiniWordSyncEnabled, setIsMiniWordSyncEnabled] = useState(true);
  const [lyricsServer, setLyricsServer] = useState("Spotify");
  const restoreTimeRef = useRef<number | null>(null);

  const isCanvasEnabledRef = useRef(true);
  const isLyricsEnabledRef = useRef(true);

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

  // --- DOWNLOAD STATE (video modal + quality picker; music jobs live in the background engine) ---
  const [dlState, setDlState] = useState<DlState>({ type: null, status: "idle", progress: 0, server: 1 });
  const [dlIncludeLrc, setDlIncludeLrc] = useState(true);
  const [showDlManager, setShowDlManager] = useState(false);
  const [dlToast, setDlToast] = useState<string | null>(null);

  // --- REAL-TIME PROGRESS (direct DOM, no React re-render per tick) ---
  const sliderRef = useRef<HTMLInputElement>(null);
  const curTimeRef = useRef<HTMLSpanElement>(null);
  const miniFillRef = useRef<HTMLDivElement>(null);
  const miniBufRef = useRef<HTMLDivElement>(null);
  const isExpandedRef = useRef(false);
  const lastSliderPaintRef = useRef(0);
  const isFSRef = useRef(false);

  const paintProgress = useCallback((c: number, d: number, force = false) => {
    const pct = d > 0 ? Math.min(100, Math.max(0, (c / d) * 100)) : 0;
    const mf = miniFillRef.current; if (mf) mf.style.transform = `scaleX(${pct / 100})`;
    const mb = miniBufRef.current; if (mb) mb.style.transform = `scaleX(${bufferedRef.current / 100})`;
    const qf = queueFillRef.current; if (qf && (showQueueRef.current || force)) qf.style.transform = `scaleX(${pct / 100})`;
    if (!isExpandedRef.current && !force) return;
    const now = performance.now();
    if (!force && now - lastSliderPaintRef.current < 90) return;
    lastSliderPaintRef.current = now;
    const s = sliderRef.current;
    if (s) {
      if (!isSeekingRef.current || force) s.value = String(pct);
      const bf = bufferedRef.current;
      s.style.background = `linear-gradient(to right, #fff ${pct}%, rgba(255,255,255,0.3) ${pct}%, rgba(255,255,255,0.3) ${bf}%, rgba(255,255,255,0.1) ${bf}%)`;
    }
    const t = curTimeRef.current;
    if (t) { const txt = formatTime(c); if (t.textContent !== txt) t.textContent = txt; }
  }, []);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
    if (isExpanded) { const a = audioRef.current; if (a) paintProgress(a.currentTime, a.duration || 0, true); }
  }, [isExpanded, paintProgress]);

  const showQueueRef = useRef(false);
  const durationRef = useRef(0);
  const canvasShouldPlayRef = useRef(false);
  const lyricClockRef = useRef<{ lines: any[]; on: boolean }>({ lines: [], on: false });

  const isSongLiked = likedSongs.some((s: any) => s && (s.id || s.track_id) === (currentSong?.id || currentSong?.track_id));
  const handleLikeClick = (e: any) => { e.stopPropagation(); toggleLikeSong(currentSong); };

  const canvasMode = !!canvasData?.canvasUrl && isCanvasEnabled && !isVideoMode && !canvasFailed; // known as soon as the url is known → layout never jumps when the video finishes loading
  const isCanvasActive = canvasMode && !isLyricsFullScreen;
  const isBuffering = isStreamLoading || isAudioBuffering || isVideoLoading;

  const isGuestLocked = jamRole === 'guest' && jamStatus === 'connected';
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

          if (requestedDataForTrackRef.current === trackId) return;

          if (!canvasData || lyrics.length === 0 || !songDetails) {
              const timeout = setTimeout(() => {
                  if (ablyChannelRef.current) {
                      requestedDataForTrackRef.current = trackId;
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

              if (Date.now() - localActionTimeRef.current < 8000) return;

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
          }, 20000);
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
                      const newLogs = [...prev, { id: Date.now(), text: `${p.name} ${isEnter ? 'joined the Jam.' : 'left.'}` }];
                      return newLogs.slice(-10);
                  });
              }

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

          channel.subscribe('chat_msg', (msg: any) => {
              setJamChatMessages(prev => [...prev, msg.data].slice(-50));
          });
          channel.subscribe('chat_config', (msg: any) => {
              setIsChatEnabled(msg.data.enabled);
          });

          channel.subscribe('kick_user', (msg: any) => {
              if (msg.data.targetClientId === clientIdRef.current) {
                  setJamError("You have been removed from the Jam session by the host.");
                  disconnectJam();
              }
          });

          // CENTRALIZED SYNC RECEIVER
          channel.subscribe('sync', (msg: any) => {
              const data = msg.data;
              const currentRole = jamRoleRef.current;

              if (data.senderId === clientIdRef.current) return;

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

              const isDriver = currentRole === 'admin' || currentRole === 'host';
              const recentlyActed = isDriver && (Date.now() - localActionTimeRef.current < 10000);

              if (recentlyActed && ['HEARTBEAT', 'TIME', 'STATE', 'QUEUE_UPDATE'].includes(data.type)) {
                  return;
              }

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
                  localActionTimeRef.current = Date.now();
                  const p = data.payload;
                  isSystemSongChangeRef.current = true;

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
                  if (p.isPlaying) targetTime += 0.8;
                  iframeInitialTimeRef.current = targetTime;

                  if (p.song && p.song.id !== currentTrackRef.current?.id) {
                      setCurrentSong(p.song);
                  } else {
                      currentTrackRef.current = p.song;
                  }

                  setIsPlaying(p.isPlaying);
                  if (p.isVideoMode && videoIframeRef.current?.contentWindow) {
                      videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_SEEK', time: targetTime }, '*');
                      videoIframeRef.current.contentWindow.postMessage({ type: p.isPlaying ? 'MUSIC_PLAY' : 'MUSIC_PAUSE' }, '*');
                  } else if (!p.isVideoMode && audioRef.current) {
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
  }, []);

  const closeMainPlayer = useCallback(() => {
    setIsExpanded(false);
    setShowQueue(false);
    setShowSettingsMenu(false);
    setShowTimerMenu(false);
  }, []);

  const openMainPlayer = () => {
      if (!isExpanded) {
          setIsExpanded(true); setShowQueue(false); setShowSettingsMenu(false); setShowTimerMenu(false);
      }
  };

  const openSettings = (e: React.MouseEvent) => { e.stopPropagation(); setShowSettingsMenu(true); };
  const openQueue = () => { setShowQueue(true); };
  const openTimer = () => { setShowTimerMenu(true); };
  const closePlayerForNavigation = () => { closeMainPlayer(); };

  // --- AUDIO SOURCE ENGINE (reuses a single hls.js instance → much faster song changes) ---
  useEffect(() => {
      let cancelled = false;
      const playNow = () => {
          const a = audioRef.current;
          if (!a || !isPlayingRef.current || isVideoModeRef.current) return;
          const p = a.play();
          if (p !== undefined) p.catch((err: any) => { if (err?.name !== 'AbortError') setJamPlayBlocked(true); });
      };
      const setupAudio = async () => {
          const a = audioRef.current;
          if (!a || !audioUrl) return;
          if (skipLoadUrlRef.current === audioUrl) { skipLoadUrlRef.current = null; playNow(); return; } // already buffered on the swapped-in element
          warmOrigin(audioUrl);
          if (audioUrl.includes('.m3u8')) {
              try {
                  const Hls = await loadHlsJS();
                  if (cancelled) return;
                  if (Hls.isSupported()) {
                      if (hlsRef.current && hlsRef.current.media && hlsRef.current.media !== a) { try { hlsRef.current.destroy(); } catch (e) {} hlsRef.current = null; }
                      if (hlsRef.current) {
                          hlsRef.current.once(Hls.Events.MANIFEST_PARSED, playNow);
                          hlsRef.current.loadSource(audioUrl);
                      } else {
                          const hls = new Hls(makeHlsConfig(false));
                          hls.on(Hls.Events.ERROR, (_: any, d: any) => {
                              if (!d?.fatal) return;
                              if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
                              else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
                          });
                          hls.once(Hls.Events.MANIFEST_PARSED, playNow);
                          hls.attachMedia(a);
                          hls.loadSource(audioUrl);
                          hlsRef.current = hls;
                      }
                  } else if (a.canPlayType('application/vnd.apple.mpegurl')) {
                      a.src = audioUrl;
                      playNow();
                  }
              } catch(e) {}
          } else {
              if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
              a.src = audioUrl;
              playNow();
          }
      };
      setupAudio();
      return () => { cancelled = true; };
  }, [audioUrl]);

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
      setPageVisible(document.visibilityState !== 'hidden'); // canvas video is released while the app is in the background
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
  }, []);

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
  }, [sleepTimer]);

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
       const lrcPref = localStorage.getItem('dl_include_lrc'); if (lrcPref !== null) setDlIncludeLrc(lrcPref === 'true');

       const storedLang = localStorage.getItem('lyrics_lang');
       if (storedLang === 'hi' || storedLang === 'en' || storedLang === 'original') {
           setLyricsLang(storedLang as 'original'|'hi'|'en');
       }

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
  }, [currentSong, isSessionRestored, setCurrentSong, setUpcomingQueue]);

  // --- LYRICS TRANSLITERATION EFFECT ---
  useEffect(() => {
      let isCancelled = false;

      if (!lyrics || lyrics.length === 0) {
          setDisplayLyrics([]);
          return;
      }

      if (lyricsLang === 'original') {
          setDisplayLyrics(lyrics);
          return;
      }

      const process = async () => {
          setIsTransliterating(true);
          const cacheKey = `trans_lyrics_${currentTrackRef.current?.id || currentTrackRef.current?.track_id}_${lyricsLang}`;
          const cached = await getCache(cacheKey);
          if (cached) {
              if (!isCancelled) {
                  setDisplayLyrics(cached);
                  setIsTransliterating(false);
              }
              return;
          }

          if (!isCancelled && displayLyrics.length === 0) setDisplayLyrics(lyrics);

          const result = await transliterateLyrics(lyrics, lyricsLang);
          if (!isCancelled) {
              setDisplayLyrics(result);
              setIsTransliterating(false);
              setCache(cacheKey, result);
          }
      };
      process();

      return () => { isCancelled = true; };
  }, [lyrics, lyricsLang]);

  const cycleLyricsLang = (e?: any) => {
      if (e) e.stopPropagation();
      setLyricsLang(prev => {
          const next = prev === 'original' ? 'hi' : prev === 'hi' ? 'en' : 'original';
          localStorage.setItem('lyrics_lang', next);
          return next;
      });
  };

  useEffect(() => { isCanvasEnabledRef.current = isCanvasEnabled; }, [isCanvasEnabled]);
  useEffect(() => { isLyricsEnabledRef.current = isLyricsEnabled; if (!isLyricsEnabled) setIsLyricsFullScreen(false); }, [isLyricsEnabled]);
  useEffect(() => { if (currentSong) localStorage.setItem('last_session_song', JSON.stringify(currentSong)); }, [currentSong]);
  useEffect(() => { if (upcomingQueue && upcomingQueue.length > 0) localStorage.setItem('last_session_queue', JSON.stringify(upcomingQueue)); }, [upcomingQueue]);

  useEffect(() => {
      setIsCanvasLoaded(false); setCanvasFailed(false);
  }, [canvasData?.canvasUrl]);

  // canvas <video> exists only while the full player is open (frees the decoder + memory when collapsed)
  useEffect(() => {
    if (!isExpanded) { setUiSettled(false); return; }
    const t = setTimeout(() => setUiSettled(true), 340); // heavy work (canvas, lyric fx) starts only after the open animation
    return () => clearTimeout(t);
  }, [isExpanded]);

  useEffect(() => {
    showQueueRef.current = showQueue;
    if (showQueue && audioRef.current && audioRef.current.duration > 0) paintProgress(audioRef.current.currentTime, audioRef.current.duration, true);
  }, [showQueue]);

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
  }, []);

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
  }, [streamBaseUrl, selectedQuality]);

  // --- GAPLESS PRELOAD: the next track is fully set up (manifest + first seconds) on the standby <audio>; a song change just swaps elements ---
  const teardownPreload = () => {
    const p = preloadRef.current; preloadRef.current = null;
    if (p) { try { p.hls?.destroy(); } catch (e) {} try { p.el.removeAttribute('src'); p.el.load(); } catch (e) {} }
  };
  const startPreload = async (trackId: string, baseUrl: string, url: string) => {
    if (preloadRef.current && preloadRef.current.trackId === trackId && preloadRef.current.url === url) return;
    teardownPreload();
    const el = standbyRef.current;
    if (!el) return;
    try {
      if (url.includes('.m3u8')) {
        const Hls = await loadHlsJS();
        if (standbyRef.current !== el) return;
        if (Hls.isSupported()) {
          const hls = new Hls(makeHlsConfig(true));
          hls.on(Hls.Events.ERROR, (_: any, d: any) => {
            if (!d?.fatal) return;
            if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          });
          hls.attachMedia(el); hls.loadSource(url);
          preloadRef.current = { trackId, hls, url, baseUrl, el };
        } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
          el.src = url; el.load();
          preloadRef.current = { trackId, hls: null, url, baseUrl, el };
        }
      } else {
        el.src = url; el.load();
        preloadRef.current = { trackId, hls: null, url, baseUrl, el };
      }
    } catch (e) {}
  };
  const activateStandby = (pre: { trackId: string; hls: any; url: string; baseUrl: string; el: HTMLAudioElement }): boolean => {
    const old = audioRef.current, el = pre.el;
    if (!el || el === old) return false;
    const oldHls = hlsRef.current;
    try { old?.pause(); } catch (e) {}
    (audioRef as any).current = el;      // from here on every handler/painter talks to the new element
    standbyRef.current = old;
    hlsRef.current = pre.hls;
    preloadRef.current = null;
    skipLoadUrlRef.current = pre.url;
    try { oldHls?.destroy(); } catch (e) {}
    if (old) { try { old.removeAttribute('src'); old.load(); } catch (e) {} }
    try { el.currentTime = 0; } catch (e) {}
    const d = el.duration;
    if (d > 0 && isFinite(d)) { durationRef.current = d; setDuration(d); }
    setIsAudioBuffering(el.readyState < 3);
    if (isPlayingRef.current) { const p = el.play(); if (p !== undefined) p.catch(() => {}); } // instant start, no waiting for React effects
    return true;
  };

  // --- NEXT-TRACK PRELOADER (stream URL + info + artwork + gapless buffer → near-instant song change) ---
  const nextTrack = upcomingQueue && upcomingQueue.length > 0 ? upcomingQueue[0] : null;
  const nextTrackId = nextTrack ? (nextTrack.track_id || nextTrack.id || nextTrack.entity_id) : null;
  useEffect(() => {
    if (!currentSong || !nextTrack || !nextTrackId) { teardownPreload(); return; }
    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        try { const im = new Image(); im.src = getImageUrl(nextTrack); } catch (e) {}
        let sj = await getCache(`gaana_stream_${nextTrackId}`);
        if (!sj && !nextTrack.prefetchedStreamBaseUrl) {
          const r = await fetchProtected(`https://ayushmobileappmusicgaaana.vercel.app/api/stream?id=${nextTrackId}`, { referrerPolicy: "no-referrer" });
          if (r.ok) {
            sj = await r.json();
            await setCache(`gaana_stream_${nextTrackId}`, (sj?.success && sj?.hls_url) ? sj : { notFound: true });
          }
        }
        if (cancelled) return;
        const hlsUrl = nextTrack.prefetchedStreamBaseUrl || sj?.hls_url;
        if (hlsUrl) {
          const finalUrl = qualityUrl(hlsUrl, selectedQuality);
          warmOrigin(finalUrl);
          if (!isShuffle && !isVideoModeRef.current) startPreload(String(nextTrackId), hlsUrl, finalUrl);
        }
        const info = await getCache(`gaana_info_${nextTrackId}`);
        if (!info && !cancelled) {
          const ir = await fetchProtected(`https://gaanaayush.wonder945177.workers.dev/api/superserch/track/info?track_id=${nextTrackId}`, { referrerPolicy: "no-referrer" });
          if (ir.ok) {
            const ij = await ir.json();
            await setCache(`gaana_info_${nextTrackId}`, ij?.data ? ij : { notFound: true });
          }
        }
      } catch (e) {}
    }, 1200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [currentSong, nextTrackId, selectedQuality, jamStatus, isShuffle]);

  // queue thumbnails: decode the first rows ahead of time so the queue page never pops images in
  useEffect(() => {
    const t = setTimeout(() => { upcomingQueue.slice(0, 14).forEach((tr: any) => { try { const im = new Image(); im.decoding = 'async'; im.src = getThumbUrl(tr); } catch (e) {} }); }, 900);
    return () => clearTimeout(t);
  }, [upcomingQueue]);

  useEffect(() => {
    if (!currentSong) return;
    songStartTrackingRef.current = Date.now();

    if (isSystemSongChangeRef.current) {
        isSystemSongChangeRef.current = false;
        currentTrackRef.current = currentSong;

        setIsCanvasLoaded(false);
        setIsUiHidden(false);

        return;
    }

    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') {
        setCurrentSong(currentTrackRef.current);
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
            const newHist = [trackToSave, ...prev].filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => (t.id||t.track_id) === (v.id||v.track_id)) === i);
            const sliced = newHist.slice(0, 20); localStorage.setItem('recent_songs', JSON.stringify(sliced)); return sliced;
          });
      }
      isNavigatingBackRef.current = false;
    }
    currentTrackRef.current = currentSong; maxListenRef.current = 0;

    // ---- GAPLESS FAST PATH: the next track is already buffered on the standby element → swap, no network, no manifest ----
    const preSwap = preloadRef.current;
    let fastSwapped = false;
    if (preSwap && preSwap.trackId === String(trackId) && !isVideoModeRef.current && !(jamRoleRef.current === 'guest' && jamStatus === 'connected')) {
      fastSwapped = activateStandby(preSwap);
    }

    setYtVideoId(currentSong.ytVideoId || null);
    setSpotifyId(null); setSpotifyUrl(null); setLyrics([]); setSyncType(null); setCanvasData(null);
    setIsCanvasLoaded(false); setCanvasFailed(false); setActiveLyricIndex(-1); setIsScrolledPastMain(false); setIsUiHidden(false);
    setSongDetails(null); prefetchedYtIdRef.current = currentSong.ytVideoId || null; setIsLyricsFullScreen(false);
    iframeInitialTimeRef.current = 0;
    bufferedRef.current = 0;
    paintProgress(0, 0, true);
    if (fastSwapped && preSwap) {
      setStreamBaseUrl(preSwap.baseUrl); // → quality effect sets the (already loaded) url; audio effect skips the reload
    } else {
      teardownPreload();
      setStreamBaseUrl(null);
      // Stop the previous track immediately so there is no overlap while the new stream resolves
      setAudioUrl("");
      if (audioRef.current && !isVideoModeRef.current) { try { audioRef.current.pause(); } catch (e) {} }
    }

    let sDetails: any = null;
    let skipSpotifyLyrics = false;

    // --- STREAM FETCH TASK: PREFETCHED URL FIRST FOR INSTANT PLAYBACK ---
    const fetchStreamTask = async () => {
        setIsStreamLoading(true);
        try {
            if (currentSong.prefetchedStreamBaseUrl) {
                const url = currentSong.prefetchedStreamBaseUrl;
                const expMatch = url.match(/[~&]exp=(\d+)/);
                const isExpired = expMatch ? Math.floor(Date.now() / 1000) >= parseInt(expMatch[1], 10) - 60 : false;
                if (!isExpired) {
                    setStreamBaseUrl(url);
                    setIsStreamLoading(false);
                    return;
                }
            }

            let streamJson = await getCache(`gaana_stream_${trackId}`);
            if (!streamJson) {
                const streamRes = await fetchProtected(`https://ayushmobileappmusicgaaana.vercel.app/api/stream?id=${trackId}`, { referrerPolicy: "no-referrer", signal });
                if (streamRes.ok) {
                    streamJson = await streamRes.json();
                    if (streamJson?.success && streamJson?.hls_url) await setCache(`gaana_stream_${trackId}`, streamJson);
                    else await setCache(`gaana_stream_${trackId}`, { notFound: true });
                }
            }
            if (!isCurrent || signal.aborted || streamJson?.notFound) return;
            if (streamJson?.hls_url) setStreamBaseUrl(streamJson.hls_url);
            else if (streamJson?.data?.hlsUrl) setStreamBaseUrl(streamJson.data.hlsUrl);
            else if (streamJson?.data?.url) setAudioUrl(streamJson.data.url);
            else if (streamJson?.url) setAudioUrl(streamJson.url);
        } catch (e: any) { } finally {
            if (isCurrent) setIsStreamLoading(false);
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
                    const parsed: any[] = [];
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
                   if (isCanvasEnabledRef.current && !(navigator as any).connection?.saveData && dataJson.data?.canvas?.canvasesList?.length > 0) {
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

        // 1) Audio first — nothing may delay it (skipped when the buffered next track was swapped in)
        if (!fastSwapped) fetchStreamTask();
        // 2) Everything else fires in parallel immediately (no artificial delay)
        const infoPromise = fetchInfoTask();
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

        // Only wait for the info task when Gaana lyrics must be known before deciding to skip Spotify lyrics
        if ((localStorage.getItem('lyrics_server') || "Spotify") === "Gaana") await infoPromise;

        if (!isCurrent || signal.aborted) return;

        await triggerSpotifyFallback(sDetails || currentSong, skipSpotifyLyrics);

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
  }, [currentSong]);

  useEffect(() => {
    if (queue && queue.length > 0) {
      if (queue.length === 1 && (queue[0].id||queue[0].track_id) === (currentSong?.id||currentSong?.track_id)) setUpcomingQueue([]);
      else {
        const idx = queue.findIndex((s: any) => (s.id||s.track_id) === (currentSong?.id||currentSong?.track_id));
        if (idx !== -1) setUpcomingQueue(queue.slice(idx + 1));
      }
    }
  }, [queue]);

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'YTP_TIME' && isVideoMode) {
        videoStartTimeRef.current = e.data.time;
        paintProgress(e.data.time, e.data.duration || duration);
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
  }, [isVideoMode, duration, upcomingQueue, isExpanded]);

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
    if (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.Plugins.MediaSession) {
        (window as any).Capacitor.Plugins.MediaSession.setPlaybackState({ playbackState: newState ? 'playing' : 'paused' });
    }

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
        const curT = videoStartTimeRef.current || currentTime;
        const safeTime = (audioDur > 0 && curT > audioDur) ? audioDur - 2 : curT;
        audioRef.current.currentTime = safeTime; setCurrentTime(safeTime);
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) playPromise.catch(()=>setJamPlayBlocked(true));
        setIsPlaying(true);
      }
      setTimeout(() => broadcastFullSync(), 500);
      return;
    }
    iframeInitialTimeRef.current = Math.floor(audioRef.current?.currentTime ?? currentTime);
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

    setTimeout(() => broadcastFullSync(), 500);
  };

  // --- DICTIONARY PALETTE EXTRACTION (cached per artwork, cancel-safe) ---
  useEffect(() => {
    if (!displayImage || displayImage.includes('via.placeholder.com')) {
      setPalette(DEFAULT_PALETTE); return;
    }
    const cachedPalette = paletteCacheRef.current.get(displayImage);
    if (cachedPalette) { setPalette(cachedPalette); return; }

    let cancelled = false;
    const img = new Image(); img.crossOrigin = "Anonymous";
    img.src = `https://wsrv.nl/?url=${encodeURIComponent(displayImage)}&w=64&h=64&output=jpg`;
    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return;
      try {
        ctx.drawImage(img, 0, 0, 64, 64);
        const result = extractPalette(ctx.getImageData(0, 0, 64, 64).data) || DEFAULT_PALETTE;
        const cache = paletteCacheRef.current;
        cache.set(displayImage, result);
        if (cache.size > 40) { const firstKey = cache.keys().next().value; if (firstKey) cache.delete(firstKey); }
        setPalette(result);
      } catch (e) { setPalette(DARK_FALLBACK_PALETTE); }
    };
    img.onerror = () => { if (!cancelled) setPalette(DEFAULT_PALETTE); };
    return () => { cancelled = true; };
  }, [displayImage]);

  useEffect(() => {
    if (audioRef.current && audioUrl && !audioUrl.includes('.m3u8')) {
      audioRef.current.volume = volume / 100;
    }
  }, [isPlaying, audioUrl, volume, isVideoMode]);

  const playNext = (e?: any) => {
    const isAutoPlay = e === true;
    if (jamRoleRef.current === 'guest' && jamStatus === 'connected') return;

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
      const prevSong = historyQueue[0]; setHistoryQueue(prev => prev.slice(1)); setUpcomingQueue(prev => [currentSong, ...prev]);
      setCurrentSong(prevSong); setIsPlaying(true);
    } else {
      if (!queue || queue.length === 0) return;
      const idx = queue.findIndex((s: any) => (s.id||s.track_id) === (currentSong.id||currentSong.track_id));
      if (idx > 0) { isNavigatingBackRef.current = true; setCurrentSong(queue[idx - 1]); setIsPlaying(true); }
    }
  };

  useEffect(() => { playNextRef.current = playNext; playPrevRef.current = playPrev; isVideoModeRef.current = isVideoMode; }, [playNext, playPrev, isVideoMode]);

  // --- NATIVE MEDIA SESSION ENGINE ---
  const activeTrackIdRef = useRef<string | null>(null);

  const forceNativeState = useCallback((state: 'playing' | 'paused') => {
      if ('mediaSession' in navigator) {
          try { navigator.mediaSession.playbackState = state; } catch(e) {}
      }
      if (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.Plugins.MediaSession) {
          try { (window as any).Capacitor.Plugins.MediaSession.setPlaybackState({ playbackState: state }); } catch(e) {}
      }
  }, []);

  const syncPosition = useCallback(async () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      const c = audioRef.current.currentTime;
      const safeDuration = (!d || isNaN(d) || d <= 0) ? 100 : d;
      const safePosition = (!c || isNaN(c) || c < 0) ? 0 : c;

      if ('mediaSession' in navigator) {
         try { navigator.mediaSession.setPositionState({ duration: safeDuration, playbackRate: 1, position: safePosition }); } catch(e) {}
      }
      if (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.Plugins.MediaSession) {
         try {
             await (window as any).Capacitor.Plugins.MediaSession.setPositionState({ position: safePosition, duration: safeDuration, playbackRate: 1 });
         } catch(e) {}
      }
    }
  }, []);

  useEffect(() => {
    const trackId = currentSong?.id || currentSong?.track_id || displayTitle;
    const artworkArray = displayImage ? [{ src: displayImage, sizes: '512x512', type: 'image/jpeg' }] : [];
    const isNewTrack = displayTitle && activeTrackIdRef.current !== trackId;

    const updateNativeMetadata = async () => {
        if (!isNewTrack) return;
        activeTrackIdRef.current = trackId;

        if (audioRef.current) audioRef.current.currentTime = 0;

        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({ title: displayTitle, artist: displayArtists, album: playContext?.name || 'App', artwork: artworkArray });
                navigator.mediaSession.setPositionState({ duration: 100, playbackRate: 1, position: 0 });
            } catch (e) {}
        }

        if (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.Plugins.MediaSession) {
            const NativeSession = (window as any).Capacitor.Plugins.MediaSession;
            try {
                await NativeSession.setMetadata({ title: displayTitle, artist: displayArtists, album: playContext?.name || 'App', artwork: artworkArray });
                await NativeSession.setPlaybackState({ playbackState: isPlaying ? 'playing' : 'paused' });
                await NativeSession.setPositionState({ position: 0, duration: 100, playbackRate: 1 });
            } catch(e) {}
        }
    };

    updateNativeMetadata();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayTitle, displayArtists, displayImage, playContext]);

  useEffect(() => {
     if ('mediaSession' in navigator) {
         navigator.mediaSession.setActionHandler('play', () => {
            setIsPlaying(true);
            if (isVideoModeRef.current && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_PLAY' }, '*');
            else if (audioRef.current) { const p = audioRef.current.play(); if (p !== undefined) p.catch(()=>{}); }
         });
         navigator.mediaSession.setActionHandler('pause', () => {
            setIsPlaying(false);
            if (isVideoModeRef.current && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_PAUSE' }, '*');
            else if (audioRef.current) audioRef.current.pause();
         });
         navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current());
         navigator.mediaSession.setActionHandler('nexttrack', () => playNextRef.current());
         navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined && audioRef.current) {
                audioRef.current.currentTime = details.seekTime;
                setCurrentTime(details.seekTime);
                if ('mediaSession' in navigator) {
                   try { navigator.mediaSession.setPositionState({ duration: audioRef.current.duration, playbackRate: 1, position: details.seekTime }); } catch(e) {}
                }
                if (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.Plugins.MediaSession) {
                   (window as any).Capacitor.Plugins.MediaSession.setPositionState({ position: details.seekTime, duration: audioRef.current.duration, playbackRate: 1 });
                }
            }
         });
     }

     if (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.Plugins.MediaSession) {
         const NativeSession = (window as any).Capacitor.Plugins.MediaSession;

         NativeSession.setActionHandler({ action: 'play' }, () => {
            setIsPlaying(true);
            if (isVideoModeRef.current && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_PLAY' }, '*');
            else if (audioRef.current) { const p = audioRef.current.play(); if (p !== undefined) p.catch(()=>{}); }
         });

         NativeSession.setActionHandler({ action: 'pause' }, () => {
            setIsPlaying(false);
            if (isVideoModeRef.current && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_PAUSE' }, '*');
            else if (audioRef.current) audioRef.current.pause();
         });

         NativeSession.setActionHandler({ action: 'previoustrack' }, () => playPrevRef.current());
         NativeSession.setActionHandler({ action: 'nexttrack' }, () => playNextRef.current());

         NativeSession.setActionHandler({ action: 'seekto' }, (details: any) => {
            if (details && details.seekTime !== undefined && audioRef.current) {
                audioRef.current.currentTime = details.seekTime;
                setCurrentTime(details.seekTime);
                NativeSession.setPositionState({ position: details.seekTime, duration: audioRef.current.duration, playbackRate: 1 });
            }
         });
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastMetadataId = useRef("");

  useEffect(() => {
    if (displayTitle) {
       const currentSignature = `${displayTitle}-${displayImage}`;

       if (lastMetadataId.current === currentSignature) return;
       lastMetadataId.current = currentSignature;

       const artworkArray = displayImage ? [{ src: displayImage, sizes: '512x512', type: 'image/jpeg' }] : [];

       if ('mediaSession' in navigator) {
           try {
               navigator.mediaSession.metadata = new MediaMetadata({
                   title: displayTitle, artist: displayArtists, album: playContext?.name || 'App', artwork: artworkArray
               });
               navigator.mediaSession.setPositionState({ duration: 0, playbackRate: 1, position: 0 });
           } catch (e) {}
       }

       if (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.Plugins.MediaSession) {
           (window as any).Capacitor.Plugins.MediaSession.setMetadata({
               title: displayTitle, artist: displayArtists, album: playContext?.name || 'App', artwork: artworkArray
           });
           (window as any).Capacitor.Plugins.MediaSession.setPositionState({ position: 0, duration: 0, playbackRate: 1 });
       }
    }
  }, [displayTitle, displayArtists, displayImage, playContext]);

  useEffect(() => {
    const state = isPlaying ? 'playing' : 'paused';

    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = state;
    }
    if (typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.Plugins.MediaSession) {
        (window as any).Capacitor.Plugins.MediaSession.setPlaybackState({ playbackState: state });
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || isVideoMode) return;
    const c = a.currentTime; const d = a.duration;

    if (a.buffered.length > 0 && d > 0) bufferedRef.current = (a.buffered.end(a.buffered.length - 1) / d) * 100;
    paintProgress(c, d || 0, !isPlayingRef.current);

    // fallback for hidden tabs / paused seeks (while playing the frame clock below drives the line index)
    if (isLyricsEnabled && syncType === "LINE_SYNCED" && displayLyrics.length > 0 && !isSeekingRef.current) {
      setLyricIdx(findActiveIdx(displayLyrics, c + LYRIC_LEAD));
    }

    const cp = d > 0 ? (c / d) * 100 : 0;
    if (cp > maxListenRef.current) maxListenRef.current = cp;

    // React state is touched at most ~1×/s and only when something visible actually needs it
    const now = Date.now();
    if (now - lastTimeUpdateRef.current < 1000) return;
    lastTimeUpdateRef.current = now;

    if (d > 0 && Math.abs(d - durationRef.current) > 0.5) { durationRef.current = d; setDuration(d); }

    if (cp >= 98 && !hasCachedCurrentSongRef.current && audioUrl && !audioUrl.startsWith('blob:') && !audioUrl.includes('.m3u8')) {
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

    if (c > 0 && Math.abs(c - (parseFloat(localStorage.getItem('last_session_time')||'0'))) > 2) localStorage.setItem('last_session_time', c.toString());
  };

  // --- ONE FRAME CLOCK (while playing): progress bars + exact lyric-line changes, direct DOM / store only ---
  lyricClockRef.current = { lines: displayLyrics, on: isLyricsEnabled && syncType === "LINE_SYNCED" && displayLyrics.length > 0 };
  useEffect(() => {
    if (!isPlaying || isVideoMode) return;
    let raf = 0;
    const loop = () => {
      const a = audioRef.current;
      if (a && a.duration > 0 && !isSeekingRef.current) {
        paintProgress(a.currentTime, a.duration);
        const L = lyricClockRef.current;
        if (L.on) {
          const t = a.currentTime + LYRIC_LEAD, i = getLyricIdx(), lines = L.lines;
          const curT = i >= 0 ? (lines[i]?.time ?? -Infinity) : -Infinity;
          const nxtT = lines[i + 1]?.time ?? Infinity;
          if (t < curT || t >= nxtT) setLyricIdx(findActiveIdx(lines, t)); // cheap compare each frame; binary search only on change
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, isVideoMode, paintProgress]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrolled = e.currentTarget.scrollTop > 100;
    if (scrolled !== isScrolledPastMain) setIsScrolledPastMain(scrolled);
  }, [isScrolledPastMain]);

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
    paintProgress(newTime, duration, true);
    if (isLyricsEnabled && syncType === "LINE_SYNCED" && displayLyrics.length > 0) setLyricIdx(findActiveIdx(displayLyrics, newTime + LYRIC_LEAD));
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
            item.style.zIndex = '50'; item.style.transition = 'none'; item.style.backgroundColor = 'rgba(255,255,255,0.12)'; item.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
        } else {
            let t = 0;
            if (activeIndex < i && targetIndex >= i) t = -60; else if (activeIndex > i && targetIndex <= i) t = 60;
            item.style.transform = t !== 0 ? `translateY(${t}px)` : 'none';
            item.style.zIndex = '1'; item.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'; item.style.backgroundColor = 'transparent'; item.style.boxShadow = 'none';
        }
    });
  }, [upcomingQueue.length]);

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
  }, [updateDOM]);

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
          const arr = [...prev]; const [moved] = arr.splice(activeIndex, 1); arr.splice(targetIndex, 0, moved);
          if ((jamRoleRef.current === 'host' || jamRoleRef.current === 'admin') && jamStatus === 'connected' && ablyChannelRef.current) {
              ablyChannelRef.current.publish('sync', { type: 'QUEUE_UPDATE', senderId: clientIdRef.current, payload: { queue: arr } });
          }
          return arr;
      });
    }
    dragRef.current.activeIndex = -1; setDragActiveIndex(null);
  }, [jamStatus]);

  useEffect(() => {
    if (dragActiveIndex !== null) {
       window.addEventListener('touchmove', handleDragMove, { passive: false }); window.addEventListener('touchend', handleDragEnd);
       window.addEventListener('mousemove', handleDragMove); window.addEventListener('mouseup', handleDragEnd);
       return () => { window.removeEventListener('touchmove', handleDragMove); window.removeEventListener('touchend', handleDragEnd); window.removeEventListener('mousemove', handleDragMove); window.removeEventListener('mouseup', handleDragEnd); };
    }
  }, [dragActiveIndex, handleDragMove, handleDragEnd]);

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

  // ===================== DOWNLOADS =====================
  const executeBlobDownload = async (url: string, filename: string, isVideoMux: boolean = false) => {
    try {
      setDlState(prev => ({ ...prev, status: "downloading", progress: 0, phase: undefined, packStep: "Downloading video…" }));
      const res = await fetch(url, { referrerPolicy: "no-referrer" });
      const contentLength = res.headers.get('content-length');
      const total = parseInt(contentLength || '0', 10);
      let loaded = 0;

      if (!res.body) throw new Error("No body stream");
      const reader = res.body.getReader();
      const chunks = [];

      while(true) {
         const {done, value} = await reader.read();
         if (done) break;
         chunks.push(value);
         loaded += value.length;
         if (total) setDlState(prev => ({ ...prev, progress: Math.round((loaded/total)*100) }));
      }

      if (isVideoMux) { setDlState(prev => ({ ...prev, status: "merging", packStep: "Merging…" })); await new Promise(r => setTimeout(r, 2800)); }

      const blob = new Blob(chunks);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = decodeEntities(filename);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState(prev => ({ ...prev, status: "done", progress: 100, packStep: "Saved to your device" }));
      setTimeout(() => setDlState(prev => (prev.type === 'video' && prev.status === 'done') ? { type: null, status: "idle" } : prev), 3200);
    } catch (e) {
      const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.download = decodeEntities(filename);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDlState({ type: null, status: "idle" });
    }
  };

  const downloadLrcFile = () => {
    if (!displayLyrics || displayLyrics.length === 0 || syncType !== "LINE_SYNCED") return false;

    const cleanTitle = decodeEntities(displayTitle);
    const cleanArtist = packArtists(decodeEntities(displayArtists));
    const cleanAlbum = decodeEntities(songDetails?.album_title || displayTitle);
    const lenStr = formatTime(duration > 0 ? duration : (Number(songDetails?.duration) || 0));

    let lrcContent = `[ar:${cleanArtist}]\n[al:${cleanAlbum}]\n[ti:${cleanTitle}]\n[au:${cleanArtist}]\n[length:${lenStr}]\n`;

    displayLyrics.forEach((line: any) => {
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

  const closeDownloadModal = () => { setDlState({ type: null, status: "idle" }); };

  const showToast = (m: string) => { setDlToast(m); setTimeout(() => setDlToast(prev => (prev === m ? null : prev)), 2600); };

  // Adds the current song to the BACKGROUND queue (captures all metadata now, so the player can move on freely)
  const queueMusicDownload = (opt: any) => {
    const trackId = String(currentSong?.track_id || currentSong?.id || currentSong?.entity_id || displayTitle);
    const urlQ = String(opt.url).match(/\/(\d+)\.mp4/);
    const num = parseInt(urlQ ? urlQ[1] : String(opt.num || ''), 10) || 192;
    const includeLrc = dlIncludeLrc && syncType === "LINE_SYNCED" && displayLyrics.length > 0;
    const composer = Array.isArray(songDetails?.composers) ? songDetails.composers.map((c: any) => c?.name).filter(Boolean).slice(0, 3).join(', ') : '';
    const ok = dlEnqueue({
      trackId,
      title: cleanMeta(decodeEntities(displayTitle)) || 'Unknown Title',
      artists: packArtists(cleanMeta(decodeEntities(displayArtists))),
      album: cleanMeta(decodeEntities(songDetails?.album_title || displayTitle)) || 'Unknown Album',
      composer: cleanMeta(decodeEntities(composer)),
      year: songDetails?.release_date ? String(songDetails.release_date).split('-')[0] : '',
      genre: cleanMeta(decodeEntities(songDetails?.tags?.[0]?.tag_name || '')),
      image: displayImage || '',
      url: opt.url,
      label: opt.label || `${num}kbps`,
      num,
      duration: Number(songDetails?.duration) || (duration > 0 ? duration : 0),
      includeLrc,
    });
    if (ok && includeLrc) downloadLrcFile(); // inside the tap gesture → never blocked
    setDlState({ type: null, status: "idle" });
    showToast(ok ? 'Added to downloads' : 'Already in your download queue');
  };

  const handleDownloadMusicInit = async () => {
      setShowSettingsMenu(false);
      setDlState({ type: "music", status: "loading" }); // sheet slides in immediately, options fill in right after
      setTimeout(() => warmEncoder(), 1500); // encoder warm-up never competes with the animation
      let opts: any[] = [];
      const durSecs = duration > 0 ? duration : (Number(songDetails?.duration) || 0);

      if (streamBaseUrl) {['16', '64', '128', '320'].forEach(q => {
              let sizeStr = "";
              if (durSecs > 0) {
                  const bitrate = parseInt(q);
                  const sizeMB = (durSecs * bitrate) / 8 / 1024;
                  sizeStr = `${sizeMB.toFixed(1)} MB`;
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
                         sStr = `${sizeMB.toFixed(1)} MB`;
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
        const mixed = data.VideoWithAudio || [];
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
  const showTinyBanner = ((canvasMode && !isLyricsFullScreen) || isVideoMode || isLyricsFullScreen);

  const songDnaArtists = useMemo(() => {
    if (!songDetails) return [];
    const map = new Map();
    const addRole = (arr: any[], roleName: string) => {
        if (!Array.isArray(arr)) return;
        arr.forEach(artist => {
            if (!artist || !artist.name) return;
            const key = artist.seokey || artist.id || artist.name;
            if (map.has(key)) {
                if (!map.get(key).roles.includes(roleName)) map.get(key).roles.push(roleName);
            } else {
                map.set(key, { ...artist, roles: [roleName] });
            }
        });
    };
    addRole(songDetails.singers, "Singer");
    addRole(songDetails.composers, "Composer");
    addRole(songDetails.lyricist, "Lyricist");
    addRole(songDetails.cast, "Cast");
    return Array.from(map.values());
  }, [songDetails]);

  // --- QUEUE ANALYSIS ---
  const queueStats = useMemo(() => {
    const n = upcomingQueue.length;
    let totalSecs = 0;
    const artistMap = new Map<string, number>();
    const langMap = new Map<string, number>();
    upcomingQueue.forEach((t: any) => {
        if (!t) return;
        totalSecs += Number(t.duration) || 0;
        getArtistsText(t).split(',').map((a: string) => a.trim()).filter((a: string) => a && a !== 'Unknown Artist').forEach((a: string) => {
            artistMap.set(a, (artistMap.get(a) || 0) + 1);
        });
        const lang = typeof t.language === 'string' ? t.language.trim() : '';
        if (lang) langMap.set(lang, (langMap.get(lang) || 0) + 1);
    });
    const topArtists = Array.from(artistMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topLangs = Array.from(langMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { n, totalSecs, uniqueArtists: artistMap.size, topArtists, topLangs, maxArtistCount: topArtists[0]?.[1] || 1 };
  }, [upcomingQueue]);

  // stable seek callback so memoised lyric rows never re-render
  const handleLyricClickRef = useRef<(t: number) => void>(() => {});
  handleLyricClickRef.current = handleLyricClick;
  const onLyricSeek = useCallback((t: number) => handleLyricClickRef.current(t), []);

  const RenderedQueue = useMemo(() => {
    return upcomingQueue.map((track: any, index: number) => {
      const isSelected = selectedQueueItems.includes(index);
      const trackDur = Number(track.duration) || 0;
      return (
        <div key={(track.id||track.track_id||track.entity_id) + index} data-index={index} className={`queue-item flex items-center justify-between w-full group h-[60px] p-2 rounded-xl cursor-pointer relative bg-transparent hover:bg-white/[0.06]`}>
          {isQueueEditMode && (
            <div className="flex-shrink-0 mr-3 pl-1" onClick={(e) => {
               e.stopPropagation();
               setSelectedQueueItems(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
            }}>
               <div className={`w-[22px] h-[22px] rounded-full border-[2px] flex items-center justify-center transition-colors ${isSelected ? 'border-transparent' : 'border-white/40'}`} style={isSelected ? { background: palette.accent } : undefined}>
                  {isSelected && <Check size={14} className="text-black stroke-[3px]" />}
               </div>
            </div>
          )}

          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0" onClick={() => {
             if(isQueueEditMode) { setSelectedQueueItems(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); return; }
             if (jamRoleRef.current === 'guest' && jamStatus === 'connected') return;

             localActionTimeRef.current = Date.now();
             setCurrentSong(track); setUpcomingQueue((prev: any) => prev.filter((_: any, i: number) => i !== index)); setIsPlaying(true);
          }}>
            <div className="w-[44px] h-[44px] flex-shrink-0 rounded-[8px] bg-[#282828] overflow-hidden shadow-md"><img draggable={false} loading={index < 14 ? 'eager' : 'lazy'} decoding="async" src={getThumbUrl(track) || "https://via.placeholder.com/150"} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" /></div>
            <div className="flex flex-col min-w-0 pr-2 overflow-hidden"><span className="text-[15px] font-bold text-white truncate">{decodeEntities(track.track_title || track.title || track.name)}</span><span className="text-[13px] font-medium text-white/60 truncate">{decodeEntities(getArtistsText(track))}</span></div>
          </div>

          {!isQueueEditMode && (
             <div className="flex items-center flex-shrink-0">
               {trackDur > 0 && <span className="text-[11px] font-semibold text-white/35 tabular-nums">{formatTime(trackDur)}</span>}
               <div className={`px-3 py-2 text-white/50 touch-none ${isGuestLocked ? 'opacity-20 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`} onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, index); }}><Menu size={20} /></div>
             </div>
          )}
        </div>
      );
    });
  }, [upcomingQueue, selectedQueueItems, isQueueEditMode, setCurrentSong, setUpcomingQueue, setIsPlaying, isGuestLocked, jamStatus, palette.accent]);

  const formatSleepTimerStr = (secs: number) => { const m = Math.floor(secs / 60); const s = secs % 60; return `${m}:${s < 10 ? '0' : ''}${s}`; };

  if (!currentSong) return null;

  const accent = palette.accent;
  const hasSyncedLrc = syncType === "LINE_SYNCED" && displayLyrics.length > 0;
  const dlPct = Math.min(100, Math.max(0, Math.round(dlState.progress || 0)));
  const dlPhase = dlState.phase ?? 0;
  // handlers only react to the ACTIVE element (the standby one is silently pre-buffering the next track)
  const onlyActive = (fn: (e: any) => void) => (e: any) => { if (e.currentTarget === audioRef.current) fn(e); };
  const audioProps = {
    preload: 'auto' as const,
    crossOrigin: 'anonymous' as const,
    onEnded: onlyActive(() => playNext(true)),
    onTimeUpdate: onlyActive(() => handleTimeUpdate()),
    onWaiting: onlyActive(() => setIsAudioBuffering(true)),
    onPlaying: onlyActive(() => { setIsAudioBuffering(false); forceNativeState('playing'); syncPosition(); }),
    onPause: onlyActive(() => { forceNativeState('paused'); syncPosition(); }),
    onCanPlay: onlyActive(() => setIsAudioBuffering(false)),
    onSeeked: onlyActive(() => {
      const a = audioRef.current; if (!a) return;
      paintProgress(a.currentTime, a.duration || 0, true);
      if (lyricClockRef.current.on) setLyricIdx(findActiveIdx(lyricClockRef.current.lines, a.currentTime + LYRIC_LEAD));
      window.dispatchEvent(new Event('lyricfx-resync'));
    }),
    onLoadedMetadata: onlyActive(() => {
      const a = audioRef.current;
      const dur = a?.duration || 0; durationRef.current = dur; setDuration(dur);
      if (a && restoreTimeRef.current !== null && restoreTimeRef.current > 0) { a.currentTime = restoreTimeRef.current; setCurrentTime(restoreTimeRef.current); restoreTimeRef.current = null; }
      paintProgress(a?.currentTime || 0, dur, true);
      syncPosition();
    }),
  };
  const lyricFz = getCardFontSizeClass(isLyricsFullScreen);
  const seekableLyrics = syncType === "LINE_SYNCED" && !isVideoMode;
  const fxCardOn = isLyricsEnabled && isExpanded && uiSettled && !isVideoMode; // card + mini animate simultaneously (on-screen check inside); starts after the open animation
  const fxMiniOn = fxCardOn;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        * { -webkit-tap-highlight-color: transparent; }
        .player-root { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: pan-y; }
        img, video, canvas { pointer-events: none; -webkit-touch-callout: none; user-select: none; }
        @keyframes marquee-pp { 0%, 18% { transform: translate3d(0,0,0); } 82%, 100% { transform: translate3d(var(--d, 0px),0,0); } }
        .marquee-pp { animation: marquee-pp var(--t, 8s) ease-in-out infinite alternate; will-change: transform; backface-visibility: hidden; }
        @media (prefers-reduced-motion: reduce) { .marquee-pp { animation: none; } }
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
        .queue-item { transform-origin: center; transition: transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1), background-color 0.2s linear; contain: layout style; }
        .ts-md { text-shadow: 0 1px 8px rgba(0,0,0,0.35); }

        /* open / close: compositor-only (transform + opacity), different curves in/out, layers stay rasterised (no visibility toggling → no pop) */
        .pr-root { contain: layout paint style; will-change: transform; }
        .pr-in  { transition: transform 0.46s cubic-bezier(0.22,1,0.36,1), opacity 0.2s linear; }
        .pr-out { transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s linear 0.04s; }
        .sheet-scrim.scrim-in  { transition: opacity 0.28s linear; }
        .sheet-scrim.scrim-out { transition: opacity 0.26s linear 0.04s; }
        .sheet-panel { will-change: transform; contain: layout style; }
        .sheet-in  { transition: transform 0.42s cubic-bezier(0.22,1,0.36,1); }
        .sheet-out { transition: transform 0.28s cubic-bezier(0.4,0,0.2,1); }
        .queue-page { will-change: transform; contain: layout paint style; }
        .qp-in  { transition: transform 0.4s cubic-bezier(0.22,1,0.36,1); }
        .qp-out { transition: transform 0.28s cubic-bezier(0.4,0,0.2,1); }
        .bg-fade { transition: background-color 0.7s linear; }
        .cv-fade { transition: opacity 0.7s linear; }
        .cv-video { transform: translateZ(0); backface-visibility: hidden; }

        /* Lyrics fx: per-ROW bright overlay, feathered mask (soft glowing edge), moved only by transforms */
        .lw-fx { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; transition: opacity 0.6s ease-out; }
        .lw-row {
          position: absolute; overflow: hidden; pointer-events: none; will-change: transform; backface-visibility: hidden;
          -webkit-mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - var(--f)), rgba(0,0,0,0.86) calc(100% - var(--f) * 0.78), rgba(0,0,0,0.58) calc(100% - var(--f) * 0.5), rgba(0,0,0,0.26) calc(100% - var(--f) * 0.25), rgba(0,0,0,0.07) calc(100% - var(--f) * 0.08), transparent 100%);
                  mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - var(--f)), rgba(0,0,0,0.86) calc(100% - var(--f) * 0.78), rgba(0,0,0,0.58) calc(100% - var(--f) * 0.5), rgba(0,0,0,0.26) calc(100% - var(--f) * 0.25), rgba(0,0,0,0.07) calc(100% - var(--f) * 0.08), transparent 100%);
        }
        .lw-row-in {
          position: absolute; white-space: normal; will-change: transform; backface-visibility: hidden;
          color: var(--lw-on, #ffffff); text-shadow: 0 0 0.42em var(--lw-glow, rgba(255,255,255,0.45)), 0 0 1.05em var(--lw-glow, rgba(255,255,255,0.45));
        }
        .lyric-scroller { overscroll-behavior: contain; contain: layout paint style; -webkit-overflow-scrolling: touch; scroll-behavior: auto; }

        @keyframes spin-buffer { 100% { transform: rotate(360deg); } }
        @keyframes eq-dance { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        .eq-bar { animation: eq-dance 0.9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .eq-bar { animation: none; transform: scaleY(0.6); } }

        @keyframes dl-shimmer { 100% { transform: translateX(100%); } }
        .dl-shimmer { position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); animation: dl-shimmer 1.4s linear infinite; }
        @keyframes dl-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
        .dl-pop { animation: dl-pop 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        @media (prefers-reduced-motion: reduce) { .dl-shimmer, .dl-pop { animation: none; } }

        .spotify-spinner {
            position: absolute;
            inset: -3px;
            border-radius: 50%;
            background: conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,1) 100%);
            -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2.5px));
            mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2.5px));
            animation: spin-buffer 1s linear infinite;
        }

        .spotify-spinner-mini {
            position: absolute;
            inset: -3px;
            border-radius: 50%;
            background: conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,1) 100%);
            -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 1.5px));
            mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 1.5px));
            animation: spin-buffer 1s linear infinite;
        }
      `}} />

      <audio ref={setAudioA} {...audioProps} />
      <audio ref={setAudioB} {...audioProps} />

      <div className={`player-root pr-root fixed inset-0 z-[99999] text-white overflow-hidden ${isExpanded ? "translate-y-0 opacity-100 pr-in" : "translate-y-full opacity-0 pointer-events-none pr-out"}`}>

        {canvasMode && !isScrolledPastMain && !showQueue && !isLyricsFullScreen && (
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setIsUiHidden(!isUiHidden)} />
        )}
        <div className={`absolute inset-0 z-0 pointer-events-none bg-fade`} style={{ backgroundColor: dominantColor, backgroundImage: isLyricsFullScreen ? 'none' : `radial-gradient(120% 55% at 50% 0%, ${palette.glow} 0%, transparent 65%), linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)` }} />

        {canvasMode && isExpanded && (
          <div className={`absolute inset-0 z-0 bg-transparent pointer-events-none cv-fade ${!isScrolledPastMain && !showQueue && !isLyricsFullScreen ? 'opacity-100' : 'opacity-0'}`}>
            <CanvasVideo url={canvasData.canvasUrl} poster={displayImage} load={uiSettled && pageVisible} play={isPlaying && uiSettled && pageVisible && !isScrolledPastMain && !showQueue && !isLyricsFullScreen} onFail={() => setCanvasFailed(true)} />
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 transition-opacity duration-500 ${isUiHidden ? 'opacity-0' : 'opacity-100'}`} />
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 transition-opacity duration-500 ${isUiHidden ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        )}

        <div className={`absolute inset-0 z-20 overflow-x-hidden scrollbar-hide flex flex-col pointer-events-none ${isLyricsFullScreen ? 'overflow-y-hidden' : 'overflow-y-auto'}`} onScroll={handleScroll}>

          <div className="w-full flex flex-col flex-shrink-0 pointer-events-auto transition-[max-height,height,min-height,width,opacity,transform,margin,padding] duration-500" style={{ height: isLyricsFullScreen ? '100%' : undefined, minHeight: isLyricsFullScreen ? '100%' : '100dvh' }}>

            <div className={`flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex-shrink-0 w-full ${isLyricsFullScreen ? 'mt-0' : 'mt-4'}`}>
              <button onClick={() => { if (isLyricsFullScreen) setIsLyricsFullScreen(false); else closeMainPlayer(); }} className="p-2 -ml-2 text-white active:opacity-50 ts-md pointer-events-auto" aria-label="Close player"><IcChevronDown size={28} /></button>
              <div className="flex flex-col items-center flex-1 min-w-0 px-2 ts-md no-select-text">
                <span className="text-[10px] tracking-widest text-white/70 uppercase truncate w-full text-center font-medium">Playing from {displayContext?.type || 'App'}</span>
                <span className="text-[13px] font-bold text-white truncate w-full text-center mt-[2px]">{decodeEntities(displayContext?.name || 'Gaana Selection')}</span>
              </div>
              <button onClick={openSettings} className="p-2 -mr-2 text-white active:opacity-50 ts-md pointer-events-auto" aria-label="Settings"><IcMore size={24} /></button>
            </div>

            <div className={`flex-1 min-h-0 w-full flex items-center justify-center relative z-30 transition-[max-height,height,min-height,width,opacity,transform,margin,padding] duration-500 ${isLyricsFullScreen ? 'px-0 py-0 flex-col items-stretch justify-start' : (isVideoMode ? 'px-4 py-2' : 'px-8 py-2')}`}>
              {isLyricsFullScreen && isLyricsEnabled ? (
                <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden pointer-events-auto transition-colors duration-700 bg-transparent">
                  <LyricList lines={displayLyrics} containerRef={fullLyricsContainerRef} mode="center" scrollActive={isExpanded} fxOn={fxCardOn} fz={lyricFz} sync={isWordSyncEnabled} seekable={seekableLyrics} onSeek={onLyricSeek}
                    cActive={palette.active} cPast={palette.past} cUp={palette.upcoming} cGlow={palette.glow} isPlaying={isPlaying} buffering={isAudioBuffering} audioRef={audioRef}
                    className="flex-1 overflow-y-auto scrollbar-hide lyric-scroller px-6 pt-4 pb-[30vh] flex flex-col gap-8 w-full h-full mask-edges-vertical"
                    header={displayLyrics.length > 0 && (syncType !== "LINE_SYNCED" || isVideoMode) ? (<div className="flex items-center gap-3 mb-2 px-1 opacity-70"><span className="px-2.5 py-[3px] bg-white/20 rounded text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">Unsynced</span></div>) : null} />
                </div>
              ) : isVideoMode && ytVideoId ? (
                <div className="w-full aspect-video max-w-[600px] max-h-[50vh] relative bg-black shadow-[0_15px_40px_rgba(0,0,0,0.5)] rounded-[12px] transition-[max-height,height,min-height,width,opacity,transform,margin,padding] duration-500 overflow-hidden mx-auto pointer-events-auto" style={{ transform: 'translateZ(0)' }}>
                  <iframe referrerPolicy="no-referrer" ref={videoIframeRef} src={`https://ayushcom.vercel.app/?vid=${ytVideoId}&t=${iframeInitialTimeRef.current}`} style={{ width: "100%", height: "100%", border: "none", pointerEvents: 'auto', borderRadius: '12px' }} allow="autoplay; fullscreen; picture-in-picture" />
                </div>
              ) : (
                <div className={`relative bg-[#282828] rounded-[8px] shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-[transform,opacity,background-color,color,border-color] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${canvasMode ? 'opacity-0 scale-75 pointer-events-none hidden' : 'opacity-100 scale-100 block'}`} style={{ width: '100%', aspectRatio: '1/1', maxWidth: '380px', maxHeight: '50vh', boxShadow: `0 18px 42px -12px ${palette.glow}` }}>
                  {displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />}
                </div>
              )}
            </div>

            <div className={`w-full px-5 pt-2 flex flex-col justify-end flex-shrink-0 transition-[max-height,height,min-height,width,opacity,transform,margin,padding] duration-500 pointer-events-auto ${isLyricsFullScreen ? 'mb-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]' : (isCanvasActive ? 'mb-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]' : 'mb-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]')}`}>

              <div className={`transition-[max-height,height,min-height,width,opacity,transform,margin,padding] duration-500 w-full relative overflow-hidden flex items-center justify-start mask-edges-vertical ${isUiHidden && !isVideoMode ? 'max-h-0 opacity-0 mb-0' : (isLyricsFullScreen ? 'hidden' : 'mb-3 opacity-100 min-h-[75px]')}`}>
                {isLyricsEnabled && !isLyricsFullScreen && syncType === "LINE_SYNCED" && displayLyrics.length > 0 && !isVideoMode && (
                  <MiniLyrics lines={displayLyrics} fz={getLineFontSize()} sync={isMiniWordSyncEnabled} fxOn={fxMiniOn} cActive={palette.active} cPast={palette.past} cGlow={palette.glow} isPlaying={isPlaying} buffering={isAudioBuffering} audioRef={audioRef} />
                )}
              </div>

              <div className={`transition-[max-height,height,min-height,width,opacity,transform,margin,padding] duration-500 flex items-center justify-between ts-md w-full no-select-text ${isLyricsFullScreen ? 'mb-2 scale-[0.8] origin-bottom-left' : (isCanvasActive ? 'mb-3' : 'mb-5')}`}>
                <div className="flex items-center gap-3 overflow-hidden pr-4 flex-1 min-w-0 w-full max-w-full">
                  {showTinyBanner && displayImage && !isLyricsFullScreen && (<img draggable={false} src={displayImage} className="w-[48px] h-[48px] rounded-md shadow-md flex-shrink-0 no-select pointer-events-none" alt="tiny cover" />)}
                  <div className="flex flex-col flex-1 min-w-0 w-full overflow-hidden">
                    <MarqueeText text={displayTitle} className="text-[22px] font-bold text-white tracking-tight ts-md w-full" />
                    <MarqueeText text={displayArtists} className="text-[15px] font-medium text-[#b3b3b3] mt-1 ts-md w-full" />
                  </div>
                </div>
                {!isLyricsFullScreen && <button onClick={handleLikeClick} className="flex-shrink-0 ml-2 active:scale-75 transition-transform pointer-events-auto" aria-label={isSongLiked ? "Unlike" : "Like"}><IcHeart size={28} filled={isSongLiked} className="text-white" /></button>}
              </div>

              <div className={`w-full flex flex-col gap-1 relative ts-md ${isLyricsFullScreen ? 'mb-2 scale-[0.95] origin-bottom' : (isCanvasActive ? 'mb-3' : 'mb-5')}`}>
                <input ref={sliderRef} type="range" min="0" max="100" step="any" defaultValue={0} onChange={handleSeekChange} onPointerDown={handleSeekStart} onPointerUp={handleSeekEnd} onTouchStart={handleSeekStart} onTouchEnd={handleSeekEnd} className={`w-full mobile-slider relative z-10 ${isGuestLocked ? 'pointer-events-none opacity-80' : 'pointer-events-auto'}`} />
                <div className="flex items-center justify-between text-[11px] font-medium text-[#a7a7a7] mt-1 w-full pointer-events-none no-select-text"><span ref={curTimeRef}>0:00</span><span>{formatTime(duration)}</span></div>
              </div>

              {/* Controls: overflow is visible while shown so the buffering ring is never clipped */}
              <div className={`flex flex-col w-full transition-[max-height,opacity,transform] duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isUiHidden && !isVideoMode ? 'max-h-0 opacity-0 translate-y-6 pointer-events-none overflow-hidden' : (isLyricsFullScreen ? 'max-h-[130px] opacity-100 translate-y-0 pointer-events-auto scale-[0.85] origin-bottom overflow-visible' : 'max-h-[160px] opacity-100 translate-y-0 pointer-events-auto overflow-visible')}`}>
                <div className={`flex items-center justify-between w-full px-1 py-1.5 ts-md no-select-text ${isLyricsFullScreen ? 'mb-0' : (isCanvasActive ? 'mb-2' : 'mb-4')}`}>
                  <button onClick={() => { localActionTimeRef.current = Date.now(); setIsShuffle(!isShuffle); if(isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*'); }} className={`active:opacity-50 pointer-events-auto ${isShuffle ? 'text-[#1db954]' : 'text-white'}`} aria-label="Shuffle"><IcShuffle size={24} /></button>
                  <button onClick={playPrev} className={`text-white active:opacity-50 pointer-events-auto ${isGuestLocked ? 'opacity-30' : ''}`} aria-label="Previous"><IcPrev size={38} /></button>

                  <div className="relative flex items-center justify-center">
                      {isBuffering && <div className="spotify-spinner pointer-events-none z-0" />}
                      <button ref={nextBtnRef} onClick={handlePlayPauseToggle} aria-label={isPlaying ? "Pause" : "Play"} className={`w-[64px] h-[64px] rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-transform shadow-lg relative z-10 ${isGuestLocked ? 'pointer-events-none opacity-80' : 'pointer-events-auto'}`}>
                         {isPlaying ? <IcPause size={28} /> : <IcPlay size={30} className="translate-x-[1px]" />}
                      </button>
                  </div>

                  <button id="next-song-btn" onClick={() => playNext()} className={`text-white active:opacity-50 pointer-events-auto ${isGuestLocked ? 'opacity-30' : ''}`} aria-label="Next"><IcNext size={38} /></button>
                  <button onClick={() => { localActionTimeRef.current = Date.now(); setRepeatMode((prev) => (prev + 1) % 3); if(isVideoMode && videoIframeRef.current?.contentWindow) videoIframeRef.current.contentWindow.postMessage({ type: 'MUSIC_HIDE_UI' }, '*'); }} className={`active:opacity-50 relative pointer-events-auto ${repeatMode > 0 ? 'text-[#1db954]' : 'text-white/70'}`} aria-label="Repeat"><IcRepeat size={24} />{repeatMode === 2 && <span className="absolute -top-1 -right-1 bg-[#1db954] text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">1</span>}</button>
                </div>
                {!isLyricsFullScreen ? (
                  <div className={`flex items-center justify-between text-[#b3b3b3] w-full px-1 ts-md pointer-events-auto ${isCanvasActive ? 'mt-2 mb-1' : ''}`}>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleVideoMode} className={`active:opacity-50 transition-colors ${isVideoMode ? 'text-[#1db954]' : 'text-[#b3b3b3]'} ${isGuestLocked ? 'pointer-events-none opacity-50' : ''}`} aria-label="Video mode">{isVideoLoading ? <Loader2 size={20} className="animate-spin" /> : <IcScreen size={22} />}</button>
                        <button onClick={(e) => { e.stopPropagation(); setShowJamMenu(true); }} className={`active:opacity-50 transition-colors ${jamStatus === 'connected' ? 'text-[#1db954]' : 'text-[#b3b3b3]'}`} aria-label="Jim Jam">
                            <IcJam size={22} className={jamStatus === 'connected' ? "animate-pulse" : ""} />
                        </button>
                    </div>
                    <div className="flex items-center gap-6">
                        {jamStatus === 'connected' && (
                            <button onClick={(e) => { e.stopPropagation(); setShowChat(!showChat); }} className={`active:opacity-50 relative transition-colors ${showChat ? 'text-[#1db954]' : 'text-white/80'}`} aria-label="Chat">
                                {isChatEnabled ? <IcChat size={22} /> : <IcChatOff size={22} className="opacity-50" />}
                            </button>
                        )}
                        <button onClick={openQueue} className="active:opacity-50 text-white" aria-label="Queue"><IcQueue size={22} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full px-1 ts-md pointer-events-auto mt-3">
                      <button onClick={cycleLyricsLang} className="flex items-center gap-2 p-2 px-5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white active:scale-95">
                          <IcLang size={18} className={isTransliterating ? "animate-pulse text-[#1db954]" : "text-white/80"} />
                          <span className="text-[12px] font-bold uppercase tracking-wider">
                              {lyricsLang === 'original' ? 'Original Lyrics' : lyricsLang === 'hi' ? 'Hindi Lyrics' : 'English Lyrics'}
                          </span>
                          {isTransliterating && <Loader2 size={14} className="animate-spin ml-1 text-[#1db954]" />}
                      </button>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className={`w-full px-5 pb-24 flex flex-col gap-6 pointer-events-auto transition-opacity duration-500 ${isUiHidden && !isVideoMode ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isLyricsFullScreen ? 'hidden' : 'block'}`}>
            {isLyricsEnabled && displayLyrics.length > 0 && !isLyricsFullScreen && (
              <div className="rounded-3xl p-6 w-full mx-auto shadow-lg relative overflow-hidden transition-colors duration-500 border border-white/10" style={{ background: `linear-gradient(165deg, ${palette.cards.lyrics[0]} 0%, ${palette.cards.lyrics[1]} 100%)` }}>
                <div className="absolute -top-16 -right-16 w-52 h-52 pointer-events-none" style={{ background: `radial-gradient(closest-side, ${palette.glow}, transparent)` }} />
                <div className="relative z-10 flex items-center justify-between mb-6 sticky top-0 bg-transparent no-select-text">
                   <h3 className="text-white font-bold text-[18px] flex items-center">
                     Lyrics
                     {(syncType !== "LINE_SYNCED" || isVideoMode) && <span className="ml-3 px-2 py-[2px] bg-white/20 rounded text-[9px] font-bold text-white uppercase tracking-wider border border-white/10">Unsynced</span>}
                   </h3>
                   <div className="flex items-center gap-3">
                     <button onClick={cycleLyricsLang} className="flex items-center gap-1.5 p-1.5 px-3 text-white/80 hover:text-white rounded-full bg-black/30 pointer-events-auto transition-colors">
                        <IcLang size={15} className={isTransliterating ? "animate-pulse text-[#1db954]" : ""} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                           {lyricsLang === 'original' ? 'Orig' : lyricsLang === 'hi' ? 'Hin' : 'Eng'}
                        </span>
                        {isTransliterating && <Loader2 size={10} className="animate-spin text-[#1db954]" />}
                     </button>
                     <button onClick={() => setIsLyricsFullScreen(true)} className="p-2 text-white/80 hover:text-white rounded-full bg-black/30 pointer-events-auto" aria-label="Fullscreen lyrics"><IcExpand size={16} /></button>
                   </div>
                </div>
                <LyricList lines={displayLyrics} containerRef={lyricsContainerRef} mode="top" scrollActive={isExpanded} fxOn={fxCardOn} fz={lyricFz} sync={isWordSyncEnabled} seekable={seekableLyrics} onSeek={onLyricSeek}
                  cActive={palette.active} cPast={palette.past} cUp={palette.upcoming} cGlow={palette.glow} isPlaying={isPlaying} buffering={isAudioBuffering} audioRef={audioRef}
                  className="relative z-10 flex flex-col gap-5 max-h-[300px] overflow-y-auto scrollbar-hide lyric-scroller pb-10" />
              </div>
            )}

            {songDnaArtists.length > 0 && (
                <div className="w-full mt-2 rounded-3xl p-5 border border-white/10 relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${palette.cards.dna[0]} 0%, ${palette.cards.dna[1]} 100%)` }}>
                    <div className="absolute -bottom-20 -left-16 w-56 h-56 pointer-events-none opacity-60" style={{ background: `radial-gradient(closest-side, ${palette.glow}, transparent)` }} />
                    <div className="relative z-10 flex items-center justify-between mb-5 no-select-text">
                        <h3 className="text-white font-extrabold text-[18px] ts-md flex items-center gap-2">
                            <Sparkles size={18} style={{ color: palette.accent }} /> Song DNA
                        </h3>
                        <span className="text-white/55 text-[12px] font-semibold">{songDnaArtists.length} {songDnaArtists.length === 1 ? 'credit' : 'credits'}</span>
                    </div>
                    <div className={`relative z-10 flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 px-1 pointer-events-auto ${songDnaArtists.length <= 3 ? 'justify-center' : 'justify-start'}`}>
                        {songDnaArtists.map((artist: any, idx: number) => (
                            <SongDnaCard key={artist.seokey || artist.id || idx} artist={artist} closePlayer={closePlayerForNavigation} isFew={songDnaArtists.length <= 3} baseHue={palette.hue} baseSat={palette.sat} />
                        ))}
                    </div>
                </div>
            )}

            {songDetails?.album_title && (
              <Link prefetch={false} href={albumRoute} onClick={closePlayerForNavigation} className="w-full mt-1 rounded-3xl p-4 flex items-center gap-4 transition-transform active:scale-[0.99] border border-white/10 shadow-xl relative overflow-hidden group no-select-text pointer-events-auto" style={{ background: `linear-gradient(120deg, ${palette.cards.album[0]} 0%, ${palette.cards.album[1]} 100%)` }}>
                {displayImage && <img draggable={false} src={displayImage} className="w-[64px] h-[64px] rounded-xl object-cover relative z-10 shadow-md border border-white/5 group-hover:scale-105 transition-transform no-select pointer-events-none" alt="Album Cover" />}
                <div className="flex flex-col relative z-10 flex-1 pr-2 min-w-0"><span className="text-white/60 text-[11px] font-bold mb-1 ts-md">From the album</span><span className="text-white font-bold text-[16px] line-clamp-1 ts-md">{decodeEntities(songDetails.album_title)}</span></div><div className="relative z-10 text-white/50 group-hover:text-white transition-colors pl-2"><IcChevronDown size={20} className="-rotate-90" /></div>
              </Link>
            )}

            {songDetails && (
              <div className="w-full mt-1 rounded-3xl p-5 flex flex-col gap-5 border border-white/10 shadow-lg relative overflow-hidden no-select-text" style={{ background: `linear-gradient(160deg, ${palette.cards.about[0]} 0%, ${palette.cards.about[1]} 100%)` }}>
                <div className="absolute -top-24 -right-20 w-72 h-72 pointer-events-none" style={{ background: `radial-gradient(closest-side, ${palette.glow}, transparent)` }} />

                <div className="relative z-10 flex items-center gap-3">
                  {displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-[52px] h-[52px] rounded-xl object-cover shadow-lg border border-white/10 no-select pointer-events-none" />}
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-white font-extrabold text-[18px] leading-tight ts-md flex items-center gap-2"><Sparkles size={17} style={{ color: palette.accent }} /> About this track</h3>
                    <span className="text-white/55 text-[12px] font-medium truncate">{displayTitle}</span>
                  </div>
                </div>

                {songDetails.popularity && (
                  <div className="relative z-10 flex flex-col gap-3 p-4 rounded-2xl bg-black/25 border border-white/[0.07]">
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-white/50 text-[11px] font-semibold flex items-center gap-1.5"><Hash size={13} style={{ color: palette.accent }} /> Play count</span>
                        <span className="text-white font-black text-[30px] tracking-tight leading-none mt-1">{Number(songDetails.popularity).toLocaleString('en-US')}</span>
                      </div>
                    </div>
                    <div className="w-full h-[6px] rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${popularityPct(Number(songDetails.popularity))}%`, background: `linear-gradient(to right, ${palette.accent}, #ffffff)` }} />
                    </div>
                  </div>
                )}

                <div className="relative z-10 grid grid-cols-2 gap-3">
                  {songDetails.duration && <StatTile icon={<Clock size={17} />} label="Duration" value={formatTime(Number(songDetails.duration))} accent="#8cc2ff" />}
                  {songDetails.release_date && <StatTile icon={<Calendar size={17} />} label="Released" value={songDetails.release_date} accent="#fcd462" />}
                  {songDetails.language && <StatTile icon={<Globe size={17} />} label="Language" value={songDetails.language} accent="#f9a8d4" capitalize />}
                  {songDetails.vendor && <StatTile icon={<Disc3 size={17} />} label="Label" value={decodeEntities(songDetails.vendor)} accent="#5df08f" wide />}
                </div>

                {Array.isArray(songDetails.tags) && songDetails.tags.length > 0 && (
                  <div className="relative z-10 flex flex-wrap gap-2">
                    {songDetails.tags.slice(0, 6).filter((t: any) => t?.tag_name).map((t: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/85 text-[12px] font-semibold">
                        <Tag size={11} style={{ color: palette.accent }} />{decodeEntities(t.tag_name)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- LIVE CHAT OVERLAY --- */}
        {showChat && (
            <div className="absolute bottom-[80px] right-5 z-[100] w-[320px] max-w-[calc(100vw-40px)] flex flex-col overflow-hidden transition-[transform,opacity,background-color,color,border-color] duration-300 origin-bottom-right scale-100 opacity-100 h-[400px] max-h-[50vh] bg-[#000000]/92 border border-white/10 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.7)] pointer-events-auto">
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
            <div className="absolute inset-0 z-[100020] bg-black/80 flex items-center justify-center p-6 pointer-events-auto" onClick={() => setJamError(null)}>
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
          <div className="absolute inset-0 z-[100010] bg-black/60 flex items-center justify-center p-6 pointer-events-auto" onClick={() => setShowJamMenu(false)}>
             <div className="w-full max-w-sm bg-[#0a0a0a]/95 border border-white/10 rounded-[32px] p-8 shadow-[0_16px_40px_rgba(0,0,0,0.7)] flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300 origin-center" onClick={e => e.stopPropagation()}>
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

                        <button onClick={createJamRoom} className="w-full py-4 px-4 rounded-2xl bg-[#1db954] text-black font-extrabold text-[15px] hover:bg-[#1ed760] active:scale-[0.98] transition-[transform,opacity,background-color,color,border-color] shadow-[0_10px_30px_rgba(29,185,84,0.3)] flex items-center justify-center gap-3 mt-4">
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
                                    <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" style={{ background: 'radial-gradient(closest-side, rgba(29,185,84,0.3), transparent)' }} />
                                    <p className="text-[#1db954] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 relative z-10">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#1db954] animate-pulse"></span> Live Room
                                    </p>
                                    <p className="text-white font-black text-4xl tracking-[0.2em] ts-md relative z-10 mt-1">{jamRoomId}</p>
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

        {/* --- PREMIUM SETTINGS SHEET --- */}
        <div className={`absolute inset-0 z-[100000] bg-black/65 sheet-scrim flex flex-col justify-end ${showSettingsMenu ? 'opacity-100 pointer-events-auto scrim-in' : 'opacity-0 pointer-events-none scrim-out'}`} onClick={() => setShowSettingsMenu(false)}>
          <div className={`w-full rounded-t-[32px] sheet-panel shadow-[0_-8px_28px_rgba(0,0,0,0.5)] border-t border-white/10 flex flex-col max-h-[90vh] overflow-hidden relative ${showSettingsMenu ? 'translate-y-0 sheet-in' : 'translate-y-full sheet-out'}`} style={{ background: `linear-gradient(180deg, ${palette.cards.queue[0]} 0%, #0c0c0e 42%)` }} onClick={e => e.stopPropagation()}>
             <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[120%] h-56 pointer-events-none opacity-60" style={{ background: `radial-gradient(closest-side, ${palette.glow}, transparent)` }} />

             <div className="relative z-10 flex flex-col items-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-[5px] rounded-full bg-white/25" />
             </div>

             <div className="relative z-10 flex items-center justify-between px-6 pt-3 pb-4 flex-shrink-0">
                 <h3 className="text-white font-black text-[24px] tracking-tight flex items-center gap-2.5"><Settings2 size={24} style={{ color: accent }} /> Settings</h3>
                 <button onClick={() => setShowSettingsMenu(false)} className="text-white/70 p-2 hover:text-white bg-white/10 rounded-full active:scale-90 transition-transform" aria-label="Close settings"><IcChevronDown size={20} /></button>
             </div>

             <div className="relative z-10 px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] flex flex-col gap-5 overflow-y-auto scrollbar-hide flex-1">
                {/* Now playing card */}
                <div className="flex items-center gap-3 p-3 rounded-3xl border border-white/10" style={{ background: `linear-gradient(120deg, ${palette.cards.lyrics[0]}, rgba(255,255,255,0.04))` }}>
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#282828] flex-shrink-0 shadow-lg">{displayImage && <img src={displayImage} alt="cover" className="w-full h-full object-cover" />}</div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-white/55 text-[10px] font-bold uppercase tracking-widest">Now playing · {palette.name}</span>
                        <span className="text-white font-extrabold text-[16px] truncate">{displayTitle}</span>
                        <span className="text-white/60 text-[12.5px] font-medium truncate">{displayArtists}</span>
                    </div>
                    <EqBars playing={isPlaying} color={accent} />
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Share', icon: <Share2 size={20} />, onClick: handleShareSong },
                      { label: 'Music', icon: <Download size={20} />, onClick: handleDownloadMusicInit },
                      { label: 'Video', icon: <Video size={20} />, onClick: handleDownloadVideoInit },
                    ].map(a => (
                      <button key={a.label} onClick={a.onClick} className="flex flex-col items-center gap-2 py-4 rounded-3xl bg-white/[0.06] border border-white/[0.07] active:scale-95 active:bg-white/10 transition-[transform,opacity,background-color,color,border-color]">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${accent}26`, color: accent }}>{a.icon}</div>
                        <span className="text-white font-bold text-[13px]">{a.label}</span>
                      </button>
                    ))}
                </div>

                {/* Download manager */}
                <button onClick={() => { setShowSettingsMenu(false); setShowDlManager(true); }} className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-3xl bg-white/[0.06] border border-white/[0.07] active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}26`, color: accent }}><Download size={18} /></div><span className="text-white font-bold text-[15px]">Download manager</span></div>
                  <DlCountBadge accent={accent} />
                </button>

                {/* Audio quality */}
                <div className="flex flex-col gap-2.5">
                   <span className="text-white/50 text-[11px] font-bold uppercase tracking-wider pl-2 flex items-center gap-1.5"><Gauge size={13} /> Audio quality</span>
                   <Segmented accent={accent} value={selectedQuality} options={QUALITY_OPTIONS} onChange={(q) => { setSelectedQuality(q); localStorage.setItem('audio_quality', q); restoreTimeRef.current = audioRef.current?.currentTime || 0; setShowSettingsMenu(false); }} />
                </div>

                {/* Lyrics server */}
                <div className="flex flex-col gap-2.5">
                   <span className="text-white/50 text-[11px] font-bold uppercase tracking-wider pl-2 flex items-center gap-1.5"><Server size={13} /> Lyrics server</span>
                   <Segmented accent={accent} value={lyricsServer} options={SERVER_OPTIONS} onChange={(v) => { setLyricsServer(v); localStorage.setItem('lyrics_server', v); setShowSettingsMenu(false); }} />
                </div>

                {/* Lyrics & visuals */}
                <div className="flex flex-col gap-2.5">
                   <span className="text-white/50 text-[11px] font-bold uppercase tracking-wider pl-2 flex items-center gap-1.5"><Type size={13} /> Lyrics &amp; visuals</span>
                   <div className="flex flex-col rounded-3xl bg-white/[0.05] border border-white/[0.07] overflow-hidden">
                      <SettingRow accent={accent} icon={<Type size={18} />} title="Show lyrics" sub="Display lyrics on player" right={<Toggle accent={accent} on={isLyricsEnabled} onClick={() => { setIsLyricsEnabled(!isLyricsEnabled); localStorage.setItem('lyrics_enabled', (!isLyricsEnabled).toString()); }} />} />

                      {isLyricsEnabled && (
                        <div className="flex flex-col gap-4 px-4 py-4 border-b border-white/[0.06] bg-black/20">
                          <div className="flex flex-col gap-2">
                            <span className="text-white/60 text-[12.5px] font-semibold">Mini lyrics size (above title)</span>
                            <Segmented accent={accent} value={lineFontSize} options={SIZE_OPTIONS} onChange={(sz) => { setLineFontSize(sz); localStorage.setItem('line_font_size', sz); }} />
                          </div>
                          <div className="flex flex-col gap-2">
                            <span className="text-white/60 text-[12.5px] font-semibold">Card &amp; fullscreen size</span>
                            <Segmented accent={accent} value={cardFontSize} options={SIZE_OPTIONS} onChange={(sz) => { setCardFontSize(sz); localStorage.setItem('card_font_size', sz); }} />
                          </div>
                        </div>
                      )}

                      <SettingRow accent={accent} icon={<Sparkles size={18} />} title="Word sync (card)" sub="Syncs fullscreen & card lyrics" right={<Toggle accent={accent} on={isWordSyncEnabled} onClick={() => { setIsWordSyncEnabled(!isWordSyncEnabled); localStorage.setItem('word_sync_enabled', (!isWordSyncEnabled).toString()); }} />} />
                      <SettingRow accent={accent} icon={<Sparkles size={18} />} title="Word sync (mini)" sub="Syncs the lyrics above the title" right={<Toggle accent={accent} on={isMiniWordSyncEnabled} onClick={() => { setIsMiniWordSyncEnabled(!isMiniWordSyncEnabled); localStorage.setItem('mini_word_sync_enabled', (!isMiniWordSyncEnabled).toString()); }} />} />
                      <SettingRow last accent={accent} icon={<Film size={18} />} title="Show canvas" sub="Looping artist video backdrop" right={<Toggle accent={accent} on={isCanvasEnabled} onClick={() => { setIsCanvasEnabled(!isCanvasEnabled); localStorage.setItem('canvas_enabled', (!isCanvasEnabled).toString()); }} />} />
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* --- DOWNLOAD SHEET (in-app MP3 packer + video) --- */}
        <div className={`absolute inset-0 z-[100005] bg-black/70 sheet-scrim flex flex-col justify-end ${dlState.type !== null ? 'opacity-100 pointer-events-auto scrim-in' : 'opacity-0 pointer-events-none scrim-out'}`} onClick={closeDownloadModal}>
          <div className={`w-full rounded-t-[32px] border-t border-white/10 shadow-[0_-8px_28px_rgba(0,0,0,0.5)] relative overflow-hidden max-h-[88vh] flex flex-col sheet-panel ${dlState.type !== null ? 'translate-y-0 sheet-in' : 'translate-y-full sheet-out'}`} style={{ background: `linear-gradient(180deg, ${palette.cards.queue[0]} 0%, #0c0c0e 52%)` }} onClick={e => e.stopPropagation()}>
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[120%] h-56 pointer-events-none opacity-60" style={{ background: `radial-gradient(closest-side, ${palette.glow}, transparent)` }} />
            <div className="relative z-10 flex flex-col items-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-[5px] rounded-full bg-white/25" /></div>

            <div className="relative z-10 flex items-center justify-between px-6 pt-2 pb-3 flex-shrink-0">
              <h3 className="text-white font-black text-[22px] tracking-tight flex items-center gap-2.5">
                <Download size={22} style={{ color: accent }} /> {dlState.type === 'video' ? 'Download video' : 'Download MP3'}
              </h3>
              <button onClick={closeDownloadModal} className="text-white/70 p-2 hover:text-white bg-white/10 rounded-full active:scale-90 transition-transform" aria-label="Close download"><X size={18} /></button>
            </div>

            <div className="relative z-10 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] flex flex-col gap-4 overflow-y-auto scrollbar-hide">
              {/* Track card */}
              <div className="flex items-center gap-3.5 p-3 rounded-3xl border border-white/10" style={{ background: `linear-gradient(120deg, ${palette.cards.lyrics[0]}, rgba(255,255,255,0.04))` }}>
                <div className="w-[60px] h-[60px] rounded-2xl overflow-hidden bg-[#282828] flex-shrink-0 shadow-lg">{displayImage && <img src={displayImage} alt="cover" className="w-full h-full object-cover" />}</div>
                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                  <span className="text-white font-extrabold text-[16px] truncate">{displayTitle}</span>
                  <span className="text-white/60 text-[12.5px] font-medium truncate">{dlState.type === 'music' ? packArtists(displayArtists) : displayArtists}</span>
                  {dlState.type === 'music' && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {['MP3', 'ID3 tags', 'Cover art'].map(c => (
                        <span key={c} className="px-2 py-[3px] rounded-full text-[9.5px] font-extrabold uppercase tracking-wider" style={{ background: `${accent}26`, color: accent }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Video: server picker */}
              {dlState.status === 'servers' && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-white/50 text-[11px] font-bold uppercase tracking-wider pl-1">Choose a server</span>
                  {[{ n: 1, sub: 'Standard' }, { n: 2, sub: 'Fast' }].map(s => (
                    <button key={s.n} onClick={() => triggerVideoServer(s.n)} className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.08] active:scale-[0.98] transition-[transform,opacity,background-color,color,border-color] text-left">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}26`, color: accent }}><Server size={20} /></div>
                      <div className="flex flex-col flex-1"><span className="text-white font-extrabold text-[15px]">Server {s.n}</span><span className="text-white/50 text-[12px] font-medium">{s.sub}</span></div>
                    </button>
                  ))}
                </div>
              )}

              {(dlState.status === 'verifying' || dlState.status === 'connecting' || dlState.status === 'merging') && (
                <div className="py-8 flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin" size={34} style={{ color: accent }} />
                  <p className="text-white/70 font-semibold text-sm animate-pulse">
                    {dlState.status === 'verifying' ? 'Verifying you…' : dlState.status === 'connecting' ? `Connecting to Server ${dlState.server}…` : 'Merging video & audio…'}
                  </p>
                </div>
              )}

              {dlState.status === 'loading' && (
                <div className="py-8 flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin" size={30} style={{ color: accent }} />
                  <p className="text-white/60 font-semibold text-sm">Preparing options…</p>
                </div>
              )}

              {/* Quality picker — MP3 */}
              {dlState.status === 'options' && dlState.type === 'music' && (
                <div className="flex flex-col gap-3">
                  <span className="text-white/50 text-[11px] font-bold uppercase tracking-wider pl-1 flex items-center gap-1.5"><Gauge size={13} /> Choose quality</span>
                  {(!dlState.options || dlState.options.length === 0) && (
                    <p className="text-white/55 text-[13px] font-medium text-center py-6">No download source was found for this track.</p>
                  )}
                  <div className="flex flex-col gap-2.5">
                    {dlState.options?.map((opt: any, i: number) => {
                      const best = opt.num >= 320;
                      return (
                        <button key={i} onClick={() => queueMusicDownload(opt)} className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border active:scale-[0.98] transition-[transform,opacity,background-color,color,border-color] text-left" style={{ background: best ? `linear-gradient(120deg, ${accent}30, rgba(255,255,255,0.05))` : 'rgba(255,255,255,0.06)', borderColor: best ? `${accent}66` : 'rgba(255,255,255,0.08)' }}>
                          <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 leading-none" style={{ background: `${accent}26`, color: accent }}>
                            <span className="font-black text-[16px]">{opt.num}</span>
                            <span className="text-[8.5px] font-bold uppercase tracking-wider mt-0.5 opacity-80">kbps</span>
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-white font-extrabold text-[15px] flex items-center gap-2">
                              {opt.label}
                              {best && <span className="px-1.5 py-[2px] rounded-full text-[9px] font-black uppercase tracking-wider text-black" style={{ background: accent }}>Best</span>}
                            </span>
                            <span className="text-white/50 text-[12px] font-medium">MP3{opt.size ? ` · ≈ ${opt.size}` : ''}</span>
                          </div>
                          <Download size={20} style={{ color: accent }} />
                        </button>
                      );
                    })}
                  </div>
                  {hasSyncedLrc && (
                    <div className="rounded-2xl bg-white/[0.05] border border-white/[0.07] overflow-hidden">
                      <SettingRow last accent={accent} icon={<Type size={18} />} title="Include synced lyrics" sub="Also saves a matching .lrc file" right={<Toggle accent={accent} on={dlIncludeLrc} onClick={() => { setDlIncludeLrc(!dlIncludeLrc); localStorage.setItem('dl_include_lrc', (!dlIncludeLrc).toString()); }} />} />
                    </div>
                  )}
                  <p className="text-white/40 text-[11.5px] font-medium text-center leading-snug px-2">Added to a background queue — keep using the app. Encoded on your device with title, up to 3 artists, album, year &amp; cover art.</p>
                </div>
              )}

              {/* Quality picker — video */}
              {dlState.status === 'options' && dlState.type === 'video' && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-white/50 text-[11px] font-bold uppercase tracking-wider pl-1">Choose resolution</span>
                  {(!dlState.options || dlState.options.length === 0) && <p className="text-white/55 text-[13px] font-medium text-center py-6">No video formats available right now.</p>}
                  {dlState.options?.map((opt: any, i: number) => (
                    <button key={i} onClick={() => executeBlobDownload(opt.url, `${displayTitle} - ${displayArtists}_${opt.quality}.mp4`, true)} className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.08] active:scale-[0.98] transition-[transform,opacity,background-color,color,border-color] text-left">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}26`, color: accent }}><Video size={20} /></div>
                      <div className="flex flex-col flex-1 min-w-0"><span className="text-white font-extrabold text-[15px]">{opt.label}</span>{opt.size && <span className="text-white/50 text-[12px] font-medium">{opt.size}</span>}</div>
                      <Download size={20} style={{ color: accent }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Progress */}
              {dlState.status === 'downloading' && (
                <div className="flex flex-col gap-5 py-1">
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="text-white font-black text-[44px] leading-none tabular-nums">{dlPct}<span className="text-[20px] text-white/45 ml-0.5">%</span></span>
                      <span className="text-white/65 text-[13px] font-semibold mt-2 truncate">{dlState.packStep || 'Working…'}</span>
                    </div>
                    {dlState.quality && <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold flex-shrink-0" style={{ background: `${accent}26`, color: accent }}>{dlState.quality}</span>}
                  </div>

                  <div className="relative h-[8px] w-full rounded-full bg-white/10 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out overflow-hidden" style={{ width: `${dlPct}%`, background: `linear-gradient(90deg, ${accent}, ${palette.light})` }}>
                      <div className="dl-shimmer" />
                    </div>
                  </div>

                </div>
              )}

              {/* Done */}
              {dlState.status === 'done' && (
                <div className="py-6 flex flex-col items-center gap-3 text-center">
                  <div className="dl-pop w-[68px] h-[68px] rounded-full flex items-center justify-center" style={{ background: accent, color: '#000', boxShadow: `0 12px 36px ${palette.glow}` }}><Check size={34} className="stroke-[3px]" /></div>
                  <span className="text-white font-black text-[20px]">All done</span>
                  <span className="text-white/55 text-[13px] font-medium">{dlState.packStep || 'Saved to your device'}</span>
                  <button onClick={() => setDlState({ type: null, status: 'idle' })} className="mt-2 w-full py-3.5 rounded-2xl text-black font-extrabold text-[14px] active:scale-[0.98] transition-transform" style={{ background: accent }}>Done</button>
                </div>
              )}

              {/* Error */}
              {dlState.status === 'error' && (
                <div className="py-4 flex flex-col items-center gap-3 text-center">
                  <div className="w-[60px] h-[60px] rounded-full bg-red-500/15 text-red-400 flex items-center justify-center"><AlertTriangle size={28} /></div>
                  <span className="text-white font-black text-[18px]">Download failed</span>
                  <span className="text-white/55 text-[13px] font-medium leading-snug px-2">{dlState.error || 'Something went wrong.'}</span>
                  <div className="flex w-full gap-3 mt-2">
                    <button onClick={() => setDlState({ type: null, status: 'idle' })} className="flex-1 py-3.5 rounded-2xl bg-white/10 active:bg-white/20 text-white font-bold text-[14px] transition-colors">Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showTimerMenu && (
          <div className="absolute inset-0 z-[100010] bg-black/60 flex items-center justify-center p-6 pointer-events-auto" onClick={() => setShowTimerMenu(false)}>
             <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-2 animate-in fade-in zoom-in duration-200 border border-white/10" style={{ background: `linear-gradient(180deg, ${palette.cards.queue[0]} 0%, #151517 70%)` }} onClick={e => e.stopPropagation()}>
                <h4 className="text-white font-bold text-lg mb-2 flex justify-between items-center">Sleep Timer <button onClick={() => setShowTimerMenu(false)} className="text-white/50 hover:text-white"><X size={20}/></button></h4>
                {[5, 15, 30, 45, 60].map(mins => (
                   <button key={mins} onClick={() => { setSleepTimer(mins); setShowTimerMenu(false); }} className={`py-3 px-4 rounded-xl flex justify-between items-center transition-colors ${sleepTimer === mins ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                      <span className="font-medium">{mins} minutes</span>{sleepTimer === mins && <Check size={18} />}
                   </button>
                ))}
                <button onClick={() => { setSleepTimer('end'); setShowTimerMenu(false); }} className={`py-3 px-4 rounded-xl flex justify-between items-center transition-colors ${sleepTimer === 'end' ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                   <span className="font-medium">End of track</span>{sleepTimer === 'end' && <Check size={18} />}
                </button>
                <button onClick={() => { setSleepTimer(null); setShowTimerMenu(false); }} className="py-3 px-4 rounded-xl text-white/50 hover:bg-white/5 text-left mt-2 border border-white/10 transition-colors">
                   Turn off timer
                </button>
             </div>
          </div>
        )}

        {/* --- REDESIGNED QUEUE PAGE --- */}
        <div className={`queue-page absolute inset-0 z-[60] bg-[#09090b] flex flex-col pointer-events-auto overflow-hidden ${showQueue ? 'translate-y-0 qp-in' : 'translate-y-full qp-out'}`}>
          <div className="absolute inset-0 pointer-events-none transition-colors duration-700" style={{ background: `linear-gradient(180deg, ${palette.cards.queue[0]} 0%, ${palette.cards.queue[1]} 46%, #070708 100%)` }} />
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[150%] h-[380px] pointer-events-none opacity-70" style={{ background: `radial-gradient(closest-side, ${palette.glow}, transparent)` }} />
          <div className="absolute bottom-24 -right-24 w-[300px] h-[300px] pointer-events-none opacity-40" style={{ background: `radial-gradient(closest-side, ${palette.cards.stats[0]}, transparent)` }} />

          <div className="relative z-20 flex items-center justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-3 no-select-text">
            <button onClick={() => { setIsQueueEditMode(false); setShowQueue(false); }} className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full bg-white/10 text-white active:scale-90 transition-transform" aria-label="Close queue"><IcChevronDown size={24} /></button>
            <div className="flex flex-col items-center min-w-0 px-3">
              <span className="text-[16px] font-extrabold text-white tracking-tight">Queue</span>
              <span className="text-[10px] font-bold text-white/55 uppercase tracking-widest truncate max-w-[220px]">{decodeEntities(displayContext?.name || displayContext?.type || 'Now playing')}</span>
            </div>
            {isQueueEditMode ? (
               <button onClick={() => { setIsQueueEditMode(false); setSelectedQueueItems([]); }} className="px-4 py-2 rounded-full text-[13px] font-extrabold text-black active:scale-95 transition-transform" style={{ background: accent }}>Done</button>
            ) : (
               <button onClick={() => setIsQueueEditMode(true)} className="px-4 py-2 rounded-full bg-white/10 text-[13px] font-bold text-white active:scale-95 transition-transform">Edit</button>
            )}
          </div>

          <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-36 no-select-text scrollbar-hide" ref={queueContainerRef}>
            {/* Now playing */}
            <div className="flex items-center justify-between w-full mb-5 p-3.5 rounded-3xl border border-white/[0.12] relative overflow-hidden shadow-lg" style={{ background: `linear-gradient(120deg, ${palette.cards.lyrics[0]} 0%, rgba(255,255,255,0.05) 100%)` }}>
              <div className="flex items-center gap-3.5 overflow-hidden relative z-10 min-w-0">
                <div className="w-16 h-16 flex-shrink-0 rounded-2xl bg-[#282828] overflow-hidden shadow-lg">{displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />}</div>
                <div className="flex flex-col min-w-0 pr-2 overflow-hidden">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest mb-0.5" style={{ color: accent }}>Now playing</span>
                  <span className="text-[17px] font-extrabold text-white truncate">{displayTitle}</span>
                  <span className="text-[13px] font-medium text-white/65 truncate">{displayArtists}</span>
                </div>
              </div>
              <div className="relative z-10 pr-1 flex-shrink-0"><EqBars playing={isPlaying} color={accent} /></div>
              <div className="absolute bottom-0 left-0 h-[3px] w-full bg-white/10"><div ref={queueFillRef} className="h-full w-full origin-left" style={{ transform: 'scaleX(0)', background: `linear-gradient(to right, ${accent}, ${palette.light})` }} /></div>
            </div>

            {/* Queue analysis */}
            {queueStats.n > 0 && (
              <div className="flex flex-col gap-3 mb-6">
                <div className="grid grid-cols-3 gap-2.5">
                  <QueueStat bg={`linear-gradient(145deg, ${palette.cards.stats[0]}, ${palette.cards.stats[1]})`} label="Up next" value={`${queueStats.n} ${queueStats.n === 1 ? 'track' : 'tracks'}`} />
                  <QueueStat bg={`linear-gradient(145deg, ${palette.cards.dna[0]}, ${palette.cards.dna[1]})`} label="Time left" value={formatLongTime(queueStats.totalSecs)} />
                  <QueueStat bg={`linear-gradient(145deg, ${palette.cards.album[0]}, ${palette.cards.album[1]})`} label="Artists" value={String(queueStats.uniqueArtists)} />
                </div>

                {queueStats.topArtists.length > 0 && (
                  <div className="p-4 rounded-3xl border border-white/[0.08] flex flex-col gap-3" style={{ background: `linear-gradient(160deg, ${palette.cards.about[0]}, ${palette.cards.about[1]})` }}>
                    <span className="text-white/70 text-[12px] font-bold">Most in your queue</span>
                    {queueStats.topArtists.map(([name, count]) => (
                      <div key={name} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-white text-[13px] font-semibold truncate">{decodeEntities(name)}</span>
                          <span className="text-white/55 text-[12px] font-semibold tabular-nums flex-shrink-0">{count}</span>
                        </div>
                        <div className="w-full h-[5px] rounded-full bg-black/30 overflow-hidden">
                          <div className="h-full rounded-full transition-[max-height,height,min-height,width,opacity,transform,margin,padding] duration-500" style={{ width: `${(count / queueStats.maxArtistCount) * 100}%`, background: `linear-gradient(to right, ${palette.accent}, ${palette.light})` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {queueStats.topLangs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {queueStats.topLangs.map(([lang, count]) => (
                      <span key={lang} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/10 text-white/85 text-[12px] font-semibold capitalize">
                        <Globe size={11} style={{ color: palette.accent }} />{lang}<span className="text-white/45 font-bold">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <span className="text-[17px] font-extrabold text-white">Next in queue</span>
              {queueStats.n > 0 && <span className="text-[12px] font-semibold text-white/45">{queueStats.n} songs</span>}
            </div>
            {queueStats.n === 0 && <p className="text-white/45 text-[14px] font-medium py-8 text-center">Nothing queued. Add songs to keep the music going.</p>}
            <div className="flex flex-col relative">{RenderedQueue}</div>
          </div>

          {/* Floating glass toolbar */}
          <div className="absolute bottom-0 left-0 w-full z-20 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 no-select-text pointer-events-none">
            <div className="pointer-events-auto rounded-[28px] border border-white/[0.12] bg-black/55 px-5 py-3 flex justify-between items-center shadow-[0_-6px_20px_rgba(0,0,0,0.5)]">
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
                    <span className="text-white/55 text-[12px] font-bold">{selectedQueueItems.length} Selected</span>
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
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer min-w-[56px]" onClick={() => { localActionTimeRef.current = Date.now(); setIsShuffle(!isShuffle); }}><IcShuffle size={22} className={isShuffle ? '' : 'text-white/70'} /><span className="text-[11px] font-semibold" style={{ color: isShuffle ? accent : 'rgba(255,255,255,0.7)' }}>Shuffle</span></div>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer min-w-[56px]" onClick={() => { localActionTimeRef.current = Date.now(); setRepeatMode((prev) => (prev + 1) % 3); }}><div className="relative" style={{ color: repeatMode > 0 ? accent : 'rgba(255,255,255,0.7)' }}><IcRepeat size={22} />{repeatMode === 2 && <span className="absolute -top-1 -right-1 text-black text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center" style={{ background: accent }}>1</span>}</div><span className="text-[11px] font-semibold" style={{ color: repeatMode > 0 ? accent : 'rgba(255,255,255,0.7)' }}>Repeat</span></div>
                    <div className="flex flex-col items-center gap-1 active:opacity-50 cursor-pointer min-w-[56px]" onClick={openTimer}><div style={{ color: sleepTimer ? accent : 'rgba(255,255,255,0.7)' }}><Timer size={22} /></div><span className="text-[11px] font-semibold" style={{ color: sleepTimer ? accent : 'rgba(255,255,255,0.7)' }}>{timerRemaining ? formatSleepTimerStr(timerRemaining) : sleepTimer === 'end' ? 'Track End' : 'Timer'}</span></div>
                </>
            )}
            </div>
          </div>
        </div>
      </div>

      <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={openMainPlayer} className={`fixed bottom-[70px] left-[8px] right-[8px] h-[56px] rounded-[8px] z-[99990] cursor-pointer overflow-hidden transition-[transform,opacity,background-color,color,border-color] duration-[400ms] shadow-md no-select-text ${isExpanded ? 'opacity-0 pointer-events-none translate-y-6 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`} style={{ background: `linear-gradient(100deg, ${palette.base} 0%, ${palette.deep} 100%)`, transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined, transition: swipeX === 0 && !isExpanded ? 'transform 0.4s ease-out, opacity 0.4s' : 'none' }}>
        <div className="absolute inset-0 bg-black/20 z-0 pointer-events-none" />
        <div className="relative z-10 w-full h-full flex items-center px-2">
          <div className="w-[40px] h-[40px] flex-shrink-0 rounded-[5px] shadow-sm overflow-hidden bg-[#282828] relative mr-3">
            {displayImage && <img draggable={false} src={displayImage} alt="cover" className="w-full h-full object-cover no-select pointer-events-none" />}
          </div>
          <div className="flex flex-col flex-1 min-w-0 pr-3 justify-center"><MarqueeText text={displayTitle} className="text-[13px] font-bold text-white leading-tight mb-[2px] w-full" /><MarqueeText text={displayArtists} className="text-[12px] font-medium text-white/70 leading-tight w-full" /></div>
          <div className="flex items-center gap-4 flex-shrink-0 pr-2 text-white">
            <button className="active:scale-75 transition-transform flex items-center justify-center w-[22px] h-[22px]" onClick={(e) => { e.stopPropagation(); setShowJamMenu(true); }} aria-label="Jim Jam"><IcJam size={22} className={jamStatus === 'connected' ? "text-[#1db954]" : ""} /></button>
            <button className="active:scale-75 transition-transform flex items-center justify-center w-[22px] h-[22px]" onClick={toggleVideoMode} aria-label="Video mode"><IcScreen size={22} className={isVideoMode ? "text-[#1db954]" : ""} /></button>

            <button className="active:scale-75 transition-transform flex items-center justify-center w-[26px] h-[26px] relative" onClick={handlePlayPauseToggle} aria-label={isPlaying ? "Pause" : "Play"}>
               {isBuffering && <div className="spotify-spinner-mini pointer-events-none z-0" />}
               {isPlaying ? <IcPause size={26} /> : <IcPlay size={26} className="translate-x-[1px]" />}
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/10 rounded-full z-20 pointer-events-none overflow-hidden">
            <div ref={miniBufRef} className="absolute inset-0 bg-white/40 origin-left" style={{ transform: 'scaleX(0)', willChange: 'transform' }} />
            <div ref={miniFillRef} className="absolute inset-0 bg-white origin-left" style={{ transform: 'scaleX(0)', willChange: 'transform' }} />
        </div>
      </div>
      <DownloadBubble accent={accent} onOpen={() => setShowDlManager(true)} />
      <DownloadManager open={showDlManager} onClose={() => setShowDlManager(false)} accent={accent} bg={palette.cards.queue[0]} glow={palette.glow} />
      {dlToast && (
        <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[100070] px-4 py-2.5 rounded-full bg-black/80 border border-white/10 text-white text-[13px] font-bold shadow-xl flex items-center gap-2 pointer-events-none">
          <Check size={15} style={{ color: accent }} className="stroke-[3px]" /> {dlToast}
        </div>
      )}
    </>
  );
}
