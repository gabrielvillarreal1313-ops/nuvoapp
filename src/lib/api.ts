const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        ...(options.headers || {}),
      },
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

export const api = {
  getEvent: (eventKey: string) =>
    apiFetch(`events/${eventKey}`),

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

  getAdminEvent: (eventKey: string, token: string) =>
    apiFetch(`admin/events/${eventKey}`, {
      headers: { 'x-admin-token': token },
    }),

  updateEvent: (eventKey: string, token: string, data: any) =>
    apiFetch(`admin/events/${eventKey}`, {
      method: 'PUT',
      headers: { 'x-admin-token': token },
      body: JSON.stringify(data),
    }),

  deleteEvent: (eventKey: string, token: string) =>
    apiFetch(`admin/events/${eventKey}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': token },
    }),

  createUpdate: (eventKey: string, token: string, data: any) =>
    apiFetch(`admin/events/${eventKey}/updates`, {
      method: 'POST',
      headers: { 'x-admin-token': token },
      body: JSON.stringify(data),
    }),

  deleteUpdate: (eventKey: string, token: string, updateId: string) =>
    apiFetch(`admin/events/${eventKey}/updates/${updateId}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': token },
    }),

  approveRsvp: (eventKey: string, token: string, rsvpId: string) =>
    apiFetch(`admin/events/${eventKey}/rsvps/${rsvpId}/approve`, {
      method: 'POST',
      headers: { 'x-admin-token': token },
    }),

  rejectRsvp: (eventKey: string, token: string, rsvpId: string) =>
    apiFetch(`admin/events/${eventKey}/rsvps/${rsvpId}/reject`, {
      method: 'POST',
      headers: { 'x-admin-token': token },
    }),

  createCohost: (eventKey: string, token: string, data: any) =>
    apiFetch(`admin/events/${eventKey}/cohosts`, {
      method: 'POST',
      headers: { 'x-admin-token': token },
      body: JSON.stringify(data),
    }),

  deleteCohost: (eventKey: string, token: string, tokenId: string) =>
    apiFetch(`admin/events/${eventKey}/cohosts/${tokenId}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': token },
    }),
};
