import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";

interface MapSelectorProps {
  label: string;
  value: string;
  onSelect: (location: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
}

export function MapSelector({ label, value, onSelect, placeholder, className }: MapSelectorProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchLocations = async (q: string) => {
    if (!q || q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=zw&limit=5`);
      const data = await res.json();
      setResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (value && val !== value) {
      onSelect("", 0, 0); 
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => searchLocations(val), 600);
  };

  return (
    <div className="flex flex-col relative" ref={containerRef}>
      <label className="text-xs font-semibold text-foreground/70 mb-1.5 block uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder || "Search location..."}
          className={`w-full pl-9 pr-4 py-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow ${className || ""}`}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-[100%] left-0 right-0 mt-2 bg-card border border-border shadow-xl rounded-xl overflow-hidden z-[200] max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const name = r.display_name.split(',').slice(0, 3).join(', ');
                setQuery(name);
                onSelect(name, parseFloat(r.lat), parseFloat(r.lon));
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-muted border-b last:border-0 border-border transition-colors flex items-start gap-3"
            >
              <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
      
      {open && query.length >= 3 && !loading && results.length === 0 && (
        <div className="absolute top-[100%] left-0 right-0 mt-2 bg-card border border-border shadow-md rounded-xl p-4 z-[200] text-sm text-foreground/60 text-center">
          No matching locations found.
        </div>
      )}
    </div>
  );
}
