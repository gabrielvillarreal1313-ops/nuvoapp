import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatEventDate, formatEventTime, getWhatsAppShareUrl, getShareInviteText, getShareUpdateText, copyToClipboard, PUBLIC_BASE_URL } from "@/lib/event-utils";
import { buildDisplayAddress, buildGoogleMapsUrl } from "@/lib/address-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, ExternalLink, MessageCircle, Users, Copy, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import PhoneInput from "@/components/PhoneInput";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const STATUS_LABELS: Record<string, string> = { GOING: "Voy 🎉", MAYBE: "Tal vez", NO: "No voy" };
const STATUS_COLORS: Record<string, string> = { GOING: "bg-going", MAYBE: "bg-warning", NO: "bg-no" };
const STATUS_LABELS_SHORT: Record<string, string> = { GOING: "Voy", MAYBE: "Tal vez", NO: "No voy" };

function getStoredRsvpToken(eventKey: string): string | null {
  try {
    const tokens = JSON.parse(localStorage.getItem("rsvpTokens") || "{}");
    return tokens[eventKey] || null;
  } catch {
    return null;
  }
}

const EventPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { eventKey } = useParams<{ eventKey: string }>();
  const [searchParams] = useSearchParams();
  const highlightUpdate = searchParams.get("u");

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rsvpForm, setRsvpForm] = useState({ firstName: "", lastName: "", phone: "", status: "GOING", partySize: 1, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [myRsvp, setMyRsvp] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  const updateRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
      if (profile.name) {
        const parts = profile.name.trim().split(/\s+/);
        setRsvpForm(f => ({ ...f, firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "", phone: profile.phone || "" }));
      }
    } catch {}
  }, []);

  const loadEvent = async () => {
    try {
      const data = await api.getEvent(eventKey!);
      setEvent(data);

      const myToken = getStoredRsvpToken(eventKey!);
      let resolvedRsvp = null;

      if (user && data.my_rsvp) {
        resolvedRsvp = data.my_rsvp;
      } else if (myToken && data.rsvps) {
        resolvedRsvp = data.rsvps.find((r: any) => r.edit_token === myToken) || null;
      }

      if (!resolvedRsvp && user && myToken) {
        try {
          const claimed = await api.claimRsvp(eventKey!, myToken);
          resolvedRsvp = claimed?.rsvp || null;
        } catch {
          // keep legacy compatibility silently
        }
      }

      if (resolvedRsvp) {
        const parts = (resolvedRsvp.name || "").trim().split(/\s+/);
        setMyRsvp(resolvedRsvp);
        setRsvpForm({
          firstName: parts[0] || "",
          lastName: parts.slice(1).join(" ") || "",
          phone: resolvedRsvp.phone || "",
          status: resolvedRsvp.status,
          partySize: resolvedRsvp.party_size,
          comment: resolvedRsvp.comment || "",
        });
      } else if (myToken) {
        setMyRsvp({ editToken: myToken, pending: true });
      } else {
        setMyRsvp(null);
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar evento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventKey) loadEvent();
  }, [eventKey]);

  useEffect(() => {
    if (highlightUpdate && updateRefs.current[highlightUpdate]) {
      setTimeout(() => {
        updateRefs.current[highlightUpdate]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  }, [highlightUpdate, event]);

  const handleRsvp = async () => {
    const fullName = `${rsvpForm.firstName.trim()} ${rsvpForm.lastName.trim()}`.trim();
    if (!fullName || !rsvpForm.firstName.trim() || !rsvpForm.lastName.trim()) { toast.error("Nombre y apellido son requeridos"); return; }
    if (!rsvpForm.phone.trim()) { toast.error("Tu número de WhatsApp es requerido"); return; }
    setSubmitting(true);
    const submitData = { name: fullName, phone: rsvpForm.phone, status: rsvpForm.status, partySize: rsvpForm.partySize, comment: rsvpForm.comment };
    try {
      if (editMode && myRsvp) {
        const et = getStoredRsvpToken(eventKey!) || myRsvp.edit_token || myRsvp.editToken;
        await api.updateRsvp(eventKey!, myRsvp.id, et, submitData);
        toast.success("RSVP actualizado");
      } else {
        const result = await api.createRsvp(eventKey!, submitData);
        const tokens = JSON.parse(localStorage.getItem('rsvpTokens') || '{}');
        tokens[eventKey!] = result.editToken || result.edit_token;
        localStorage.setItem('rsvpTokens', JSON.stringify(tokens));
        setMyRsvp(result);

        try {
          const saved = JSON.parse(localStorage.getItem("guestEvents") || "[]");
          const existing = saved.find((e: any) => e.eventKey === eventKey);
          if (!existing) {
            saved.unshift({ eventKey, title: event.title, startAt: event.start_at, role: "guest" });
            localStorage.setItem("guestEvents", JSON.stringify(saved.slice(0, 20)));
          }
        } catch {}

        try {
          const prof = JSON.parse(localStorage.getItem("userProfile") || "{}");
          if (!prof.name && fullName) {
            localStorage.setItem("userProfile", JSON.stringify({ name: fullName, phone: rsvpForm.phone }));
          }
        } catch {}

        if (result.approval_status === 'PENDING') {
          toast.success("RSVP enviado — pendiente de aprobación");
        } else {
          toast.success("¡Listo! Te esperamos 🎉");
        }
      }
      setEditMode(false);
      loadEvent();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRsvp = async () => {
    if (!myRsvp) return;
    const tokens = JSON.parse(localStorage.getItem('rsvpTokens') || '{}');
    const et = tokens[eventKey!] || myRsvp.edit_token || myRsvp.editToken;
    try {
      await api.deleteRsvp(eventKey!, myRsvp.id, et);
      delete tokens[eventKey!];
      localStorage.setItem('rsvpTokens', JSON.stringify(tokens));
      setMyRsvp(null);
      setEditMode(false);
      setRsvpForm({ firstName: "", lastName: "", phone: "", status: "GOING", partySize: 1, comment: "" });
      toast.success("RSVP eliminado");
      loadEvent();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
      <p className="text-lg font-medium">{error}</p>
    </div>
  );

  if (!event) return null;

  const isCancelled = event.status === 'CANCELLED';
  const isRsvpClosed = !event.rsvp_open;
  const canRsvp = !isCancelled && !isRsvpClosed && (!myRsvp || editMode);
  const guestUrl = `${PUBLIC_BASE_URL}/e/${eventKey}`;
  const shareText = getShareInviteText(event.title, event.start_at, guestUrl);

  const handleWhatsApp = () => {
    const waUrl = getWhatsAppShareUrl(shareText);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background">
      {event.cover_image_url && (
        <div className="relative h-48 w-full overflow-hidden">
          <img src={event.cover_image_url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-md px-4 py-6">
        {isCancelled && (
          <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-center text-sm font-medium text-destructive animate-fade-in">
            <AlertTriangle className="mr-1 inline h-4 w-4" /> Evento cancelado
          </div>
        )}

        <div className="animate-slide-up">
          <h1 className="font-display text-3xl font-bold leading-tight">{event.title}</h1>
          {event.host_name && <p className="mt-1 text-sm text-muted-foreground">por {event.host_name}</p>}

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{formatEventDate(event.start_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span>{formatEventTime(event.start_at)}{event.end_at ? ` — ${formatEventTime(event.end_at)}` : ''}</span>
            </div>
            {(event.location_name || event.address_street) && (() => {
              const address = buildDisplayAddress(event);
              const mapsUrl = event.location_url || buildGoogleMapsUrl(event);
              return (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    {event.location_name && <span className="font-medium">{event.location_name}</span>}
                    {address && (
                      <>
                        {event.location_name && <br />}
                        <span className="text-muted-foreground">{address}</span>
                      </>
                    )}
                    {mapsUrl && (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary underline text-xs">
                        Ver en mapa
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {event.description && <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{event.description}</p>}
        </div>

        <div className="mt-6 flex gap-3">
          {[
            { label: "Van", count: event.counts.going, color: "bg-going" },
            { label: "Tal vez", count: event.counts.maybe, color: "bg-warning" },
            { label: "No van", count: event.counts.no, color: "bg-no" },
          ].map((c) => (
            <div key={c.label} className="flex-1 rounded-xl border bg-card p-3 text-center shadow-card">
              <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${c.color}`} />
              <div className="font-display text-xl font-bold">{c.count}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>

        {event.counts.totalGuests > 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {event.counts.totalGuests} persona{event.counts.totalGuests !== 1 ? 's' : ''} en total
          </p>
        )}

        <div className="mt-8">
          {myRsvp && !editMode ? (
            <div className="rounded-xl border bg-card p-4 shadow-card animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{myRsvp.name || 'Tu RSVP'}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium text-primary-foreground ${STATUS_COLORS[myRsvp.status] || 'bg-muted'}`}>
                      {STATUS_LABELS_SHORT[myRsvp.status] || myRsvp.status}
                    </span>
                    {myRsvp.approval_status === 'PENDING' && (
                      <span className="inline-block rounded-full bg-pending px-2 py-0.5 text-xs font-medium text-primary-foreground">
                        En espera de aprobación
                      </span>
                    )}
                    {myRsvp.party_size === 2 && <span className="text-xs text-muted-foreground">+1</span>}
                  </div>
                </div>
                {!isCancelled && event.rsvp_open && (
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>Editar</Button>
                )}
              </div>
            </div>
          ) : canRsvp ? (
            <div className="rounded-xl border bg-card p-5 shadow-card animate-slide-up">
              <h3 className="mb-4 font-display text-lg font-semibold">
                {editMode ? 'Editar RSVP' : '¿Vas? Confirma en segundos'}
              </h3>

              <div className="mb-4 flex gap-2">
                {(["GOING", "MAYBE", "NO"] as const).map((s) => {
                  const selected = rsvpForm.status === s;
                  const textColor = s === 'MAYBE' ? 'text-foreground' : 'text-primary-foreground';
                  return (
                    <button
                      key={s}
                      onClick={() => setRsvpForm(f => ({ ...f, status: s, partySize: s === 'NO' ? 1 : f.partySize }))}
                      className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${
                        selected
                          ? `${STATUS_COLORS[s]} ${textColor} shadow-card ring-2 ring-offset-2 ring-offset-background ring-foreground/20`
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre *"
                    value={rsvpForm.firstName}
                    onChange={(e) => setRsvpForm(f => ({ ...f, firstName: e.target.value }))}
                  />
                  <Input
                    placeholder="Apellido *"
                    value={rsvpForm.lastName}
                    onChange={(e) => setRsvpForm(f => ({ ...f, lastName: e.target.value }))}
                  />
                </div>

                <div>
                  <PhoneInput
                    value={rsvpForm.phone}
                    onChange={(v) => setRsvpForm(f => ({ ...f, phone: v }))}
                    required
                  />
                </div>

                {rsvpForm.status !== "NO" && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">¿Traes a alguien?</span>
                    <div className="flex gap-2">
                      {[1, 2].map((n) => (
                        <button
                          key={n}
                          onClick={() => setRsvpForm(f => ({ ...f, partySize: n }))}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            rsvpForm.partySize === n ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {n === 1 ? 'Solo yo' : 'Vamos 2'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Textarea
                  placeholder="Mensaje al host (opcional)"
                  value={rsvpForm.comment}
                  onChange={(e) => setRsvpForm(f => ({ ...f, comment: e.target.value.substring(0, 240) }))}
                  rows={2}
                />

                <div className="flex gap-2">
                  <Button onClick={handleRsvp} disabled={submitting} className="gradient-primary flex-1 py-5 text-base text-primary-foreground font-semibold">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editMode ? 'Guardar' : 'Confirmar asistencia'}
                  </Button>
                  {editMode && (
                    <>
                      <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                      <Button variant="destructive" size="sm" onClick={handleDeleteRsvp}>Eliminar</Button>
                    </>
                  )}
                </div>
              </div>

              {event.privacy_mode === 'APPROVAL_REQUIRED' && !editMode && (
                <p className="mt-2 text-xs text-muted-foreground text-center">
                  Tu RSVP necesitará aprobación del organizador
                </p>
              )}
            </div>
          ) : (
            !myRsvp && (
              <div className="rounded-xl border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                {isCancelled ? 'Evento cancelado' : 'RSVP cerrado'}
              </div>
            )
          )}
        </div>

        {myRsvp && !editMode && !user && (
          <div className="mt-6 rounded-xl border bg-card p-5 shadow-card animate-fade-in text-center">
            <Users className="mx-auto h-8 w-8 text-primary mb-2" />
            <p className="font-display text-base font-semibold">¿Quieres ver quién más va?</p>
            <p className="text-sm text-muted-foreground mt-1">Crea una cuenta para ver la lista de asistentes</p>
            <Button
              className="gradient-primary text-primary-foreground font-semibold mt-4 w-full"
              onClick={() => {
                localStorage.setItem("returnTo", `/e/${eventKey}`);
                navigate("/auth?mode=signup");
              }}
            >
              Crear cuenta gratis
            </Button>
            <button
              onClick={() => {
                localStorage.setItem("returnTo", `/e/${eventKey}`);
                navigate("/auth?mode=login");
              }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Ya tengo cuenta
            </button>
          </div>
        )}

        {event.show_attendees && myRsvp && !editMode && user && event.rsvps && event.rsvps.length > 0 && (
          <div className="mt-8 animate-fade-in">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <Users className="h-5 w-5 text-primary" /> Asistentes
            </h3>
            {(["GOING", "MAYBE", "NO"] as const).map((status) => {
              const group = event.rsvps.filter((r: any) => r.status === status);
              if (group.length === 0) return null;
              const groupLabels: Record<string, string> = { GOING: "Van 🎉", MAYBE: "Tal vez 🤔", NO: "No van" };
              return (
                <div key={status} className="mb-4">
                  <p className="mb-2 text-sm font-semibold flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status]}`} />
                    {groupLabels[status]} ({group.length})
                  </p>
                  <div className="space-y-2">
                    {group.map((r: any) => {
                      const initials = r.name
                        ? r.name.split(/\s+/).map((w: string) => w[0]?.toUpperCase()).slice(0, 2).join('')
                        : '?';
                      return (
                        <div key={r.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-card">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {r.avatar_url && <AvatarImage src={r.avatar_url} alt={r.name} />}
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium">{r.name}</span>
                              {r.party_size === 2 && <span className="ml-2 text-xs text-muted-foreground">+1</span>}
                              {r.comment && <p className="mt-0.5 text-xs text-muted-foreground">{r.comment}</p>}
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-primary-foreground ${STATUS_COLORS[status]}`}>
                            {STATUS_LABELS_SHORT[status]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8">
          <h3 className="mb-3 font-display text-lg font-semibold">Updates</h3>
          {event.updates && event.updates.length > 0 ? (
            <div className="space-y-3">
              {event.updates.map((u: any) => (
                <div
                  key={u.id}
                  ref={(el) => { updateRefs.current[u.id] = el; }}
                  className={`rounded-xl border bg-card p-4 shadow-card transition-all ${
                    highlightUpdate === u.id ? 'ring-2 ring-primary animate-bounce-in' : ''
                  }`}
                >
                  <p className="text-sm">{u.content}</p>
                  {u.link_url && (
                    <a href={u.link_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> Ver enlace
                    </a>
                  )}
                  {u.image_url && <img src={u.image_url} alt="" className="mt-2 rounded-lg max-h-48 w-full object-cover" />}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </span>
                    <button
                      onClick={() => {
                        const text = getShareUpdateText(u.content, guestUrl, u.id);
                        window.open(getWhatsAppShareUrl(text), '_blank', 'noopener,noreferrer');
                      }}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <MessageCircle className="h-3 w-3" /> Compartir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Aún no hay updates</p>
          )}
        </div>

        <div className="mt-8 space-y-2 pb-8">
          <Button
            onClick={handleWhatsApp}
            className="w-full py-5 font-semibold text-white text-base"
            style={{ backgroundColor: "hsl(142,70%,40%)" }}
          >
            <MessageCircle className="mr-2 h-5 w-5" /> Compartir por WhatsApp
          </Button>
          <Button variant="outline" className="w-full" onClick={() => { copyToClipboard(guestUrl); toast.success("¡Link copiado!"); }}>
            <Copy className="mr-2 h-4 w-4" /> Copiar link
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventPage;
