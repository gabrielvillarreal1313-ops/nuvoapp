import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function buildHeaders(optionsHeaders?: HeadersInit, includeJson = true): Promise<HeadersInit> {
  const headers = new Headers(optionsHeaders || undefined);

  headers.set('apikey', SUPABASE_KEY);
  if (includeJson) {
    headers.set('Content-Type', 'application/json');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return headers;
}

async function apiFetch(path: string, options: RequestInit = {}, extraParams?: Record<string, string>) {
  const url = new URL(`${SUPABASE_URL}/functions/v1/event-api`);
  url.searchParams.set('path', path);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }

  try {
    const res = await fetch(url.toString(), {
      ...options,
      headers: await buildHeaders(options.headers, options.method !== 'DELETE'),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.message || 'Error de red');
    }
    return res.json();
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Error de conexión. Si estás en el preview de Lovable, prueba en la URL publicada.');
    }
    throw error;
  }
}

function withAdminToken(token?: string): HeadersInit {
  if (!token) return {};
  return { 'x-admin-token': token };
}

export const api = {
  getEvent: (eventKey: string) =>
    apiFetch(`events/${eventKey}`),

  getMyHostedEvents: () =>
    apiFetch('me/hosted-events'),

  createRsvp: (eventKey: string, data: any) =>
    apiFetch(`events/${eventKey}/rsvps`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRsvp: (eventKey: string, rsvpId: string, editToken: string, data: any) =>
    apiFetch(`events/${eventKey}/rsvps/${rsvpId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { et: editToken }),

  deleteRsvp: (eventKey: string, rsvpId: string, editToken: string) =>
    apiFetch(`events/${eventKey}/rsvps/${rsvpId}`, {
      method: 'DELETE',
    }, { et: editToken }),

  createEvent: (data: any) =>
    apiFetch('events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAdminEvent: (eventKey: string, token?: string) =>
    apiFetch(`admin/events/${eventKey}`, {
      headers: withAdminToken(token),
    }),

  updateEvent: (eventKey: string, token: string | undefined, data: any) =>
    apiFetch(`admin/events/${eventKey}`, {
      method: 'PUT',
      headers: withAdminToken(token),
      body: JSON.stringify(data),
    }),

  deleteEvent: (eventKey: string, token?: string) =>
    apiFetch(`admin/events/${eventKey}`, {
      method: 'DELETE',
      headers: withAdminToken(token),
    }),

  createUpdate: (eventKey: string, token: string | undefined, data: any) =>
    apiFetch(`admin/events/${eventKey}/updates`, {
      method: 'POST',
      headers: withAdminToken(token),
      body: JSON.stringify(data),
    }),

  deleteUpdate: (eventKey: string, token: string | undefined, updateId: string) =>
    apiFetch(`admin/events/${eventKey}/updates/${updateId}`, {
      method: 'DELETE',
      headers: withAdminToken(token),
    }),

  approveRsvp: (eventKey: string, token: string | undefined, rsvpId: string) =>
    apiFetch(`admin/events/${eventKey}/rsvps/${rsvpId}/approve`, {
      method: 'POST',
      headers: withAdminToken(token),
    }),

  rejectRsvp: (eventKey: string, token: string | undefined, rsvpId: string) =>
    apiFetch(`admin/events/${eventKey}/rsvps/${rsvpId}/reject`, {
      method: 'POST',
      headers: withAdminToken(token),
    }),

  createCohost: (eventKey: string, token: string | undefined, data: any) =>
    apiFetch(`admin/events/${eventKey}/cohosts`, {
      method: 'POST',
      headers: withAdminToken(token),
      body: JSON.stringify(data),
    }),

  deleteCohost: (eventKey: string, token: string | undefined, tokenId: string) =>
    apiFetch(`admin/events/${eventKey}/cohosts/${tokenId}`, {
      method: 'DELETE',
      headers: withAdminToken(token),
    }),
};
