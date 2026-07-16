import { cn } from "@/lib/dashboard-cn";

const gradients = [
  "from-blue-500 to-cyan-400",
  "from-purple-500 to-pink-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-pink-500 to-rose-400",
];

function hashToIndex(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash + input.charCodeAt(i)) % gradients.length;
  return hash;
}

interface AvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-14 w-14 text-base",
};

export function Avatar({ initials, size = "md", className }: AvatarProps) {
  const gradient = gradients[hashToIndex(initials)];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white/10",
        gradient,
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
