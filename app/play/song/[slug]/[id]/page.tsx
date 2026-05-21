import { Metadata } from "next";
import PlaySongClient from "./PlaySongClient";

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  let cleanId = resolvedParams?.id || "";
  
  cleanId = cleanId.split("?")[0].split("&")[0];

  // The default image for fallback and when no song image is available
  const defaultImage = "https://raw.githubusercontent.com/Ayush8481Lab/musicayush/refs/heads/main/app/android-chrome-512x512.png";
  
  try {
    // UPDATED: Using Gaana API directly
    const res = await fetch(`https://apiv2.gaana.com/track/info?track_id=${cleanId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      cache: "no-store" 
    });
    const json = await res.json();
    
    // Gaana returns object directly, status 1 means success
    const song = json;

    if (song && song.status === 1 && song.track_title) {
      
      // 1. EXTRACT ALL ARTISTS (Comma separated) from Gaana 'singers' array
      let artists = "Unknown Artist";
      if (Array.isArray(song.singers) && song.singers.length > 0) {
        artists = song.singers.map((a: any) => a.name).join(", ");
      } else if (Array.isArray(song.cast) && song.cast.length > 0) {
        artists = song.cast.map((a: any) => a.name).join(", ");
      }

      // 2. EXTRACT LANGUAGE AND ALBUM from Gaana response
      const lang = song.language ? song.language.charAt(0).toUpperCase() + song.language.slice(1) : "Unknown";
      const albumName = song.album_title || "Unknown Album";

      // 3. YOUR CUSTOM FORMATTED TITLE AND DESCRIPTION
      const title = `${song.track_title} ● Song  - ${artists} - ● Listen on Music@8481`;
      const description = `Listen to ${song.track_title} on ● ${lang} Music album ● ${albumName} by ${artists} - play or Download only Music@8481 Developed By ● Ayush@8481`;
      
      // Extract highest quality image from Gaana properties and force highest resolution
      let imgUrl = song.artwork_large || song.artwork_web || song.atw || song.artwork || song.album_artwork || defaultImage;
      imgUrl = imgUrl.replace("http://", "https://").replace(/size_[ms]/g, "size_l").replace("150x150", "500x500");

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `https://musicayush.vercel.app/play/song/${slug}/${cleanId}`,
          siteName: "Music@8481",
          images:[{ url: imgUrl, width: 500, height: 500 }],
          type: "music.song",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [imgUrl],
        },
      };
    }
  } catch (error) {
    console.error("Metadata Fetch Error:", error);
  }

  // Fallback if the API fails or only the domain is shared
  return {
    metadataBase: new URL("https://musicayush.vercel.app"),
    title: "Play on Music@8481",
    description: "Listen or Download only on Music@8481 Developed By Ayush@8481",
    openGraph: {
      title: "Play on Music@8481",
      description: "Listen or Download only on Music@8481 Developed By Ayush@8481",
      url: "https://musicayush.vercel.app",
      siteName: "Music@8481",
      images:[{ url: defaultImage, width: 512, height: 512 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Play on Music@8481",
      description: "Listen or Download only on Music@8481 Developed By Ayush@8481",
      images: [defaultImage],
    },
  };
}

export default async function PlaySongPage({ params, searchParams }: any) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <PlaySongClient 
      slug={resolvedParams?.slug} 
      id={resolvedParams?.id} 
      token={resolvedSearchParams?.token} 
      signature={resolvedSearchParams?.signature} 
    />
  );
}
