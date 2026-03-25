import { Link } from "react-router-dom";
import { PartyPopper, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface SavedEvent {
  eventKey: string;
  title: string;
  hostUrl: string;
}

const Index = () => {
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hostEvents');
      if (raw) setSavedEvents(JSON.parse(raw));
    } catch {}
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="gradient-primary flex h-16 w-16 items-center justify-center rounded-2xl">
            <PartyPopper className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Juntada</h1>
          <p className="text-center text-muted-foreground">
            Organiza eventos y comparte por WhatsApp.<br />Sin cuentas, sin complicaciones.
          </p>
        </div>

        <Link to="/crear" className="block">
          <Button className="gradient-primary w-full py-6 text-lg font-semibold text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity">
            <Plus className="mr-2 h-5 w-5" />
            Crear evento
          </Button>
        </Link>

        {savedEvents.length > 0 && (
          <div className="mt-10 animate-slide-up">
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tus eventos
            </h2>
            <div className="space-y-2">
              {savedEvents.map((ev) => (
                <Link
                  key={ev.eventKey}
                  to={ev.hostUrl}
                  className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-elevated"
                >
                  <span className="font-medium">{ev.title}</span>
                  <span className="text-xs text-muted-foreground">Admin →</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
