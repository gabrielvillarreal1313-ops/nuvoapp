import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token, x-edit-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AuthUser {
  id: string;
}

function genToken(len = 32): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

function genKey(len = 10): string {
  return genToken(len);
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

function getBaseUrl(_req: Request): string {
  return Deno.env.get('PUBLIC_APP_URL') || 'https://nuvoapp.lovable.app';
}

async function getAuthUser(db: any, req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

async function authorizeAdmin(db: any, eventKey: string, token: string, userId?: string | null) {
  const { data: event } = await db
    .from('events')
    .select('id, owner_user_id')
    .eq('event_key', eventKey)
    .is('deleted_at', null)
    .single();
  if (!event) return null;

  if (userId && event.owner_user_id === userId) {
    return { eventId: event.id, role: 'HOST', tokenId: null, via: 'owner' };
  }

  if (!token) return null;

  const { data: adminToken } = await db.from('event_admin_tokens')
    .select('*')
    .eq('event_id', event.id)
    .eq('token', token)
    .is('revoked_at', null)
    .single();

  if (!adminToken) return null;
  return { eventId: event.id, role: adminToken.role, tokenId: adminToken.id, via: 'token' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const db = createClient(supabaseUrl, supabaseKey);
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '';
  const method = req.method;
  const baseUrl = getBaseUrl(req);
  const authUser = await getAuthUser(db, req);

  try {
    // POST /events (create)
    if (path === 'events' && method === 'POST') {
      if (!authUser) return err('Autenticación requerida', 401);

      const body = await req.json();
      if (!body.title || !body.startAt) return err('title y startAt son requeridos');

      const eventKey = genKey();
      const hostToken = genToken();

      const { data: event, error: evErr } = await db.from('events').insert({
        event_key: eventKey,
        title: body.title,
        description: body.description || null,
        host_name: body.hostName || null,
        start_at: body.startAt,
        end_at: body.endAt || null,
        timezone: body.timezone || 'America/Mexico_City',
        location_name: body.locationName || null,
        location_url: body.locationUrl || null,
        address_street: body.addressStreet || null,
        address_ext_number: body.addressExtNumber || null,
        address_int_number: body.addressIntNumber || null,
        address_neighborhood: body.addressNeighborhood || null,
        address_city: body.addressCity || null,
        address_state: body.addressState || null,
        address_zip: body.addressZip || null,
        address_country: body.addressCountry || 'México',
        cover_image_url: body.coverImageUrl || null,
        privacy_mode: body.privacyMode || 'OPEN',
        show_attendees: body.showAttendees !== false,
        rsvp_open: body.rsvpOpen !== false,
        status: 'ACTIVE',
        owner_user_id: authUser.id,
      }).select().single();

      if (evErr) return err(evErr.message, 500);

      await db.from('event_admin_tokens').insert({
        event_id: event.id,
        token: hostToken,
        role: 'HOST',
        label: 'Host principal',
      });

      return json({
        event,
        guestUrl: `${baseUrl}/e/${eventKey}`,
        hostUrl: `${baseUrl}/h/${eventKey}?t=${hostToken}`,
        hostToken,
      });
    }

    // GET /events/:eventKey
    const evMatch = path.match(/^events\/([^/]+)$/);
    if (evMatch && method === 'GET') {
      const eventKey = evMatch[1];
      const { data: event } = await db
        .from('events')
        .select('*')
        .eq('event_key', eventKey)
        .is('deleted_at', null)
        .single();
      if (!event) return err('Evento no encontrado', 404);

      const { data: rsvps } = await db.from('rsvps')
        .select('*')
        .eq('event_id', event.id)
        .is('deleted_at', null)
        .in('approval_status', ['APPROVED']);

      const { data: allRsvps } = await db.from('rsvps')
        .select('id, status, party_size, approval_status')
        .eq('event_id', event.id)
        .is('deleted_at', null);

      const counts = {
        going: 0, maybe: 0, no: 0, totalGuests: 0, pending: 0,
      };
      (allRsvps || []).forEach((r: any) => {
        if (r.approval_status === 'APPROVED') {
          if (r.status === 'GOING') { counts.going++; counts.totalGuests += r.party_size; }
          else if (r.status === 'MAYBE') { counts.maybe++; counts.totalGuests += r.party_size; }
          else if (r.status === 'NO') counts.no++;
        }
        if (r.approval_status === 'PENDING') counts.pending++;
      });

      // Match RSVPs with profile avatars by phone
      const phones = (rsvps || []).map((r: any) => r.phone).filter(Boolean);
      let avatarMap: Record<string, string> = {};
      if (phones.length > 0) {
        const { data: profiles } = await db.from('profiles')
          .select('phone, avatar_url')
          .in('phone', phones)
          .not('avatar_url', 'is', null);
        (profiles || []).forEach((p: any) => {
          if (p.phone && p.avatar_url) avatarMap[p.phone] = p.avatar_url;
        });
      }
      const rsvpsWithAvatars = (rsvps || []).map((r: any) => ({
        ...r,
        avatar_url: r.phone ? avatarMap[r.phone] || null : null,
      }));

      const { data: updates } = await db.from('updates')
        .select('*')
        .eq('event_id', event.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      return json({
        ...event,
        rsvps: event.show_attendees ? rsvpsWithAvatars : [],
        counts,
        updates: updates || [],
      });
    }

    // GET /me/hosted-events
    if (path === 'me/hosted-events' && method === 'GET') {
      if (!authUser) return err('Autenticación requerida', 401);

      const { data, error: hostedErr } = await db.from('events')
        .select('event_key, title, start_at, status, cover_image_url')
        .eq('owner_user_id', authUser.id)
        .is('deleted_at', null)
        .order('start_at', { ascending: true, nullsFirst: false });

      if (hostedErr) return err(hostedErr.message, 500);
      return json({ events: data || [] });
    }

    // POST /events/:eventKey/rsvps
    const rsvpCreate = path.match(/^events\/([^/]+)\/rsvps$/);
    if (rsvpCreate && method === 'POST') {
      const eventKey = rsvpCreate[1];
      const { data: event } = await db
        .from('events')
        .select('*')
        .eq('event_key', eventKey)
        .is('deleted_at', null)
        .single();
      if (!event) return err('Evento no encontrado', 404);
      if (event.status === 'CANCELLED') return err('Evento cancelado');
      if (!event.rsvp_open) return err('RSVP cerrado');

      const body = await req.json();
      if (!body.name?.trim()) return err('Nombre requerido');
      if (!body.phone?.trim()) return err('Número de teléfono requerido');
      if (!['GOING', 'MAYBE', 'NO'].includes(body.status)) return err('Estado inválido');

      const partySize = body.status === 'NO' ? 1 : Math.min(Math.max(body.partySize || 1, 1), 2);
      const comment = body.comment ? body.comment.substring(0, 240) : null;
      const editToken = genToken();
      const approvalStatus = event.privacy_mode === 'APPROVAL_REQUIRED' ? 'PENDING' : 'APPROVED';

      const { data: rsvp, error: rErr } = await db.from('rsvps').insert({
        event_id: event.id,
        name: body.name.trim(),
        phone: body.phone.trim(),
        status: body.status,
        party_size: partySize,
        comment,
        approval_status: approvalStatus,
        edit_token: editToken,
        device_id: body.deviceId || null,
      }).select().single();

      if (rErr) return err(rErr.message, 500);
      return json({ ...rsvp, editToken });
    }

    // PUT /events/:eventKey/rsvps/:rsvpId
    const rsvpUpdate = path.match(/^events\/([^/]+)\/rsvps\/([^/]+)$/);
    if (rsvpUpdate && method === 'PUT') {
      const [, eventKey, rsvpId] = rsvpUpdate;
      const et = url.searchParams.get('et') || req.headers.get('x-edit-token');
      if (!et) return err('Token de edición requerido', 401);

      const { data: event } = await db
        .from('events')
        .select('*')
        .eq('event_key', eventKey)
        .is('deleted_at', null)
        .single();
      if (!event) return err('Evento no encontrado', 404);
      if (event.status === 'CANCELLED') return err('Evento cancelado');
      if (!event.rsvp_open) return err('RSVP cerrado');

      const { data: rsvp } = await db.from('rsvps').select('*').eq('id', rsvpId).eq('edit_token', et).is('deleted_at', null).single();
      if (!rsvp) return err('RSVP no encontrado', 404);

      const body = await req.json();
      const updates: any = {};
      if (body.name?.trim()) updates.name = body.name.trim();
      if (['GOING', 'MAYBE', 'NO'].includes(body.status)) updates.status = body.status;
      if (body.partySize !== undefined) {
        updates.party_size = (updates.status || rsvp.status) === 'NO' ? 1 : Math.min(Math.max(body.partySize, 1), 2);
      }
      if (body.comment !== undefined) updates.comment = body.comment ? body.comment.substring(0, 240) : null;

      const { data: updated, error: uErr } = await db.from('rsvps').update(updates).eq('id', rsvpId).select().single();
      if (uErr) return err(uErr.message, 500);
      return json(updated);
    }

    // DELETE /events/:eventKey/rsvps/:rsvpId
    if (rsvpUpdate && method === 'DELETE') {
      const [, eventKey, rsvpId] = rsvpUpdate;
      const et = url.searchParams.get('et') || req.headers.get('x-edit-token');
      if (!et) return err('Token de edición requerido', 401);

      const { data: rsvp } = await db.from('rsvps').select('*').eq('id', rsvpId).eq('edit_token', et).is('deleted_at', null).single();
      if (!rsvp) return err('RSVP no encontrado', 404);

      await db.from('rsvps').update({ deleted_at: new Date().toISOString() }).eq('id', rsvpId);
      return json({ ok: true });
    }

    // ADMIN ROUTES
    const adminToken = url.searchParams.get('t') || req.headers.get('x-admin-token') || '';

    // GET /admin/events/:eventKey
    const adminGet = path.match(/^admin\/events\/([^/]+)$/);
    if (adminGet && method === 'GET') {
      const eventKey = adminGet[1];
      const auth = await authorizeAdmin(db, eventKey, adminToken, authUser?.id);
      if (!auth) return err('No autorizado', 401);

      const { data: event } = await db.from('events').select('*').eq('id', auth.eventId).single();
      const { data: rsvps } = await db.from('rsvps').select('*').eq('event_id', auth.eventId).is('deleted_at', null).order('created_at', { ascending: false });
      const { data: updates } = await db.from('updates').select('*').eq('event_id', auth.eventId).is('deleted_at', null).order('created_at', { ascending: false });
      const { data: cohosts } = await db.from('event_admin_tokens').select('*').eq('event_id', auth.eventId).is('revoked_at', null);

      const counts = { going: 0, maybe: 0, no: 0, totalGuests: 0, pending: 0, approved: 0, rejected: 0 };
      (rsvps || []).forEach((r: any) => {
        if (r.approval_status === 'APPROVED') {
          counts.approved++;
          if (r.status === 'GOING') { counts.going++; counts.totalGuests += r.party_size; }
          else if (r.status === 'MAYBE') { counts.maybe++; counts.totalGuests += r.party_size; }
          else counts.no++;
        } else if (r.approval_status === 'PENDING') counts.pending++;
        else counts.rejected++;
      });

      return json({
        ...event,
        rsvps,
        updates,
        cohosts: auth.role === 'HOST' ? cohosts : [],
        counts,
        role: auth.role,
      });
    }

    // PUT /admin/events/:eventKey
    if (adminGet && method === 'PUT') {
      const eventKey = adminGet[1];
      const auth = await authorizeAdmin(db, eventKey, adminToken, authUser?.id);
      if (!auth) return err('No autorizado', 401);

      const body = await req.json();
      const allowed = ['title', 'description', 'start_at', 'end_at', 'timezone', 'location_name', 'location_url', 'address_street', 'address_ext_number', 'address_int_number', 'address_neighborhood', 'address_city', 'address_state', 'address_zip', 'address_country', 'cover_image_url', 'privacy_mode', 'show_attendees', 'rsvp_open', 'status'];
      const updates: any = {};
      const mapping: any = {
        startAt: 'start_at', endAt: 'end_at', locationName: 'location_name',
        locationUrl: 'location_url', coverImageUrl: 'cover_image_url',
        privacyMode: 'privacy_mode', showAttendees: 'show_attendees',
        rsvpOpen: 'rsvp_open', hostName: 'host_name',
        addressStreet: 'address_street', addressExtNumber: 'address_ext_number',
        addressIntNumber: 'address_int_number', addressNeighborhood: 'address_neighborhood',
        addressCity: 'address_city', addressState: 'address_state',
        addressZip: 'address_zip', addressCountry: 'address_country',
      };
      for (const [key, val] of Object.entries(body)) {
        const dbKey = mapping[key] || key;
        if (allowed.includes(dbKey) || dbKey === 'host_name') updates[dbKey] = val;
      }

      const { data: event, error: uErr } = await db.from('events').update(updates).eq('id', auth.eventId).select().single();
      if (uErr) return err(uErr.message, 500);
      return json(event);
    }

    // DELETE /admin/events/:eventKey
    if (adminGet && method === 'DELETE') {
      const eventKey = adminGet[1];
      const auth = await authorizeAdmin(db, eventKey, adminToken, authUser?.id);
      if (!auth) return err('No autorizado', 401);
      if (auth.role !== 'HOST') return err('Solo el host puede eliminar el evento', 403);

      await db.from('rsvps').update({ deleted_at: new Date().toISOString() }).eq('event_id', auth.eventId);
      await db.from('updates').update({ deleted_at: new Date().toISOString() }).eq('event_id', auth.eventId);
      await db.from('event_admin_tokens').update({ revoked_at: new Date().toISOString() }).eq('event_id', auth.eventId);
      const { error: delErr } = await db.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', auth.eventId);
      if (delErr) return err(delErr.message, 500);
      return json({ ok: true });
    }

    // POST /admin/events/:eventKey/updates
    const adminUpdates = path.match(/^admin\/events\/([^/]+)\/updates$/);
    if (adminUpdates && method === 'POST') {
      const eventKey = adminUpdates[1];
      const auth = await authorizeAdmin(db, eventKey, adminToken, authUser?.id);
      if (!auth) return err('No autorizado', 401);

      const body = await req.json();
      if (!body.content?.trim()) return err('Contenido requerido');

      const { data: update, error: uErr } = await db.from('updates').insert({
        event_id: auth.eventId,
        author_role: auth.role,
        content: body.content.trim(),
        link_url: body.linkUrl || null,
        image_url: body.imageUrl || null,
      }).select().single();

      if (uErr) return err(uErr.message, 500);
      return json(update);
    }

    // DELETE /admin/events/:eventKey/updates/:updateId
    const adminDeleteUpdate = path.match(/^admin\/events\/([^/]+)\/updates\/([^/]+)$/);
    if (adminDeleteUpdate && method === 'DELETE') {
      const [, eventKey, updateId] = adminDeleteUpdate;
      const auth = await authorizeAdmin(db, eventKey, adminToken, authUser?.id);
      if (!auth) return err('No autorizado', 401);

      await db.from('updates').update({ deleted_at: new Date().toISOString() }).eq('id', updateId);
      return json({ ok: true });
    }

    // POST /admin/events/:eventKey/rsvps/:rsvpId/approve
    const adminApprove = path.match(/^admin\/events\/([^/]+)\/rsvps\/([^/]+)\/approve$/);
    if (adminApprove && method === 'POST') {
      const [, eventKey, rsvpId] = adminApprove;
      const auth = await authorizeAdmin(db, eventKey, adminToken, authUser?.id);
      if (!auth) return err('No autorizado', 401);

      const { data, error: uErr } = await db.from('rsvps').update({ approval_status: 'APPROVED' }).eq('id', rsvpId).select().single();
      if (uErr) return err(uErr.message, 500);
      return json(data);
    }

    // POST /admin/events/:eventKey/rsvps/:rsvpId/reject
    const adminReject = path.match(/^admin\/events\/([^/]+)\/rsvps\/([^/]+)\/reject$/);
    if (adminReject && method === 'POST') {
      const [, eventKey, rsvpId] = adminReject;
      const auth = await authorizeAdmin(db, eventKey, adminToken, authUser?.id);
      if (!auth) return err('No autorizado', 401);

      const { data, error: uErr } = await db.from('rsvps').update({ approval_status: 'REJECTED' }).eq('id', rsvpId).select().single();
      if (uErr) return err(uErr.message, 500);
      return json(data);
    }

    // POST /admin/events/:eventKey/cohosts
    const adminCohosts = path.match(/^admin\/events\/([^/]+)\/cohosts$/);
    if (adminCohosts && method === 'POST') {
      const [, eventKey] = adminCohosts;
      const auth = await authorizeAdmin(db, eventKey, adminToken, authUser?.id);
      if (!auth) return err('No autorizado', 401);
      if (auth.role !== 'HOST') return err('Solo el host puede gestionar co-hosts', 403);

      const body = await req.json();
      const cohostToken = genToken();
      const { data, error: cErr } = await db.from('event_admin_tokens').insert({
        event_id: auth.eventId,
        token: cohostToken,
        role: 'COHOST',
        label: body.label || null,
      }).select().single();

      if (cErr) return err(cErr.message, 500);
      return json({ ...data, cohostUrl: `${baseUrl}/h/${eventKey}?t=${cohostToken}` });
    }

    // DELETE /admin/events/:eventKey/cohosts/:tokenId
    const adminDeleteCohost = path.match(/^admin\/events\/([^/]+)\/cohosts\/([^/]+)$/);
    if (adminDeleteCohost && method === 'DELETE') {
      const [, eventKey, tokenId] = adminDeleteCohost;
      const auth = await authorizeAdmin(db, eventKey, adminToken, authUser?.id);
      if (!auth) return err('No autorizado', 401);
      if (auth.role !== 'HOST') return err('Solo el host puede gestionar co-hosts', 403);

      await db.from('event_admin_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', tokenId);
      return json({ ok: true });
    }

    return err('Ruta no encontrada', 404);
  } catch (e: any) {
    return err(e.message || 'Error interno', 500);
  }
});
