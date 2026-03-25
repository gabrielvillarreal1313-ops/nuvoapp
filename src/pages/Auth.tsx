import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Lock, User, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import PhoneInput from "@/components/PhoneInput";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "login" ? "login" : "signup";
  const { signIn, signUp } = useAuth();

  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", phone: "" });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      toast.error("Correo y contraseña son requeridos");
      return;
    }
    if (mode === "signup" && (!form.firstName.trim() || !form.lastName.trim())) {
      toast.error("Nombre y apellido son requeridos");
      return;
    }
    if (mode === "signup" && !form.phone.trim()) {
      toast.error("El teléfono es requerido");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(form.email, form.password);
        const returnTo = localStorage.getItem("returnTo");
        if (returnTo) {
          localStorage.removeItem("returnTo");
          navigate(returnTo);
        } else {
          navigate("/");
        }
      } else {
        const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
        await signUp(form.email, form.password, fullName, form.phone);
        setEmailSent(true);
      }
    } catch (err: any) {
      const msg = err?.message || "Algo salió mal";
      if (msg.includes("Invalid login credentials")) toast.error("Correo o contraseña incorrectos");
      else if (msg.includes("already registered")) toast.error("Este correo ya tiene una cuenta");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="rounded-2xl border bg-card p-8 shadow-card max-w-sm w-full space-y-4">
          <CheckCircle className="h-12 w-12 text-going mx-auto" />
          <h2 className="font-display text-xl font-bold">¡Revisa tu correo!</h2>
          <p className="text-sm text-muted-foreground">
            Enviamos un link de confirmación a <span className="font-semibold text-foreground">{form.email}</span>. Haz clic en el link para activar tu cuenta.
          </p>
            <Button
            variant="outline"
            onClick={() => {
              setEmailSent(false);
              navigate("/auth?mode=login");
            }}
            className="w-full mt-2"
          >
            Ir a iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="gradient-primary px-4 pt-10 pb-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-primary-foreground/80 hover:text-primary-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Volver</span>
        </button>
        <h1 className="font-display text-2xl font-bold text-primary-foreground">
          {mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
        </h1>
        <p className="text-sm text-primary-foreground/70 mt-1">
          {mode === "signup" ? "Empieza a organizar tus eventos" : "Bienvenido de vuelta"}
        </p>
      </div>

      <div className="mx-auto w-full max-w-md px-4 py-6 flex-1">
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre"
                    value={form.firstName}
                    onChange={set("firstName")}
                    className="pl-9"
                    autoComplete="given-name"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Apellido *</label>
                <Input
                  placeholder="Apellido"
                  value={form.lastName}
                  onChange={set("lastName")}
                  autoComplete="family-name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Correo electrónico *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="hola@ejemplo.com"
                value={form.email}
                onChange={set("email")}
                className="pl-9"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Contraseña *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Tu contraseña"}
                value={form.password}
                onChange={set("password")}
                className="pl-9"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp / Teléfono *</label>
              <PhoneInput
                value={form.phone}
                onChange={(v) => setForm(f => ({ ...f, phone: v }))}
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="gradient-primary w-full h-12 text-primary-foreground font-bold text-base mt-2"
          >
            {loading ? "Cargando..." : mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          {mode === "signup" ? (
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <button
                onClick={() => navigate("/auth?mode=login")}
                className="font-semibold text-primary hover:underline"
              >
                Iniciar sesión
              </button>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <button
                onClick={() => navigate("/auth?mode=signup")}
                className="font-semibold text-primary hover:underline"
              >
                Crear cuenta
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
