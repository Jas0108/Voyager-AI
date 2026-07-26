import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUsername(user?: { email?: string; username?: string } | null): string {
  if (!user) return "User";
  if (user.username && user.username.trim()) {
    return user.username.trim();
  }
  if (!user.email) return "User";
  const namePart = user.email.split("@")[0];
  // Strip trailing numbers (e.g., "jashith001" -> "jashith")
  const alphaPart = namePart.replace(/\d+$/, "");
  const baseName = alphaPart.length >= 2 ? alphaPart : namePart;
  
  return baseName
    .split(/[\._\-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
