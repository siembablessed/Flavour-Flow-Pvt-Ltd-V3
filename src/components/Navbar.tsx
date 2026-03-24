import { useState, useEffect } from "react";
import { ShoppingCart, Menu, X, Search, LogOut } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { AuthDialog } from "./AuthDialog";
import logo from "@/assets/logo.png";

interface NavbarProps {
  onNavigate: (section: string) => void;
  onCartOpen: () => void;
  searchQuery: string;
  onSearch: (query: string) => void;
}

const Navbar = ({ onNavigate, onCartOpen, searchQuery, onSearch }: NavbarProps) => {
  const { totalItems } = useCart();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const links = [
    { label: "About Us", section: "about" },
    { label: "Products", section: "products" },
    { label: "Delivery Location", section: "transport" },
    { label: "Contact", section: "contact" },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
    if (mobileOpen) setMobileOpen(false);
  };

  const clearSearchAndNavigate = () => {
    onSearch("");
    onNavigate("products");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="flex items-center justify-between h-16 sm:h-20 xl:h-24 2xl:h-28 gap-4">
          {/* Logo */}
          <button onClick={clearSearchAndNavigate} className="flex-shrink-0 flex items-center -ml-2 group">
            <img src={logo} alt="Flavour Flow" className="h-20 sm:h-24 xl:h-28 2xl:h-32 w-auto" />
          </button>

          {/* Centered Search Bar (Desktop) */}
          <div className="flex-1 max-w-2xl xl:max-w-3xl 2xl:max-w-4xl hidden md:block px-4">
            <form onSubmit={handleSearchSubmit} className="relative w-full shadow-sm rounded-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 xl:h-6 xl:w-6 text-accent" />
              </div>
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search name, code or barcode"
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 xl:py-4 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-full text-sm xl:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              />
              <button type="submit" className="hidden">Search</button>
            </form>
          </div>

          {/* Links & Actions */}
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="hidden lg:flex items-center gap-1 mr-2">
              {links.map((l) => (
                <button
                  key={l.section}
                  onClick={() => onNavigate(l.section)}
                  className="px-3 py-2 text-sm font-semibold transition-colors"
                  style={{ color: '#1B3674' }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#F59714'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#1B3674'}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <div className="hidden sm:flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 ml-1">
                  <span className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{user.email?.split('@')[0]}</span>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <button onClick={signOut} className="text-gray-500 hover:text-red-500 transition-colors" title="Sign Out">
                    <LogOut className="w-4 h-4 font-bold" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setAuthOpen(true)}
                  className="hidden sm:inline-flex items-center justify-center px-6 py-2.5 rounded-full font-bold text-sm focus:ring-4 transition-all active:scale-95 whitespace-nowrap"
                  style={{ backgroundColor: '#1B3674', color: 'white' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3d5aa8'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1B3674'}
                >
                  Sign in / Join
                </button>
              )}

              <button
                onClick={onCartOpen}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Open cart"
                onMouseOver={(e) => { const svg = e.currentTarget.querySelector('svg'); if (svg) svg.style.color = '#F59714'; }}
                onMouseOut={(e) => { const svg = e.currentTarget.querySelector('svg'); if (svg) svg.style.color = '#1B3674'; }}
              >
                <ShoppingCart className="w-6 h-6" style={{ color: '#1B3674' }} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-white text-[11px] flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </button>

              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-6 h-6 text-gray-800" /> : <Menu className="w-6 h-6 text-gray-800" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar & Menu Expansion */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-96 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
          <form onSubmit={handleSearchSubmit} className="relative w-full mb-4 px-2">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-accent" />
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
          </form>
          <div className="px-2 space-y-1">
            {links.map((l) => (
              <button
                key={l.section}
                onClick={() => { onNavigate(l.section); setMobileOpen(false); }}
                className="block w-full text-left py-3 px-4 text-sm font-semibold hover:bg-gray-50 rounded-xl transition-colors"
                style={{ color: '#1B3674' }}
                onMouseOver={(e) => e.currentTarget.style.color = '#F59714'}
                onMouseOut={(e) => e.currentTarget.style.color = '#1B3674'}
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={() => { onCartOpen(); setMobileOpen(false); }}
              className="block w-full text-left py-3 px-4 text-sm font-semibold hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-2"
              style={{ color: '#1B3674' }}
              onMouseOver={(e) => e.currentTarget.style.color = '#F59714'}
              onMouseOut={(e) => e.currentTarget.style.color = '#1B3674'}
            >
              <ShoppingCart className="w-4 h-4" />
              Cart{totalItems > 0 && ` (${totalItems})`}
            </button>
            {user ? (
              <div className="mt-4 border-t border-gray-200 pt-4 px-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900 truncate">{user.email}</span>
                  <button onClick={() => { signOut(); setMobileOpen(false); }} className="text-gray-500 hover:text-red-500 font-semibold text-sm flex items-center gap-1 transition-colors">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setAuthOpen(true); setMobileOpen(false); }} className="w-full mt-2 inline-flex items-center justify-center px-6 py-3 rounded-full font-bold text-sm transition-colors" style={{ backgroundColor: '#1B3674', color: 'white' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3d5aa8'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1B3674'}>
                Sign in / Join
              </button>
            )}
          </div>
        </div>
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </nav>
  );
};

export default Navbar;
