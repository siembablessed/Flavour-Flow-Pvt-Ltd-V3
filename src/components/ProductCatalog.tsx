import { useState, useRef, useEffect } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { products, categories, Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

interface ProductCatalogProps {
  searchQuery: string;
}

const ProductCatalog = ({ searchQuery }: ProductCatalogProps) => {
  const [activeCategory, setActiveCategory] = useState("All");
  const { addItem } = useCart();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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
    return matchCat && matchSearch;
  });

  const handleAdd = (product: Product) => {
    addItem(product);
    toast.success(`${product.name} added to cart`);
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
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((product, i) => (
            <div
              key={product.id}
              className={`group bg-card rounded-xl p-5 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300 ${
                visible ? "animate-fade-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-block text-[10px] uppercase tracking-widest text-primary font-bold mb-1">{product.category}</span>
                  <h3 className="text-sm font-bold text-foreground leading-snug truncate">{product.name}</h3>
                </div>
                <span className="text-[10px] text-foreground/30 bg-muted px-2 py-0.5 rounded font-mono ml-2 flex-shrink-0">{product.code}</span>
              </div>
              <p className="text-xs text-foreground/40 mb-4">{product.pack}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    ${product.casePrice.toFixed(2)}
                    <span className="text-xs text-foreground/30 font-normal ml-0.5">/case</span>
                  </p>
                  <p className="text-[11px] text-foreground/40 tabular-nums">${product.unitPriceVat.toFixed(2)}/unit incl. VAT</p>
                </div>
                <button
                  onClick={() => handleAdd(product)}
                  className="p-2.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors active:scale-95 shadow-sm"
                  aria-label={`Add ${product.name} to cart`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-foreground/40">No products match your search.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductCatalog;
