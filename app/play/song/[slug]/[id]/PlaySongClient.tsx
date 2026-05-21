"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../../../context/AppContext";
import { Loader2 } from "lucide-react";

export default function PlaySongClient({ slug, id, token, signature, initialSongData }: any) {
  const router = useRouter();
  const { setCurrentSong, setIsPlaying, setPlayContext, setQueue } = useAppContext();
  
  const [songDetails, setSongDetails] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // If the server successfully fetched and passed the data, play it immediately!
    if (initialSongData && initialSongData.track_title) {
      
      const song = { ...initialSongData };
      
      // Force Entity Type for Global Player (Ensures app knows it's a song)
      song.type = "TR";
      song.entity_type = "TR";

      // Attach YouTube Token so audio actually plays!
      if (token) song.prefetchedYtId = token;
      if (signature) {
        song.spotifyId = signature;
        song.spotifyUrl = `https://open.spotify.com/track/${signature}`;
      }

      // Visually show the album art on the screen
      setSongDetails(song);

      // Start the Global Player in Context
      setPlayContext({ type: "External Link", name: "Shared Track" });
      setQueue([song]); 
      setCurrentSong(song);
      setIsPlaying(true);

      // Wait 2 seconds for the audio player to register natively, then smoothly redirect home
      setTimeout(() => {
         router.push("/");
      }, 2000);

    } else {
      setErrorMsg("Could not load song details from API. Link might be invalid.");
    }
  }, [initialSongData, token, signature, setCurrentSong, setIsPlaying, setPlayContext, setQueue, router]);

  // Visual Error Feedback
  if (errorMsg) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#121212] gap-4">
        <p className="text-red-500 font-bold text-lg">{errorMsg}</p>
        <button 
          onClick={() => router.push("/")} 
          className="px-6 py-2 bg-[#1db954] text-black rounded-full font-bold hover:scale-105 transition-all"
        >
          Go Home
        </button>
      </div>
    );
  }

  // Helper variable to safely pull the image using Gaana's properties
  let displayImg = "";
  if (songDetails) {
    displayImg = songDetails.artwork_large || songDetails.artwork_web || songDetails.atw || songDetails.artwork || songDetails.album_artwork || "";
    displayImg = displayImg.replace("http://", "https://").replace(/size_[ms]/g, "size_l").replace("150x150", "500x500");
  }

  // Visual Success/Loading Feedback
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#121212] text-white">
      {songDetails ? (
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <img 
            src={displayImg} 
            alt="Album Art" 
            className="w-48 h-48 rounded-2xl shadow-2xl shadow-[#1db954]/20 object-cover"
          />
          <h2 className="text-2xl font-bold text-[#1db954] text-center px-4">
            {songDetails.track_title}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="animate-spin text-white/50" size={20} />
            <p className="text-white/50 text-sm font-medium">Starting player...</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#1db954]" size={48} />
          <p className="text-white/80 font-bold text-lg tracking-wide animate-pulse">
            Fetching Track Data...
          </p>
        </div>
      )}
    </div>
  );
}
