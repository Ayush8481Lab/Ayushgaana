"use client";
import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";

const languages = [
  "Hindi", "English", "Punjabi", "Telugu", "Tamil",
  "Bhojpuri", "Bengali", "Malayalam", "Kannada", "Marathi",
  "Gujarati", "Haryanvi", "Urdu", "Assamese", "Rajasthani", "Odia"
];

export default function SettingsPage() {
  const { language, setLanguage } = useAppContext();
  const [mounted, setMounted] = useState(false);

  // Load cached languages when the page mounts
  useEffect(() => {
    setMounted(true);
    const cachedLanguages = localStorage.getItem("preferredLanguages");
    
    // If context language is empty but we have a cache, restore it
    if (cachedLanguages && !language) {
      setLanguage(cachedLanguages);
    }
  }, [language, setLanguage]);

  // Safely parse the comma-separated string into an array of languages
  const selectedLanguages = (language || "").split(",").filter(Boolean);

  // Toggle function for multi-selection & caching
  const toggleLanguage = (lang: string) => {
    let updatedSelection: string[];
    
    if (selectedLanguages.includes(lang)) {
      // Remove language
      updatedSelection = selectedLanguages.filter((l) => l !== lang);
    } else {
      // Add language
      updatedSelection = [...selectedLanguages, lang];
    }
    
    const newLanguageString = updatedSelection.join(",");
    
    // 1. Update Context State
    setLanguage(newLanguageString);
    // 2. Save to Cache
    localStorage.setItem("preferredLanguages", newLanguageString);
  };

  // Prevent UI flickering/hydration errors on Next.js
  if (!mounted) {
    return <div className="min-h-screen bg-[#060B19]" />;
  }

  return (
    <div className="min-h-screen bg-[#060B19] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#112048] via-[#060B19] to-[#040710] p-4 pt-12 pb-24 text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black mb-8 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
          Settings
        </h1>
        
        {/* Premium Glassmorphism Card */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-2xl rounded-[2rem] p-6 md:p-8 shadow-2xl">
          
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-2 tracking-tight text-white">
              What music do you like?
            </h2>
            <p className="text-blue-200/60 text-sm md:text-base font-medium">
              Pick all the languages you want to listen to
            </p>
          </div>

          {/* Languages Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {languages.map((lang) => {
              const isSelected = selectedLanguages.includes(lang);
              
              return (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className={`group relative flex items-center justify-between w-full py-4 px-5 rounded-2xl text-[15px] font-bold transition-all duration-300 ease-out border outline-none ${
                    isSelected
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 border-blue-400/50 text-white shadow-[0_8px_25px_rgba(37,99,235,0.3)] scale-[1.02]"
                      : "bg-white/[0.03] border-white/5 text-blue-100/80 hover:bg-white/[0.06] hover:text-white hover:border-white/10 hover:scale-[1.01]"
                  }`}
                >
                  <span className="tracking-wide">{lang}</span>
                  
                  {/* Premium Checkmark Indicator */}
                  <div 
                    className={`flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-300 ${
                      isSelected 
                        ? "bg-white border-white text-blue-600 scale-100" 
                        : "bg-black/20 border-white/10 text-transparent scale-90 group-hover:border-white/30"
                    }`}
                  >
                    <svg 
                      className={`w-3.5 h-3.5 transition-opacity duration-300 ${isSelected ? "opacity-100" : "opacity-0"}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={3.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
          
        </div>
      </div>
    </div>
  );
}
