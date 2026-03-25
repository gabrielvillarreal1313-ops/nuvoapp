import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: "+52", label: "🇲🇽 +52", country: "MX" },
  { code: "+1", label: "🇺🇸 +1", country: "US" },
  { code: "+34", label: "🇪🇸 +34", country: "ES" },
  { code: "+54", label: "🇦🇷 +54", country: "AR" },
  { code: "+57", label: "🇨🇴 +57", country: "CO" },
  { code: "+56", label: "🇨🇱 +56", country: "CL" },
  { code: "+55", label: "🇧🇷 +55", country: "BR" },
  { code: "+51", label: "🇵🇪 +51", country: "PE" },
  { code: "+44", label: "🇬🇧 +44", country: "GB" },
  { code: "+49", label: "🇩🇪 +49", country: "DE" },
];

function parsePhone(value: string): { countryCode: string; number: string } {
  if (!value || !value.trim()) return { countryCode: "+52", number: "" };
  const trimmed = value.trim();
  for (const cc of COUNTRY_CODES) {
    if (trimmed.startsWith(cc.code)) {
      return { countryCode: cc.code, number: trimmed.slice(cc.code.length).trim() };
    }
  }
  if (trimmed.startsWith("+")) {
    const match = trimmed.match(/^(\+\d{1,3})\s*(.*)/);
    if (match) return { countryCode: match[1], number: match[2] };
  }
  return { countryCode: "+52", number: trimmed };
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const PhoneInput = ({ value, onChange, required }: PhoneInputProps) => {
  const parsed = parsePhone(value);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [number, setNumber] = useState(parsed.number);

  useEffect(() => {
    const p = parsePhone(value);
    setCountryCode(p.countryCode);
    setNumber(p.number);
  }, [value]);

  const emit = (code: string, num: string) => {
    const clean = num.replace(/[^\d\s]/g, "").trim();
    onChange(clean ? `${code} ${clean}` : "");
  };

  return (
    <div className="flex gap-2">
      <Select
        value={countryCode}
        onValueChange={(code) => {
          setCountryCode(code);
          emit(code, number);
        }}
      >
        <SelectTrigger className="w-[100px] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((cc) => (
            <SelectItem key={cc.code} value={cc.code}>
              {cc.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        placeholder="55 1234 5678"
        value={number}
        onChange={(e) => {
          const val = e.target.value;
          setNumber(val);
          emit(countryCode, val);
        }}
        required={required}
      />
    </div>
  );
};

export default PhoneInput;
