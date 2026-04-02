import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, MessageCircle, PartyPopper } from "lucide-react";
import { copyToClipboard, getWhatsAppShareUrl, getShareInviteText } from "@/lib/event-utils";
import { toast } from "sonner";

interface Props {
  data: {
    event: any;
    guestUrl: string;
    hostUrl: string;
    hostToken: string;
  };
}

const EventCreatedModal = ({ data }: Props) => {
  const navigate = useNavigate();
  const [copiedGuest, setCopiedGuest] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);

  const handleCopy = async (text: string, type: 'guest' | 'host') => {
    const ok = await copyToClipboard(text);
    if (ok) {
      if (type === 'guest') setCopiedGuest(true);
      else setCopiedHost(true);
      toast.success("¡Copiado!");
      setTimeout(() => type === 'guest' ? setCopiedGuest(false) : setCopiedHost(false), 2000);
    }
  };

  const shareText = getShareInviteText(data.event.title, data.event.start_at, data.guestUrl);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md animate-bounce-in">
        <div className="rounded-2xl border bg-card p-6 shadow-elevated">
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="gradient-primary flex h-16 w-16 items-center justify-center rounded-full">
              <PartyPopper className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">¡Evento creado!</h1>
            <p className="text-center text-muted-foreground">{data.event.title}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Link para invitados</label>
              <div className="flex gap-2">
                <Input value={data.guestUrl} readOnly className="text-sm" />
                <Button variant="outline" size="icon" onClick={() => handleCopy(data.guestUrl, 'guest')}>
                  {copiedGuest ? <Check className="h-4 w-4 text-going" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <a href={getWhatsAppShareUrl(shareText)} target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full bg-[hsl(142,70%,40%)] py-5 text-base font-semibold text-primary-foreground hover:bg-[hsl(142,70%,35%)]">
                <MessageCircle className="mr-2 h-5 w-5" />
                Compartir por WhatsApp
              </Button>
            </a>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Link de administración (guárdalo)</label>
              <div className="flex gap-2">
                <Input value={data.hostUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={() => handleCopy(data.hostUrl, 'host')}>
                  {copiedHost ? <Check className="h-4 w-4 text-going" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1 text-xs text-destructive">⚠️ No compartas este link. Es tu acceso de admin.</p>
            </div>
          </div>

          <Button variant="outline" className="mt-6 w-full" onClick={() => navigate(`/h/${data.event.event_key}`)}>
            Ir al panel de administración →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventCreatedModal;
