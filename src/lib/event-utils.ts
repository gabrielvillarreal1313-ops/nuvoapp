import { resolveEventTimeZone } from "./timezone-utils";

export const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_URL || "https://nuvoapp.lovable.app";

export function formatEventDate(dateStr: string, timezone?: string): string {
  const timeZone = resolveEventTimeZone(timezone);
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatEventTime(dateStr: string, timezone?: string): string {
  const timeZone = resolveEventTimeZone(timezone);
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function formatEventDateTime(dateStr: string, timezone?: string): string {
  const timeZone = resolveEventTimeZone(timezone);
  const dateText = new Intl.DateTimeFormat("es-MX", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(dateStr));
  const timeText = formatEventTime(dateStr, timeZone);
  return `${dateText} · ${timeText}`;
}

export function generateRandomKey(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export function getWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function getShareInviteText(title: string, dateStr: string, guestUrl: string, timezone?: string): string {
  const dateFormatted = formatEventDateTime(dateStr, timezone);
  return `${title} — ${dateFormatted}. RSVP aquí: ${guestUrl}`;
}

export function getShareUpdateText(content: string, guestUrl: string, updateId: string): string {
  const truncated = content.length > 80 ? content.substring(0, 80) + '…' : content;
  return `Update: ${truncated} ${guestUrl}?u=${updateId}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function shareOrCopy(text: string, title?: string): void {
  if (navigator.share) {
    navigator.share({ text, title }).catch(() => {
      copyToClipboard(text);
    });
  } else {
    window.open(getWhatsAppShareUrl(text), '_blank');
  }
}
