import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, PartyPopper } from "lucide-react";
import { api } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";
import EventCreatedModal from "@/components/EventCreatedModal";
import TimeSelect from "@/components/TimeSelect";

const CreateEvent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [createdData, setCreatedData] = useState<any>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    hostName: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    locationName: "",
    locationUrl: "",
    coverImageUrl: "",
    privacyMode: "OPEN" as "OPEN" | "APPROVAL_REQUIRED",
    showAttendees: true,
    rsvpOpen: true,
  });

  const set = (key: string, val: any) => setForm((f) => {
    const updated = { ...f, [key]: val };
    if (key === "startDate" && !f.endDate) updated.endDate = val;
    if (key === "startTime" && !f.endTime) updated.endTime = val;
    return updated;
  });

  const combineDateTime = (date: string, time: string): string | null => {
    if (!date) return null;
    const t = time || "12:00";
    return new Date(`${date}T${t}`).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("El título es requerido"); return; }
    if (!form.startDate) { toast.error("La fecha de inicio es requerida"); return; }

    setLoading(true);
    try {
      const result = await api.createEvent({
        title: form.title,
        description: form.description,
        hostName: form.hostName,
        startAt: combineDateTime(form.startDate, form.startTime)!,
        endAt: combineDateTime(form.endDate, form.endTime),
        locationName: form.locationName,
        locationUrl: form.locationUrl,
        coverImageUrl: form.coverImageUrl,
        privacyMode: form.privacyMode,
        showAttendees: form.showAttendees,
        rsvpOpen: form.rsvpOpen,
      });

      const saved = JSON.parse(localStorage.getItem('hostEvents') || '[]');
      saved.unshift({
        eventKey: result.event.event_key,
        title: result.event.title,
        hostUrl: `/h/${result.event.event_key}?t=${result.hostToken}`,
        startAt: result.event.start_at,
        role: "host",
      });
      localStorage.setItem('hostEvents', JSON.stringify(saved.slice(0, 20)));

      setCreatedData(result);
    } catch (err: any) {
      toast.error(err.message || "Error al crear evento");
    } finally {
      setLoading(false);
    }
  };

  if (createdData) {
    return <EventCreatedModal data={createdData} />;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-md animate-fade-in">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <PartyPopper className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">Crear evento</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="title">Nombre del evento *</Label>
            <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Fiesta de cumpleaños 🎂" className="mt-1" />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Detalles del evento..." className="mt-1" rows={3} />
          </div>

          <div>
            <Label htmlFor="hostName">Tu nombre (host)</Label>
            <Input id="hostName" value={form.hostName} onChange={(e) => set("hostName", e.target.value)} placeholder="Juan" className="mt-1" />
          </div>

          <div>
            <Label>Inicio *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="mt-1" />
              <TimeSelect value={form.startTime} onChange={(v) => set("startTime", v)} placeholder="Hora" />
            </div>
          </div>

          <div>
            <Label>Fin</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className="mt-1" />
              <TimeSelect value={form.endTime} onChange={(v) => set("endTime", v)} placeholder="Hora" />
            </div>
          </div>

          <div>
            <Label htmlFor="locationName">Lugar</Label>
            <Input id="locationName" value={form.locationName} onChange={(e) => set("locationName", e.target.value)} placeholder="Casa de María" className="mt-1" />
          </div>

          <div>
            <Label htmlFor="locationUrl">Link del lugar (opcional)</Label>
            <Input id="locationUrl" value={form.locationUrl} onChange={(e) => set("locationUrl", e.target.value)} placeholder="https://maps.google.com/..." className="mt-1" />
            {form.locationName && !form.locationUrl && (
              <p className="mt-1 text-xs text-muted-foreground">
                Se generará automáticamente un link a Google Maps con "{form.locationName}"
              </p>
            )}
          </div>

          <div>
            <Label>Imagen de portada</Label>
            <ImageUpload value={form.coverImageUrl} onChange={(url) => set("coverImageUrl", url)} />
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Requiere aprobación</p>
                <p className="text-xs text-muted-foreground">Los RSVPs necesitan tu aprobación</p>
              </div>
              <Switch checked={form.privacyMode === "APPROVAL_REQUIRED"} onCheckedChange={(v) => set("privacyMode", v ? "APPROVAL_REQUIRED" : "OPEN")} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Mostrar asistentes</p>
                <p className="text-xs text-muted-foreground">Los invitados ven quién va</p>
              </div>
              <Switch checked={form.showAttendees} onCheckedChange={(v) => set("showAttendees", v)} />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="gradient-primary w-full py-6 text-lg font-semibold text-primary-foreground shadow-elevated hover:opacity-90">
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {loading ? "Creando..." : "Crear evento"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
