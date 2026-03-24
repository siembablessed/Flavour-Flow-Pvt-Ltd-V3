import { useState, useRef, useEffect } from "react";
import { Truck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { MapSelector } from "./MapSelector";

interface LocationData {
  name: string;
  lat: number;
  lng: number;
}

const TransportQuote = () => {
  const [form, setForm] = useState<{
    to: LocationData | null;
    cases: string;
    name: string;
    phone: string;
  }>({ to: null, cases: "", name: "", phone: "" });
  const [quote, setQuote] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const handleQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.to || !form.cases) {
      toast.error("Please select a delivery location and fill all required fields");
      return;
    }
    
    // Fixed pickup location - warehouse in Harare
    const fromLat = -17.8252; // Harare coordinates
    const fromLng = 31.0335;
    
    // Haversine distance
    const R = 6371; // Radius of the earth in km
    const dLat = (form.to.lat - fromLat) * Math.PI / 180;
    const dLon = (form.to.lng - fromLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(fromLat * Math.PI / 180) * Math.cos(form.to.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distanceCost = distanceKm * 0.45; // $0.45 per km
    const caseFactor = parseInt(form.cases) * 0.15; // $0.15 handling per case
    const total = Math.max(15, distanceCost + caseFactor); // Min $15 delivery
    
    setQuote(Math.round(total * 100) / 100);
    toast.success("Quotation ready!");
  };

  const inputClass = "w-full px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-foreground/30 transition-shadow";

  return (
    <section id="transport" ref={sectionRef} className="py-20 px-4">
      <div className={`max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 transition-all duration-700 ${visible ? "animate-fade-up" : "opacity-0"}`}>
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 xl:gap-16">
          {/* Left info */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
              <Truck className="w-6 h-6 xl:w-7 xl:h-7 text-accent" />
            </div>
            <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-foreground mb-3">Choose Delivery Location</h2>
            <p className="text-foreground/50 text-sm xl:text-base leading-relaxed mb-6">
              Get an instant transport quote for your order. We deliver to all major cities and towns across Zimbabwe.
            </p>
            <div className="space-y-3">
              {["Same-day dispatch from Harare", "Refrigerated trucks available", "Bulk order discounts"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-foreground/60">
                  <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Right form */}
          <form onSubmit={handleQuote} className="lg:col-span-3 bg-card border border-border rounded-2xl p-6 lg:p-8 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MapSelector 
                label="Delivery Location" 
                value={form.to?.name || ""} 
                placeholder="Search delivery location..."
                onSelect={(name, lat, lng) => setForm(f => ({ ...f, to: { name, lat, lng } }))} 
                className="bg-muted/50 border-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/50 mb-1.5 block">Number of Cases *</label>
              <input type="number" min="1" placeholder="e.g. 10" value={form.cases} onChange={(e) => setForm({ ...form, cases: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground/50 mb-1.5 block">Your Name</label>
                <input type="text" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/50 mb-1.5 block">Phone</label>
                <input type="tel" placeholder="0771234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              </div>
            </div>
            <button type="submit" className="w-full py-3.5 rounded-lg brand-gradient text-white font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.97] shadow-md shadow-primary/15">
              Calculate Estimate
            </button>

            {quote !== null && (
              <div className="bg-accent/5 border border-accent/15 rounded-xl p-5 text-center animate-fade-up">
                <p className="text-xs text-foreground/40 mb-1">Estimated Cost</p>
                <p className="text-3xl font-bold text-accent tabular-nums">${quote.toFixed(2)}</p>
                <p className="text-xs text-foreground/40 mt-1.5 truncate px-2">
                  Harare Warehouse → {form.to?.name.split(',')[0]} · {form.cases} cases
                </p>
                <p className="text-[10px] text-foreground/30 mt-2">Estimate only. Final price may vary.</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default TransportQuote;
