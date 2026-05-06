"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, Settings } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems =[
    { name: "Home", path: "/", icon: Home },
    { name: "Search", path: "/search", icon: Search },
    { name: "Library", path: "/library", icon: Library },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-[#0B1320]/85 backdrop-blur-xl border-t border-[#1e293b] pb-safe z-50 select-none">
      <div className="flex justify-around items-center px-2 py-1.5">
        {navItems.map((item) => {
          // Check if the current path matches the item path
          const isActive = pathname === item.path;
          
          return (
            <Link 
              href={item.path} 
              key={item.name} 
              prefetch={false} // Prevents automatic background network calls until interacted with
              className={`flex flex-col items-center p-2 transition-all duration-200 active:scale-95 ${
                isActive ? "text-white" : "text-blue-200/50 hover:text-blue-200/80"
              }`}
            >
              <item.icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2} 
                // Filling the SVG when active mimics Spotify's premium icon behavior
                fill={isActive ? "currentColor" : "none"} 
                className="mb-1 transition-all duration-300"
              />
              <span className={`text-[10px] tracking-wide ${isActive ? "font-bold" : "font-medium"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
