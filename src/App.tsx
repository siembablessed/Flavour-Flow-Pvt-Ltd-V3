import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import PaymentComplete from "./pages/PaymentComplete.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import { AuthDialog } from "./components/AuthDialog";

// Protected admin route - shows auth dialog if not logged in with @flavourflows.com
function ProtectedAdminRoute() {
  const { user, session, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if logged in with @flavourflows.com email
  const email = (user?.email || "").toLowerCase();
  const isAllowed = email.endsWith("@flavourflows.com");

  // Need to sign in
  if (!session || !isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold text-foreground">Admin Access Required</h1>
          <p className="text-foreground/60">Please sign in with your @flavourflows.com account</p>
          <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
        </div>
      </div>
    );
  }

  // Authorized - show admin dashboard
  return <AdminDashboard />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<ProtectedAdminRoute />} />
            <Route path="/payment/complete" element={<PaymentComplete />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
