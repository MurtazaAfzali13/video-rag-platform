"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/dashboard-cn";

interface SearchInputProps {
  placeholder?: string;
  className?: string;
}

export function SearchInput({ placeholder = "Search...", className }: SearchInputProps) {
  return (
    <div className={cn("group relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-purple-400" />
      <input
        type="text"
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-white/80",
          "placeholder:text-white/30 outline-none transition-all duration-200",
          "focus:border-purple-500/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-purple-500/20"
        )}
      />
    </div>
  );
}
