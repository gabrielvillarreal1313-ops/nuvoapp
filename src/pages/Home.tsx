import { Link, useNavigate } from "react-router-dom";
import { Plus, PartyPopper, Calendar, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { formatEventDate, formatEventTime } from "@/lib/event-utils";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  SavedEvent,
  getEventDaysForMonth,
  getPastEvents,
  getSelectedDayEvents,
  getUpcomingEvents,
  mapGuestEvents,
  mapHostedEvents,
  mergeGuestEvents,
} from "@/lib/home-events-utils";

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_ES = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hostEvents, setHostEvents] = useState<SavedEvent[]>([]);
  const [guestEvents, setGuestEvents] = useState<SavedEvent[]>([]);
  const [today] = useState(new Date());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  useEffect(() => {
    let legacyHostEvents: SavedEvent[] = [];
    let legacyGuestEvents: SavedEvent[] = [];

    try {
      const raw = localStorage.getItem("hostEvents");
      if (raw) {
        const parsed = JSON.parse(raw);
        legacyHostEvents = parsed.map((e: any) => ({ ...e, role: "host" as const }));
      }
    } catch {}

    const loadHostedEvents = async () => {
      if (!user) {
        setHostEvents(legacyHostEvents);
        return;
      }

      try {
        const response = await api.getMyHostedEvents();
        const backendEvents = mapHostedEvents(response.events || []);
        setHostEvents(backendEvents);
      } catch {
        setHostEvents(legacyHostEvents);
      }
    };

    loadHostedEvents();

    try {
      const raw = localStorage.getItem("guestEvents");
      if (raw) {
        const parsed = JSON.parse(raw);
        legacyGuestEvents = parsed.map((e: any) => ({ ...e, role: "guest" as const }));
      }
    } catch {}

    const loadGuestEvents = async () => {
      if (!user) {
        setGuestEvents(legacyGuestEvents);
        return;
      }

      try {
        const response = await api.getMyGuestEvents();
        const backendGuestEvents = mapGuestEvents(response.events || []);
        setGuestEvents(mergeGuestEvents(backendGuestEvents, legacyGuestEvents));
      } catch {
        setGuestEvents(legacyGuestEvents);
      }
    };

    loadGuestEvents();
  }, [user?.id]);

  const allEvents: SavedEvent[] = [...hostEvents, ...guestEvents];
  const nowIso = new Date().toISOString();

  const eventDays = getEventDaysForMonth(allEvents, calYear, calMonth);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    setSelectedDay(null);
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const selectedDayEvents = getSelectedDayEvents(allEvents, calYear, calMonth, selectedDay);

  const upcomingEvents = getUpcomingEvents(allEvents, nowIso, 5);

  const pastEvents = getPastEvents(allEvents, nowIso, 3);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary px-5 pb-7 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary-foreground tracking-tight">Nuvo</h1>
            <p className="text-sm text-primary-foreground/75 mt-0.5">Tu espacio para organizar y responder invitaciones</p>
          </div>
          <Button
            onClick={() => navigate("/crear")}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-elevated"
            size="sm"
          >
            <Plus className="mr-1 h-4 w-4" /> Crear
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-5 space-y-6">
        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">‹</button>
            <span className="font-display font-semibold text-sm">
              {MONTHS_ES[calMonth]} {calYear}
            </span>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">›</button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS_ES.map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
              const isSelected = day === selectedDay;
              const hasEvent = eventDays.has(day);
              return (
                <div
                  key={day}
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => setSelectedDay(prev => prev === day ? null : day)}
                >
                  <div className={`h-8 w-8 flex items-center justify-center rounded-full text-sm font-medium transition-all
                    ${isSelected ? "gradient-primary text-primary-foreground ring-2 ring-primary/40" :
                      isToday ? "bg-accent text-accent-foreground font-bold" : "hover:bg-muted"}
                  `}>
                    {day}
                  </div>
                  {hasEvent && <div className={`h-1 w-1 rounded-full mt-0.5 ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {selectedDay !== null && (
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {selectedDay} de {MONTHS_ES[calMonth]}
            </h2>
            {selectedDayEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDayEvents.map((ev) => (
                  <Link
                    key={`sel-${ev.role}-${ev.eventKey}`}
                    to={ev.role === "host" ? (ev.hostUrl || `/h/${ev.eventKey}`) : `/e/${ev.eventKey}`}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card hover:shadow-elevated transition-all"
                  >
                    <div className="gradient-primary h-10 w-10 rounded-xl flex items-center justify-center shrink-0">
                      <PartyPopper className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{ev.title}</p>
                      {ev.startAt && (
                        <p className="text-xs text-muted-foreground">{formatEventTime(ev.startAt, ev.timezone)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ev.role === "host" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {ev.role === "host" ? "Host" : "RSVP"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-muted p-5 text-center">
                <p className="text-sm text-muted-foreground">Sin eventos este día</p>
                <Button
                  onClick={() => navigate("/crear")}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  <Plus className="mr-1 h-3 w-3" /> Crear evento
                </Button>
              </div>
            )}
          </div>
        )}

        {upcomingEvents.length > 0 ? (
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Tus próximas invitaciones
            </h2>
            <div className="space-y-2">
              {upcomingEvents.map((ev) => (
                <Link
                  key={`${ev.role}-${ev.eventKey}`}
                  to={ev.role === "host" ? (ev.hostUrl || `/h/${ev.eventKey}`) : `/e/${ev.eventKey}`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card hover:shadow-elevated transition-all"
                >
                  <div className="gradient-primary h-10 w-10 rounded-xl flex items-center justify-center shrink-0">
                    <PartyPopper className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{ev.title}</p>
                    {ev.startAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatEventDate(ev.startAt, ev.timezone).split(",")[0]} · {formatEventTime(ev.startAt, ev.timezone)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ev.role === "host" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {ev.role === "host" ? "Host" : "RSVP"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-muted p-8 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-display font-semibold text-muted-foreground">Sin eventos próximos</p>
            <p className="text-sm text-muted-foreground mt-1">¡Crea uno y empieza a organizar!</p>
            <Button
              onClick={() => navigate("/crear")}
              className="gradient-primary mt-4 text-primary-foreground font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" /> Crear evento
            </Button>
          </div>
        )}

        {pastEvents.length > 0 && (
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Anteriores
            </h2>
            <div className="space-y-2">
              {pastEvents.map((ev) => (
                <Link
                  key={`past-${ev.role}-${ev.eventKey}`}
                  to={ev.role === "host" ? (ev.hostUrl || `/h/${ev.eventKey}`) : `/e/${ev.eventKey}`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 opacity-60 hover:opacity-80 transition-opacity"
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ev.title}</p>
                    {ev.startAt && (
                      <p className="text-xs text-muted-foreground">{formatEventDate(ev.startAt, ev.timezone).split(",")[0]}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
