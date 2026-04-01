import { useState, createContext, useContext } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import PaymentComplete from "./pages/PaymentComplete.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminRedirect from "./pages/admin/AdminRedirect.tsx";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage.tsx";
import AdminCataloguePage from "./pages/admin/AdminCataloguePage.tsx";
import AdminInventoryPage from "./pages/admin/AdminInventoryPage.tsx";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage.tsx";
import { AuthDialog } from "./components/AuthDialog";

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
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminRedirect />} />
              <Route path="overview" element={<AdminOverviewPage />} />
              <Route path="catalogue" element={<AdminCataloguePage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
            </Route>
            <Route path="/payment/complete" element={<PaymentComplete />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
