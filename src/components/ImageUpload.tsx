import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

const MAX_SIZE = 5 * 1024 * 1024;

const ImageUpload = ({ value, onChange }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("La imagen no puede pesar más de 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("event-covers")
        .upload(path, file, { contentType: file.type });

      if (error) throw error;

      const { data } = supabase.storage
        .from("event-covers")
        .getPublicUrl(path);

      onChange(data.publicUrl);
    } catch (err: any) {
      toast.error(err.message || "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleRemove = () => {
    onChange("");
  };

  if (value) {
    return (
      <div className="relative mt-1 overflow-hidden rounded-xl border">
        <img src={value} alt="Portada" className="h-40 w-full object-cover" />
        <button
          type="button"
          onClick={handleRemove}
          className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur-sm hover:bg-background"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-1 flex h-32 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <ImagePlus className="h-5 w-5" />
            Elegir imagen de portada
          </>
        )}
      </button>
    </>
  );
};

export default ImageUpload;
