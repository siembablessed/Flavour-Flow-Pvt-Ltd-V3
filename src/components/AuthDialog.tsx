import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AuthDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Successfully logged in!");
        onOpenChange(false);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Registration successful! You may need to verify your email.");
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-6 border-border/50">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold text-center">
            {isLogin ? "Welcome Back" : "Create Account"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isLogin ? "Sign in to your account to continue" : "Sign up for a new account today"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-accent/50 outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-accent/50 outline-none"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 rounded-xl brand-gradient text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary/20"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-foreground/60 border-t border-border pt-4">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-accent font-semibold hover:underline"
          >
            {isLogin ? "Join now" : "Sign in"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
