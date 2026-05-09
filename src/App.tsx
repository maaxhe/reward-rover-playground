import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { RLGame } from "./components/RL/RLGame";
import { RLGameLevel } from "./components/RL/RLGameLevel";
import { LEVELS } from "./components/RL/levelConfig";

const queryClient = new QueryClient();

function FreeModeGuard() {
  const unlocked =
    parseInt(localStorage.getItem("rrp_level") || "1", 10) >= LEVELS.length ||
    localStorage.getItem("rrp_freemode") === "1";
  return unlocked ? <RLGame /> : <Navigate to="/" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/level" element={<RLGameLevel />} />
          <Route path="/free" element={<FreeModeGuard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
