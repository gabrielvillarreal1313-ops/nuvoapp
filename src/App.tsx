// App entry
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import CreateEvent from "./pages/CreateEvent";
import EventPage from "./pages/EventPage";
import HostPanel from "./pages/HostPanel";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

const SHOW_BOTTOM_NAV = ["/", "/perfil"];

const AppRoutes = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const showNav = SHOW_BOTTOM_NAV.includes(location.pathname) && !!user;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={user ? <Home /> : <Landing />} />
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/crear" element={user ? <CreateEvent /> : <Navigate to="/" replace />} />
        <Route path="/perfil" element={user ? <Profile /> : <Navigate to="/" replace />} />
        <Route path="/e/:eventKey" element={<EventPage />} />
        <Route path="/h/:eventKey" element={<HostPanel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
