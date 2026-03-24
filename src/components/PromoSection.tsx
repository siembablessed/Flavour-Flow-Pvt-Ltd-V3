import { useState, useEffect } from "react";
import { Sparkles, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

const promoSlides = [
  {
    id: 1,
    eyebrow: "Afdis Authorized Wholesale Partner",
    title: "Wholesale case deals ready for retail and hospitality buyers",
    description:
      "Browse fast-moving spirits, wines and ciders with dependable dispatch and trade-friendly pricing.",
    accent: "from-amber-400 via-orange-400 to-yellow-300",
  },
  {
    id: 2,
    eyebrow: "Exclusive Range",
    title: "Premium bottles curated for shelves, events and restaurant menus",
    description:
      "Keep your offering fresh with standout whisky, brandy, gin and wine selections.",
    accent: "from-fuchsia-400 via-rose-400 to-orange-300",
  },
  {
    id: 3,
    eyebrow: "Bulk Deals",
    title: "Repeat-order stock lines with smooth quotes and nationwide delivery",
    description:
      "Move quickly from enquiry to order with clear pricing and transport support.",
    accent: "from-sky-400 via-cyan-400 to-emerald-300",
  },
];

interface PromoSectionProps {
  onNavigate: (section: string) => void;
}

const PromoSection = ({ onNavigate }: PromoSectionProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const slide = promoSlides[currentSlide];

  return (
    <section className="bg-background px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8 xl:px-12 2xl:px-16">
      <div className="max-w-[1800px] mx-auto">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[#0e1c38] text-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_auto] lg:items-center lg:px-10 lg:py-8">
            <div className="relative min-h-[180px]">
              {promoSlides.map((item, index) => (
                <div
                  key={item.id}
                  className={`absolute inset-0 transition-all duration-500 ${
                    index === currentSlide
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-3 opacity-0"
                  }`}
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {item.eyebrow}
                  </div>

                  <h2 className="mt-4 max-w-3xl text-2xl xl:text-3xl 2xl:text-4xl font-bold leading-tight sm:text-3xl">
                    {item.title}
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm xl:text-base leading-7 text-slate-300 sm:text-base">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-start gap-4 lg:items-end">
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setCurrentSlide(
                      (prev) => (prev - 1 + promoSlides.length) % promoSlides.length
                    )
                  }
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label="Previous promotion"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  onClick={() =>
                    setCurrentSlide((prev) => (prev + 1) % promoSlides.length)
                  }
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label="Next promotion"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={() => onNavigate("products")}
                className={`inline-flex items-center gap-3 rounded-full bg-gradient-to-r ${slide.accent} px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition-transform hover:-translate-y-0.5`}
              >
                View current wholesale deals
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="flex gap-2">
                {promoSlides.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      currentSlide === index ? "w-8 bg-primary" : "w-2.5 bg-white/30"
                    }`}
                    aria-label={`Go to promotion ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoSection;
