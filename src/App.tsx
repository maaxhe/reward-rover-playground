import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FloatingGuide } from "@/components/RL/FloatingGuide";
// The admin dashboard is rarely opened — keep it (and its deps) out of the main bundle.
const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Datenschutz = lazy(() => import("./pages/Datenschutz"));
const Impressum = lazy(() => import("./pages/Impressum"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ClassroomHome = lazy(() => import("./pages/classroom/ClassroomHome"));
const ClassroomHost = lazy(() => import("./pages/classroom/ClassroomHost"));
const ClassroomPlay = lazy(() => import("./pages/classroom/ClassroomPlay"));
const ClassroomBeamer = lazy(() => import("./pages/classroom/ClassroomBeamer"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/spiel" element={<Index />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/klasse" element={<ClassroomHome />} />
          <Route path="/klasse/host/:code" element={<ClassroomHost />} />
          <Route path="/klasse/play/:code" element={<ClassroomPlay />} />
          <Route path="/klasse/beamer/:code" element={<ClassroomBeamer />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <FloatingGuide />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
