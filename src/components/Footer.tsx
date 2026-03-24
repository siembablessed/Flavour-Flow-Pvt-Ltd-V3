import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="border-t border-border py-8 px-4 bg-card">
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Flavour Flow" className="h-8 w-auto" />
        <div>
          <p className="text-sm font-bold text-foreground">Flavour Flow (Pvt) Ltd</p>
          <p className="text-[11px] text-foreground/40">Afdis Authorized Wholesale Partner</p>
        </div>
      </div>
      <p className="text-[11px] text-foreground/40">
        © {new Date().getFullYear()} Flavour Flow (Pvt) Ltd. All rights reserved. Drink responsibly. 18+
      </p>
    </div>
  </footer>
);

export default Footer;
