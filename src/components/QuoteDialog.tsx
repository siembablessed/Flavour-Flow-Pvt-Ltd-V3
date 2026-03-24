import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { MapSelector } from "./MapSelector";

interface LocationData {
  name: string;
  lat: number;
  lng: number;
}

export function QuoteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [form, setForm] = useState<{
    from: LocationData | null;
    to: LocationData | null;
    cases: string;
  }>({ from: null, to: null, cases: "" });
  const [quote, setQuote] = useState<number | null>(null);

  const handleQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from || !form.to || !form.cases) {
      toast.error("Please pick locations on the map and fill all fields");
      return;
    }
    
    const R = 6371; // Radius of the earth in km
    const dLat = (form.to.lat - form.from.lat) * Math.PI / 180;
    const dLon = (form.to.lng - form.from.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(form.from.lat * Math.PI / 180) * Math.cos(form.to.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distanceCost = distanceKm * 0.45; // $0.45 per km
    const caseFactor = parseInt(form.cases) * 0.15; // $0.15 handling per case
    const total = Math.max(15, distanceCost + caseFactor); // Min $15 delivery
    
    setQuote(Math.round(total * 100) / 100);
    toast.success("Quotation ready!");
  };

  const inputClass = "w-full px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";

  // Reset quote when modal is opened
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setTimeout(() => setQuote(null), 300); // clear after animation
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-5 sm:p-6 border-border/50 max-h-[90vh] overflow-y-auto scrollbar-none">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-3 mx-auto border border-accent/20">
            <Truck className="w-6 h-6 text-accent" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center text-foreground">Delivery Estimate</DialogTitle>
          <DialogDescription className="text-center text-foreground/60">
            Get an instant transport quote for your order.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleQuote} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 gap-3">
            <MapSelector 
              label="Pickup Location" 
              value={form.from?.name || ""} 
              placeholder="Search or Pin Pickup..."
              onSelect={(name, lat, lng) => setForm(f => ({ ...f, from: { name, lat, lng } }))} 
            />
            <MapSelector 
              label="Delivery Location" 
              value={form.to?.name || ""} 
              placeholder="Search or Pin Delivery..."
              onSelect={(name, lat, lng) => setForm(f => ({ ...f, to: { name, lat, lng } }))} 
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground/70 mb-1.5 block uppercase tracking-wider">Number of Cases</label>
            <input type="number" min="1" placeholder="e.g. 10" value={form.cases} onChange={(e) => setForm({ ...form, cases: e.target.value })} className={inputClass} />
          </div>
          
          <button type="submit" className="w-full py-3 mt-1 rounded-xl brand-gradient text-white font-bold text-sm hover:opacity-90 transition-opacity active:scale-[0.98] shadow-lg shadow-primary/20">
            Calculate Estimate
          </button>

          {quote !== null && (
            <div className="bg-accent/5 border border-accent/15 rounded-xl p-5 text-center animate-fade-up mt-3">
              <p className="text-xs font-medium text-foreground/50 uppercase tracking-widest mb-1.5">Estimated Cost</p>
              <p className="text-4xl font-extrabold text-accent tabular-nums tracking-tight">${quote.toFixed(2)}</p>
              <p className="text-sm font-medium text-foreground/60 mt-2 truncate px-2">
                {form.from?.name.split(',')[0]} <span className="text-foreground/30 mx-1">→</span> {form.to?.name.split(',')[0]}
              </p>
              <p className="text-xs text-foreground/50 mt-1">{form.cases} cases total</p>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
