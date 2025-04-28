import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(firstName, lastName) {
  if (!firstName && !lastName) return "?";
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

export function calculateAverageScore(votes) {
  if (!votes || votes.length === 0) return 0;
  const total = votes.reduce((sum, vote) => sum + vote.score, 0);
  return (total / votes.length).toFixed(2);
}

export function formatTimeLeft(targetTime) {
  if (!targetTime) return "N/A";
  
  const now = new Date();
  const target = new Date(targetTime);
  const diffMs = target - now;
  
  if (diffMs <= 0) return "Ended";
  
  const diffSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(diffSecs / 86400);
  const hours = Math.floor((diffSecs % 86400) / 3600);
  const minutes = Math.floor((diffSecs % 3600) / 60);
  const seconds = diffSecs % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}
