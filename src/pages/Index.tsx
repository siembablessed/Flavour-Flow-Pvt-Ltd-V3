import { useState, useCallback } from "react";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import ProductCatalog from "@/components/ProductCatalog";
import PromoSection from "@/components/PromoSection";
import TransportQuote from "@/components/TransportQuote";
import ContactSection from "@/components/ContactSection";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";

const Index = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const scrollTo = useCallback((section: string) => {
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <CartProvider>
      <div className="min-h-screen bg-background">
        <Navbar onNavigate={scrollTo} onCartOpen={() => setCartOpen(true)} searchQuery={searchQuery} onSearch={setSearchQuery} />
        <ProductCatalog searchQuery={searchQuery} />
        <PromoSection onNavigate={scrollTo} />
        <TransportQuote />
        <ContactSection />
        
        {/* About Us Section */}
        <section id="about" className="py-16 px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
          <div className="max-w-[1800px] mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">About Us</h2>
              <div className="w-24 h-1 bg-accent mx-auto rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Company Info Card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Who We Are</h3>
                <p className="text-gray-300 leading-relaxed">
                  At Flavour Flow we supply alcoholic beverages, imported and local. We have our own transport to deliver to every corner of Zimbabwe. Flavour Flow imports from South Africa and Zambia currently.
                </p>
              </div>

              {/* Headquarters Card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Headquarters</h3>
                <p className="text-gray-300 leading-relaxed">
                  10960 Mapako<br />
                  Chinhoyi<br />
                  Zimbabwe
                </p>
              </div>

              {/* Contact Card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Contact Numbers</h3>
                <p className="text-gray-300 leading-relaxed">
                  00263 7714 20031<br />
                  +263 78 906 3927
                </p>
              </div>
            </div>
          </div>
        </section>
        <Footer />
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </div>
    </CartProvider>
  );
};

export default Index;
