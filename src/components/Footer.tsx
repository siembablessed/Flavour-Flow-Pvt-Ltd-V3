import logo from "@/assets/logo.png";
import TermsSection from "@/components/TermsSection";

const Footer = () => (
  <footer className="border-t border-border bg-card px-4 py-8">
    <div className="mx-auto flex max-w-[1800px] flex-col gap-5 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Flavour Flow" className="h-8 w-auto" />
        <div>
          <p className="text-sm font-bold text-foreground">Flavour Flow (Pvt) Ltd</p>
          <p className="text-[11px] text-foreground/40">Afdis Authorized Wholesale Partner</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-[11px] text-foreground/50 md:items-end">
        <p>
          Phone: <a href="tel:00263771420031" className="font-semibold text-primary">00263 7714 20031</a>
        </p>
        <TermsSection triggerClassName="text-left font-medium text-primary transition-colors hover:text-primary/80 md:text-right" />
        <p>© {new Date().getFullYear()} Flavour Flow (Pvt) Ltd. All rights reserved. Drink responsibly. 18+</p>
      </div>
    </div>
  </footer>
);

export default Footer;
