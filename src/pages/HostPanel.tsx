import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatEventDate, formatEventTime, copyToClipboard, getWhatsAppShareUrl, getShareInviteText, PUBLIC_BASE_URL } from "@/lib/event-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import TimeSelect from "@/components/TimeSelect";
import ImageUpload from "@/components/ImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Check, X, Copy, MessageCircle, Plus, Trash2, Users, Bell, Settings, UserPlus, AlertTriangle, PartyPopper } from "lucide-react";
import { toast } from "sonner";

const HostPanel = () => {
  const { eventKey } = useParams<{ eventKey: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("t") || "";
  const { user } = useAuth();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [updateContent, setUpdateContent] = useState("");
  const [updateLink, setUpdateLink] = useState("");
  const [updateImage, setUpdateImage] = useState("");
  const [postingUpdate, setPostingUpdate] = useState(false);

  const [cohostLabel, setCohostLabel] = useState("");
  const [creatingCohost, setCreatingCohost] = useState(false);

  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api.getAdminEvent(eventKey!, token);
      setEvent(data);
      const startDt = data.start_at ? new Date(data.start_at) : null;
      const endDt = data.end_at ? new Date(data.end_at) : null;
      const toDateStr = (d: Date) => d.toLocaleDateString('en-CA');
      const toTimeStr = (d: Date) => {
        const h = d.getHours();
        const m = d.getMinutes() < 30 ? 0 : 30;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };
      setEditForm({
        title: data.title,
        description: data.description || "",
        hostName: data.host_name || "",
        startDate: startDt ? toDateStr(startDt) : "",
        startTime: startDt ? toTimeStr(startDt) : "",
        endDate: endDt ? toDateStr(endDt) : "",
        endTime: endDt ? toTimeStr(endDt) : "",
        locationName: data.location_name || "",
        locationUrl: data.location_url || "",
        addressStreet: data.address_street || "",
        addressExtNumber: data.address_ext_number || "",
        addressIntNumber: data.address_int_number || "",
        addressNeighborhood: data.address_neighborhood || "",
        addressCity: data.address_city || "",
        addressState: data.address_state || "",
        addressZip: data.address_zip || "",
        addressCountry: data.address_country || "México",
        coverImageUrl: data.cover_image_url || "",
        privacyMode: data.privacy_mode,
        showAttendees: data.show_attendees,
        rsvpOpen: data.rsvp_open,
        status: data.status,
      });
    } catch (err: any) {
      setError(err.message || "No autorizado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!eventKey) {
      setError("Evento inválido");
      setLoading(false);
      return;
    }
    load();
  }, [eventKey, token, user?.id]);

  const handleApprove = async (rsvpId: string) => {
    try {
      await api.approveRsvp(eventKey!, token, rsvpId);
      toast.success("Aprobado");
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async (rsvpId: string) => {
    try {
      await api.rejectRsvp(eventKey!, token, rsvpId);
      toast.success("Rechazado");
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handlePostUpdate = async () => {
    if (!updateContent.trim()) { toast.error("Contenido requerido"); return; }
    setPostingUpdate(true);
    try {
      await api.createUpdate(eventKey!, token, { content: updateContent, linkUrl: updateLink || null, imageUrl: updateImage || null });
      setUpdateContent(""); setUpdateLink(""); setUpdateImage("");
      toast.success("Update publicado");
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setPostingUpdate(false); }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    try {
      await api.deleteUpdate(eventKey!, token, updateId);
      toast.success("Update eliminado");
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveEvent = async () => {
    setSaving(true);
    try {
      const combineDateTime = (date: string, time: string): string | null => {
        if (!date) return null;
        const t = time || "12:00";
        return new Date(`${date}T${t}`).toISOString();
      };
      await api.updateEvent(eventKey!, token, {
        ...editForm,
        startAt: combineDateTime(editForm.startDate, editForm.startTime) || undefined,
        endAt: combineDateTime(editForm.endDate, editForm.endTime),
      });
      toast.success("Evento actualizado");
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleCreateCohost = async () => {
    setCreatingCohost(true);
    try {
      const result = await api.createCohost(eventKey!, token, { label: cohostLabel || null });
      setCohostLabel("");
      toast.success("Co-host creado");
      await copyToClipboard(result.cohostUrl);
      toast.info("Link del co-host copiado al portapapeles");
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setCreatingCohost(false); }
  };

  const handleRevokeCohost = async (tokenId: string) => {
    try {
      await api.deleteCohost(eventKey!, token, tokenId);
      toast.success("Co-host revocado");
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm("¿Eliminar este evento permanentemente? Esta acción no se puede deshacer.")) return;
    try {
      await api.deleteEvent(eventKey!, token || undefined);
      const hostEvents = JSON.parse(localStorage.getItem('hostEvents') || '[]');
      localStorage.setItem('hostEvents', JSON.stringify(hostEvents.filter((e: any) => e.eventKey !== eventKey)));
      // Legacy cleanup only: local cache may still contain historic hostEvents entries.
      // Source of truth for hosted events is events.owner_user_id on the backend.
      toast.success("Evento eliminado");
      navigate("/");
    } catch (err: any) { toast.error(err.message); }
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

  const guestUrl = `${PUBLIC_BASE_URL}/e/${eventKey}`;
  const shareText = getShareInviteText(event.title, event.start_at, guestUrl);

  const pendingRsvps = (event.rsvps || []).filter((r: any) => r.approval_status === 'PENDING');
  const approvedRsvps = (event.rsvps || []).filter((r: any) => r.approval_status === 'APPROVED');
  const rejectedRsvps = (event.rsvps || []).filter((r: any) => r.approval_status === 'REJECTED');

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg animate-fade-in">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Inicio
          </button>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {event.role === 'HOST' ? 'Host' : 'Co-host'}
          </span>
        </div>

        <div className="mb-4">
          <h1 className="font-display text-2xl font-bold">{event.title}</h1>
          <p className="text-sm text-muted-foreground">
            {formatEventDate(event.start_at)} · {formatEventTime(event.start_at)}
          </p>
        </div>

        <div className="mb-6 flex gap-2">
          <a href={getWhatsAppShareUrl(shareText)} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button className="w-full bg-[hsl(142,70%,40%)] text-primary-foreground hover:bg-[hsl(142,70%,35%)]" size="sm">
              <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={() => { copyToClipboard(guestUrl); toast.success("¡Link copiado!"); }}>
            <Copy className="mr-1 h-4 w-4" /> Copiar link
          </Button>
        </div>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-5 rounded-xl">
            <TabsTrigger value="summary" className="text-xs"><PartyPopper className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Resumen</span></TabsTrigger>
            <TabsTrigger value="attendees" className="text-xs"><Users className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Asistentes</span></TabsTrigger>
            <TabsTrigger value="updates" className="text-xs"><Bell className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Updates</span></TabsTrigger>
            <TabsTrigger value="edit" className="text-xs"><Settings className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Editar</span></TabsTrigger>
            {event.role === 'HOST' && (
              <TabsTrigger value="cohosts" className="text-xs"><UserPlus className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Co-hosts</span></TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="summary" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Van", count: event.counts.going, color: "text-going" },
                { label: "Tal vez", count: event.counts.maybe, color: "text-warning" },
                { label: "No van", count: event.counts.no, color: "text-no" },
                { label: "Pendientes", count: event.counts.pending, color: "text-pending" },
              ].map(c => (
                <div key={c.label} className="rounded-xl border bg-card p-4 text-center shadow-card">
                  <div className={`font-display text-2xl font-bold ${c.color}`}>{c.count}</div>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border bg-card p-4 text-center shadow-card">
              <div className="font-display text-3xl font-bold text-primary">{event.counts.totalGuests}</div>
              <div className="text-sm text-muted-foreground">Total personas confirmadas</div>
            </div>
          </TabsContent>

          <TabsContent value="attendees" className="mt-4 space-y-4">
            {pendingRsvps.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-pending">Pendientes ({pendingRsvps.length})</h3>
                <div className="space-y-2">
                  {pendingRsvps.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-card">
                      <div>
                        <span className="font-medium">{r.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {r.status === 'GOING' ? 'Voy' : r.status === 'MAYBE' ? 'Tal vez' : 'No'}
                          {r.party_size === 2 ? ' +1' : ''}
                        </span>
                        {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-going hover:bg-going/10" onClick={() => handleApprove(r.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-no hover:bg-no/10" onClick={() => handleReject(r.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-going">Aprobados ({approvedRsvps.length})</h3>
              {approvedRsvps.length > 0 ? (
                <div className="space-y-2">
                  {approvedRsvps.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-card">
                      <div>
                        <span className="font-medium">{r.name}</span>
                        <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-primary-foreground ${
                          r.status === 'GOING' ? 'bg-going' : r.status === 'MAYBE' ? 'bg-warning' : 'bg-no'
                        }`}>
                          {r.status === 'GOING' ? 'Voy' : r.status === 'MAYBE' ? 'Tal vez' : 'No'}
                        </span>
                        {r.party_size === 2 && <span className="ml-1 text-xs text-muted-foreground">+1</span>}
                        {r.comment && <p className="mt-0.5 text-xs text-muted-foreground">{r.comment}</p>}
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-no hover:bg-no/10" onClick={() => handleReject(r.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">Aún no hay RSVPs</p>
              )}
            </div>

            {rejectedRsvps.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-no">Rechazados ({rejectedRsvps.length})</h3>
                <div className="space-y-2">
                  {rejectedRsvps.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl border bg-card/50 p-3">
                      <span className="text-sm text-muted-foreground">{r.name}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-going hover:bg-going/10" onClick={() => handleApprove(r.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="updates" className="mt-4 space-y-4">
            <div className="rounded-xl border bg-card p-4 shadow-card">
              <Textarea placeholder="Escribe un update..." value={updateContent} onChange={(e) => setUpdateContent(e.target.value)} rows={3} />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input placeholder="Link (opcional)" value={updateLink} onChange={(e) => setUpdateLink(e.target.value)} />
                <Input placeholder="URL imagen (opcional)" value={updateImage} onChange={(e) => setUpdateImage(e.target.value)} />
              </div>
              <Button onClick={handlePostUpdate} disabled={postingUpdate} className="gradient-primary mt-3 w-full text-primary-foreground">
                {postingUpdate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Publicar update
              </Button>
            </div>

            {event.updates && event.updates.length > 0 ? (
              <div className="space-y-2">
                {event.updates.map((u: any) => (
                  <div key={u.id} className="flex items-start justify-between rounded-xl border bg-card p-3 shadow-card">
                    <div className="flex-1">
                      <p className="text-sm">{u.content}</p>
                      {u.link_url && <p className="mt-1 text-xs text-primary truncate">{u.link_url}</p>}
                      <span className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteUpdate(u.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">Aún no hay updates</p>
            )}
          </TabsContent>

          <TabsContent value="edit" className="mt-4">
            {editForm && (
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input value={editForm.title} onChange={(e) => setEditForm((f: any) => ({ ...f, title: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea value={editForm.description} onChange={(e) => setEditForm((f: any) => ({ ...f, description: e.target.value }))} className="mt-1" rows={3} />
                </div>
                <div>
                  <Label>Nombre del host</Label>
                  <Input value={editForm.hostName} onChange={(e) => setEditForm((f: any) => ({ ...f, hostName: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Inicio</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={editForm.startDate} onChange={(e) => setEditForm((f: any) => ({ ...f, startDate: e.target.value }))} className="mt-1" />
                    <TimeSelect value={editForm.startTime} onChange={(v) => setEditForm((f: any) => ({ ...f, startTime: v }))} placeholder="Hora" />
                  </div>
                </div>
                <div>
                  <Label>Fin</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={editForm.endDate} onChange={(e) => setEditForm((f: any) => ({ ...f, endDate: e.target.value }))} className="mt-1" />
                    <TimeSelect value={editForm.endTime} onChange={(v) => setEditForm((f: any) => ({ ...f, endTime: v }))} placeholder="Hora" />
                  </div>
                </div>
                <div className="space-y-3 rounded-xl border bg-card p-4">
                  <p className="font-display text-sm font-semibold">Ubicación</p>
                  <div>
                    <Label>Nombre del lugar (opcional)</Label>
                    <Input value={editForm.locationName} onChange={(e) => setEditForm((f: any) => ({ ...f, locationName: e.target.value }))} className="mt-1" placeholder="Casa de Ana..." />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label>Calle</Label>
                      <Input value={editForm.addressStreet} onChange={(e) => setEditForm((f: any) => ({ ...f, addressStreet: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>No. ext</Label>
                      <Input value={editForm.addressExtNumber} onChange={(e) => setEditForm((f: any) => ({ ...f, addressExtNumber: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>No. int</Label>
                      <Input value={editForm.addressIntNumber} onChange={(e) => setEditForm((f: any) => ({ ...f, addressIntNumber: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>Colonia</Label>
                      <Input value={editForm.addressNeighborhood} onChange={(e) => setEditForm((f: any) => ({ ...f, addressNeighborhood: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Ciudad</Label>
                      <Input value={editForm.addressCity} onChange={(e) => setEditForm((f: any) => ({ ...f, addressCity: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Input value={editForm.addressState} onChange={(e) => setEditForm((f: any) => ({ ...f, addressState: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>C.P.</Label>
                      <Input value={editForm.addressZip} onChange={(e) => setEditForm((f: any) => ({ ...f, addressZip: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>País</Label>
                      <Input value={editForm.addressCountry} onChange={(e) => setEditForm((f: any) => ({ ...f, addressCountry: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Link personalizado (opcional)</Label>
                    <Input value={editForm.locationUrl} onChange={(e) => setEditForm((f: any) => ({ ...f, locationUrl: e.target.value }))} className="mt-1" placeholder="https://maps.google.com/..." />
                    <p className="mt-1 text-xs text-muted-foreground">Si no lo pones, se generará con Google Maps</p>
                  </div>
                </div>
                <div>
                  <Label>Imagen de portada</Label>
                  <ImageUpload value={editForm.coverImageUrl} onChange={(url) => setEditForm((f: any) => ({ ...f, coverImageUrl: url }))} />
                </div>

                <div className="space-y-4 rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Requiere aprobación</p>
                      <p className="text-xs text-muted-foreground">RSVPs necesitan aprobación</p>
                    </div>
                    <Switch checked={editForm.privacyMode === 'APPROVAL_REQUIRED'} onCheckedChange={(v) => setEditForm((f: any) => ({ ...f, privacyMode: v ? 'APPROVAL_REQUIRED' : 'OPEN' }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Mostrar asistentes</p>
                    </div>
                    <Switch checked={editForm.showAttendees} onCheckedChange={(v) => setEditForm((f: any) => ({ ...f, showAttendees: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">RSVP abierto</p>
                    </div>
                    <Switch checked={editForm.rsvpOpen} onCheckedChange={(v) => setEditForm((f: any) => ({ ...f, rsvpOpen: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-destructive">Cancelar evento</p>
                    </div>
                    <Switch checked={editForm.status === 'CANCELLED'} onCheckedChange={(v) => setEditForm((f: any) => ({ ...f, status: v ? 'CANCELLED' : 'ACTIVE' }))} />
                  </div>
                </div>

                <Button onClick={handleSaveEvent} disabled={saving} className="gradient-primary w-full text-primary-foreground">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Guardar cambios
                </Button>

                {event.role === 'HOST' && (
                  <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm font-semibold text-destructive mb-1">Zona de peligro</p>
                    <p className="text-xs text-muted-foreground mb-3">Eliminar el evento borrará todos los datos de forma permanente.</p>
                    <Button
                      variant="outline"
                      onClick={handleDeleteEvent}
                      className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar evento
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {event.role === 'HOST' && (
            <TabsContent value="cohosts" className="mt-4 space-y-4">
              <div className="rounded-xl border bg-card p-4 shadow-card">
                <Label>Nombre/etiqueta del co-host</Label>
                <div className="mt-2 flex gap-2">
                  <Input value={cohostLabel} onChange={(e) => setCohostLabel(e.target.value)} placeholder="Ej: María" />
                  <Button onClick={handleCreateCohost} disabled={creatingCohost} className="gradient-primary text-primary-foreground whitespace-nowrap">
                    {creatingCohost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                    Generar link
                  </Button>
                </div>
              </div>

              {event.cohosts && event.cohosts.filter((c: any) => c.role === 'COHOST').length > 0 ? (
                <div className="space-y-2">
                  {event.cohosts.filter((c: any) => c.role === 'COHOST').map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-card">
                      <div>
                        <span className="font-medium">{c.label || 'Co-host'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString('es-MX')}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                          copyToClipboard(`${PUBLIC_BASE_URL}/h/${eventKey}?t=${c.token}`);
                          toast.success("Link copiado");
                        }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRevokeCohost(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">Sin co-hosts aún</p>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default HostPanel;
