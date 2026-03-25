import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PartyPopper, Share2, Calendar } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="gradient-festive relative overflow-hidden flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="relative z-10">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm shadow-elevated mx-auto animate-bounce-in">
            <PartyPopper className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-5xl font-bold text-primary-foreground mb-3 tracking-tight animate-fade-in">Nuvo</h1>
          <p className="text-lg text-primary-foreground/85 font-medium max-w-xs mx-auto animate-fade-in">Organiza eventos y compártelos por WhatsApp</p>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-md px-6 py-10 flex-1 flex flex-col">
        <div className="space-y-4 mb-10">
          <div className="flex items-start gap-4 rounded-2xl border bg-card p-4 shadow-card">
            <div className="gradient-primary h-10 w-10 rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Crea tu evento en segundos</p>
              <p className="text-xs text-muted-foreground mt-0.5">Fecha, lugar y descripción. Listo.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-2xl border bg-card p-4 shadow-card">
            <div className="gradient-primary h-10 w-10 rounded-xl flex items-center justify-center shrink-0">
              <Share2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Comparte por WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-0.5">Un link y tus invitados confirman en un tap.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-2xl border bg-card p-4 shadow-card">
            <div className="gradient-primary h-10 w-10 rounded-xl flex items-center justify-center shrink-0">
              <PartyPopper className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Gestiona tu lista de asistentes</p>
              <p className="text-xs text-muted-foreground mt-0.5">Aprueba, rechaza y envía actualizaciones.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate("/auth?mode=signup")}
            className="gradient-primary w-full h-12 text-primary-foreground font-bold text-base shadow-elevated"
          >
            Crear cuenta gratis
          </Button>
          <button
            onClick={() => navigate("/auth?mode=login")}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Ya tengo cuenta → <span className="font-semibold text-primary">Iniciar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
