import { useState, useRef, useEffect } from "react";
import { Plus, SlidersHorizontal, Truck, Package, Shield, Star, Heart } from "lucide-react";
import { Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useCatalog } from "@/hooks/useCatalog";
import { useSavedCatalog } from "@/hooks/useSavedCatalog";
import { getProductImage } from "@/lib/productImages";

// Dummy ads data
const sidebarAds = [
  {
    id: 1,
    title: "Free Delivery",
    subtitle: "On orders over $500",
    description: "Get your wholesale orders delivered free to your door",
    icon: Truck,
    bg: "bg-gradient-to-br from-green-500 to-green-600",
    iconBg: "bg-white/20",
    text: "text-white",
    badge: "FREE",
    badgeBg: "bg-yellow-400",
    badgeText: "text-green-800",
  },
  {
    id: 2,
    title: "Bulk Savings",
    subtitle: "Up to 15% off",
    description: "Special discounts on case quantity orders",
    icon: Package,
    bg: "bg-gradient-to-br from-orange-500 to-red-500",
    iconBg: "bg-white/20",
    text: "text-white",
    badge: "SAVE",
    badgeBg: "bg-white",
    badgeText: "text-orange-600",
  },
  {
    id: 3,
    title: "100% Authentic",
    subtitle: "Afdis Authorized",
    description: "Every product is genuine and quality guaranteed",
    icon: Shield,
    bg: "bg-gradient-to-br from-blue-600 to-indigo-700",
    iconBg: "bg-white/20",
    text: "text-white",
    badge: "VERIFIED",
    badgeBg: "bg-green-400",
    badgeText: "text-green-900",
  },
];

// Featured product ad
const featuredAd = {
  title: "Featured Product",
  productName: "Gold Blend Black",
  description: "Premium whisky case deal",
  price: "$58.18",
  originalPrice: "$72.00",
  discount: "19% OFF",
  bg: "bg-gradient-to-br from-[#1B3674] via-[#2a4a8a] to-[#1B3674]",
  badgeBg: "bg-yellow-400",
  badgeText: "text-green-800",
};

interface ProductCatalogProps {
  searchQuery: string;
}

const ProductCatalog = ({ searchQuery }: ProductCatalogProps) => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [savedOnly, setSavedOnly] = useState(false);
  const { addItem } = useCart();
  const { user } = useAuth();
  const { data: products = [], isLoading, isError } = useCatalog();
  const { savedSet, saveCatalogItem, unsaveCatalogItem, isUpdating } = useSavedCatalog();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const categories = ["All", ...Array.from(new Set(products.map((product) => product.category)))];

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.05 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSaved = !savedOnly || savedSet.has(p.id);
    return matchCat && matchSearch && matchSaved;
  });

  const handleAdd = (product: Product) => {
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  const toggleSave = async (product: Product) => {
    if (!user) {
      toast.error("Sign in to save products to your catalogue");
      return;
    }

    try {
      if (savedSet.has(product.id)) {
        await unsaveCatalogItem(product.id);
        toast.success("Removed from saved catalogue");
      } else {
        await saveCatalogItem(product.id);
        toast.success("Saved to your catalogue");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update saved catalogue";
      toast.error(message);
    }
  };

  return (
    <section id="products" ref={sectionRef} className="py-16 px-4 bg-muted/30 pt-24 sm:pt-28 lg:pt-32 2xl:pt-36">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className={`mb-10 transition-all duration-700 ${visible ? "animate-fade-up" : "opacity-0"}`}>
          <div className="mb-8">
            <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-foreground mb-1">
              Product Catalogue
            </h2>
            <p className="text-foreground/50 text-sm xl:text-base">
              Wholesale case prices in USD · VAT-inclusive unit pricing shown
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <SlidersHorizontal className="w-4 h-4 text-foreground/30 flex-shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                  activeCategory === cat
                    ? "bg-accent text-white shadow-sm"
                    : "bg-card border border-border hover:border-primary/30"
                }`}
                style={activeCategory !== cat ? { color: '#1B3674' } : undefined}
              >
                {cat}
              </button>
            ))}
            {user && (
              <button
                onClick={() => setSavedOnly((prev) => !prev)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                  savedOnly
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card border border-border hover:border-primary/30 text-foreground"
                }`}
              >
                Saved Only
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
          {/* Products Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {filtered.map((product, i) => (
                <div
                  key={product.id}
                  className={`group relative overflow-hidden bg-card rounded-xl p-5 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300 ${
                    visible ? "animate-fade-up" : "opacity-0"
                  }`}
                  style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
                >
                  <div className="mb-3 flex items-start gap-3">
                    {getProductImage(product) && (
                      <div className="flex h-24 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-primary">{product.category}</span>
                        <span className="flex-shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground/30">{product.code}</span>
                      </div>
                      <h3 className="text-sm font-bold leading-snug text-foreground">{product.name}</h3>
                      <p className="mt-2 text-xs text-foreground/40">{product.pack}</p>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-lg font-bold tabular-nums text-foreground">
                        ${product.casePrice.toFixed(2)}
                        <span className="ml-0.5 text-xs font-normal text-foreground/30">/case</span>
                      </p>
                      <p className="text-[11px] tabular-nums text-foreground/40">${product.unitPriceVat.toFixed(2)}/unit incl. VAT</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void toggleSave(product)}
                        disabled={isUpdating}
                        className={`p-2.5 rounded-lg border transition-colors active:scale-95 ${
                          savedSet.has(product.id)
                            ? "border-rose-200 bg-rose-50 text-rose-600"
                            : "border-border text-foreground/50 hover:bg-muted"
                        }`}
                        aria-label={`Save ${product.name}`}
                      >
                        <Heart className={`w-4 h-4 ${savedSet.has(product.id) ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={() => handleAdd(product)}
                        className="rounded-lg bg-accent p-2.5 text-white shadow-sm transition-colors active:scale-95 hover:bg-accent/90"
                        aria-label={`Add ${product.name} to cart`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Ads - Right side on xl and above */}
          <div className="hidden xl:block w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* Featured Product Banner */}
              <div className={`p-5 rounded-xl ${featuredAd.bg} text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${featuredAd.badgeBg} ${featuredAd.badgeText} mb-2`}>
                  {featuredAd.discount}
                </span>
                <h4 className="font-bold text-xs text-white/70 mt-1">{featuredAd.title}</h4>
                <h3 className="font-bold text-lg mt-1">{featuredAd.productName}</h3>
                <p className="text-xs text-white/60 mt-1">{featuredAd.description}</p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-2xl font-bold">{featuredAd.price}</span>
                  <span className="text-sm text-white/50 line-through">{featuredAd.originalPrice}</span>
                </div>
                <button className="w-full mt-4 py-2 bg-white text-[#1B3674] text-xs font-bold rounded-lg hover:bg-white/90 transition-colors">
                  View Deal
                </button>
              </div>

              {sidebarAds.map((ad) => (
                <div
                  key={ad.id}
                  className={`p-4 rounded-xl ${ad.bg} text-white relative overflow-hidden group hover:shadow-lg transition-all cursor-pointer`}
                >
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full group-hover:scale-110 transition-transform"></div>
                  <div className="absolute -left-2 -bottom-2 w-10 h-10 bg-white/5 rounded-full"></div>
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`p-2.5 rounded-xl ${ad.iconBg}`}>
                      <ad.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${ad.badgeBg} ${ad.badgeText}`}>
                        {ad.badge}
                      </span>
                      <h4 className="font-bold text-sm mt-1">{ad.title}</h4>
                      <p className="text-xs text-white/80 mt-0.5">{ad.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/60 mt-3 relative z-10">{ad.description}</p>
                </div>
              ))}

              {/* Need Help Banner */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 text-white hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-white/60">Online Support</span>
                </div>
                <h4 className="font-bold text-lg">Need Help?</h4>
                <p className="text-xs text-white/60 mt-1 mb-4">Our team is ready to assist with your wholesale orders.</p>
                <button className="w-full py-2.5 bg-[#F59714] hover:bg-[#e88d0c] text-white text-sm font-bold rounded-lg transition-colors">
                  Chat Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-16">
            <p className="text-foreground/40">Loading catalog...</p>
          </div>
        )}

        {isError && (
          <div className="text-center py-16">
            <p className="text-destructive">Unable to load catalog from database.</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-foreground/40">No products match your search.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductCatalog;
