import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_URL || "https://nuvoapp.lovable.app";

export function formatEventDate(dateStr: string, timezone?: string): string {
  const date = parseISO(dateStr);
  return format(date, "EEEE d 'de' MMMM, yyyy", { locale: es });
}

export function formatEventTime(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "h:mm a", { locale: es });
}

export function formatEventDateTime(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "EEE d MMM · h:mm a", { locale: es });
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

export function getShareInviteText(title: string, dateStr: string, guestUrl: string): string {
  const dateFormatted = formatEventDateTime(dateStr);
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
