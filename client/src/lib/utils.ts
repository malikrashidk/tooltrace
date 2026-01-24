import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDomainFromUrl(url: string): string | null {
  try {
    if (!url) return null;
    // Handle simple domains like "google.com" that might not have protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(fullUrl);
    return urlObj.hostname;
  } catch (_e) {
    return null;
  }
}

export function getLogoUrl(websiteUrl: string | undefined | null): string | undefined {
  if (!websiteUrl) return undefined;
  const domain = getDomainFromUrl(websiteUrl);
  if (!domain) return undefined;
  // Use Google's favicon service which is very reliable
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
