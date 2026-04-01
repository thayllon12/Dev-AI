import React from 'react';
import { cn } from '../lib/utils';

export function AILogo({ className, mode }: { className?: string, mode?: string }) {
  const isThinking = mode === "Thinking";
  const isNano = mode === "Nano Banana";
  const isStudent = mode === "Student";
  const glow = isThinking ? "rgba(239, 68, 68, 0.5)" : isNano ? "rgba(234, 179, 8, 0.5)" : isStudent ? "rgba(34, 197, 94, 0.5)" : "rgba(59, 130, 246, 0.5)";

  return (
    <img
      src="https://instasize.com/api/image/2a217bcf9136b2b83a24523dca3e8226b1e4e7b9af9dd3cbbe6250d741431848.png"
      alt="Dev AI Logo"
      className={cn("w-full h-full object-cover", className)}
      style={{ filter: `drop-shadow(0px 0px 8px ${glow})` }}
      referrerPolicy="no-referrer"
    />
  );
}
