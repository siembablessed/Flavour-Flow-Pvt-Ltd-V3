import { useState, useRef, useEffect } from "react";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

const ContactSection = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.message) {
      toast.error("Please fill in your name and message");
      return;
    }
    toast.success("Message sent! We'll get back to you shortly.");
    setForm({ name: "", email: "", phone: "", message: "" });
  };

  const inputClass = "w-full px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-foreground/30 transition-shadow";

  const contactInfo = [
    { icon: Phone, label: "Head Office", value: "+263 77 142 0031", href: "tel:+263771420031" },
    { icon: Phone, label: "Call Us", value: "+263 4 333780 / 302119", href: "tel:+2634333780" },
    { icon: Mail, label: "Orders", value: "0772 234 642", href: "tel:0772234642" },
    { icon: MapPin, label: "Address", value: "10960, Mapako, Chinhoyi" },
  ];

  return (
    <section id="contact" ref={sectionRef} className="py-20 px-4 bg-muted/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className={`mb-10 transition-all duration-700 ${visible ? "animate-fade-up" : "opacity-0"}`}>
          <h2 className="text-3xl font-bold text-foreground mb-1">Contact Us</h2>
          <p className="text-foreground/50 text-sm">Questions about bulk orders, pricing, or delivery? Reach out.</p>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-5 gap-8 transition-all duration-700 delay-100 ${visible ? "animate-fade-up" : "opacity-0"}`}>
          <div className="lg:col-span-2 space-y-5">
            {contactInfo.map((info, i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <info.icon className="w-4.5 h-4.5 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground/40 mb-0.5">{info.label}</p>
                  {info.href ? (
                    <a href={info.href} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{info.value}</a>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{info.value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-5 border-t border-border">
              <p className="text-xs font-medium text-foreground/40 mb-3">Regional Offices</p>
              <div className="space-y-2 text-sm text-foreground/60">
                <p>Kwekwe — 055 23747</p>
                <p>Bulawayo — 09 70611</p>
                <p>Mutare — 020 64341</p>
                <p>Masvingo — 039 262397</p>
                <p>Vic Falls — 013 45956</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="lg:col-span-3 bg-card border border-border rounded-2xl p-6 lg:p-8 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground/50 mb-1.5 block">Name *</label>
                <input type="text" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/50 mb-1.5 block">Email</label>
                <input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/50 mb-1.5 block">Phone</label>
              <input type="tel" placeholder="0771234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/50 mb-1.5 block">Message *</label>
              <textarea rows={4} placeholder="Tell us about your order or inquiry..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputClass + " resize-none"} />
            </div>
            <button type="submit" className="w-full py-3.5 rounded-lg brand-gradient text-white font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.97] flex items-center justify-center gap-2 shadow-md shadow-primary/15">
              <Send className="w-4 h-4" /> Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
