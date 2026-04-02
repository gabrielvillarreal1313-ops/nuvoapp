import { useState, useEffect, useRef } from "react";
import { User, Mail, Edit2, Check, LogOut, PartyPopper, Calendar, Camera, Phone, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PhoneInput from "@/components/PhoneInput";
import { api } from "@/lib/api";

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || "").trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const Profile = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [hostEvents, setHostEvents] = useState<any[]>([]);
  const [guestEvents, setGuestEvents] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Refresh profile on mount to ensure latest data
  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      const { firstName, lastName } = splitName(profile.name ?? "");
      setForm({ firstName, lastName, phone: profile.phone ?? "" });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    api.getMyHostedEvents()
      .then((response) => {
        setHostEvents(response.events || []);
      })
      .catch(() => setHostEvents([]));

    api.getMyGuestEvents()
      .then((response) => {
        setGuestEvents(response.events || []);
      })
      .catch(() => setGuestEvents([]));
  }, [user]);

  const saveProfile = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.error("Nombre y apellido requeridos"); return; }
    if (!user) return;
    setSaving(true);
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, name: fullName, phone: form.phone.trim() });
    setSaving(false);
    if (error) { toast.error("Error al guardar"); return; }
    await refreshProfile();
    toast.success("Perfil guardado");
    setEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no puede superar 5MB"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: urlWithBust });
      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Foto actualizada");
    } catch (err: any) {
      toast.error(err.message || "Error al subir foto");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no puede superar 5MB"); return; }

    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/cover.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, cover_url: urlWithBust });
      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Portada actualizada");
    } catch (err: any) {
      toast.error(err.message || "Error al subir portada");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const displayName = profile?.name ?? user?.email ?? "Tu perfil";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div
        className="relative px-4 pb-8 pt-10 text-center bg-cover bg-center"
        style={profile?.cover_url
          ? { backgroundImage: `url(${profile.cover_url})` }
          : undefined
        }
      >
        {profile?.cover_url ? (
          <div className="absolute inset-0 bg-black/40" />
        ) : (
          <div className="absolute inset-0 gradient-primary" />
        )}

        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm hover:bg-background/90 disabled:opacity-50"
        >
          {uploadingCover ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          {profile?.cover_url ? "Cambiar" : "Portada"}
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverUpload}
        />

        <div className="relative z-[1]">
          <div className="relative mx-auto mb-3 w-20">
            <Avatar className="h-20 w-20 mx-auto border-2 border-primary-foreground/30">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-2xl font-bold">
                {profile?.avatar_url ? <User className="h-10 w-10" /> : initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground text-primary shadow-md hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <h1 className="font-display text-2xl font-bold text-primary-foreground">{displayName}</h1>
          <p className="text-sm text-primary-foreground/70 mt-1">{user?.email}</p>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-5 space-y-5">
        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Mis datos</h2>
            {!editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1" /> Editar
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
                  <Input
                    placeholder="Nombre"
                    value={form.firstName}
                    onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                    autoComplete="given-name"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Apellido *</label>
                  <Input
                    placeholder="Apellido"
                    value={form.lastName}
                    onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp / Teléfono</label>
                <PhoneInput
                  value={form.phone}
                  onChange={(v) => setForm(f => ({ ...f, phone: v }))}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={saveProfile} disabled={saving} className="gradient-primary flex-1 text-primary-foreground font-semibold">
                  <Check className="mr-2 h-4 w-4" /> {saving ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="font-medium text-sm">{profile?.name ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Correo</p>
                  <p className="font-medium text-sm">{user?.email}</p>
                </div>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="font-medium text-sm">{profile.phone}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-4 text-center shadow-card">
            <PartyPopper className="mx-auto mb-1 h-5 w-5 text-primary" />
            <div className="font-display text-2xl font-bold">{hostEvents.length}</div>
            <div className="text-xs text-muted-foreground">Eventos organizados</div>
          </div>
          <div className="rounded-2xl border bg-card p-4 text-center shadow-card">
            <Calendar className="mx-auto mb-1 h-5 w-5 text-primary" />
            <div className="font-display text-2xl font-bold">{guestEvents.length}</div>
            <div className="text-xs text-muted-foreground">Eventos asistidos</div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
};

export default Profile;
