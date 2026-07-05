import { Toaster } from "@/components/ui/sonner";
import { useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { ThemeProvider } from "next-themes";
import "./index.css";

const Auth = lazy(() => import("./pages/Auth.tsx"));
const Landing = lazy(() => import("./pages/Landing.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const CreditCards = lazy(() => import("./pages/CreditCards.tsx"));
const Transactions = lazy(() => import("./pages/Transactions.tsx"));
const Ledger = lazy(() => import("./pages/Ledger.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Rent = lazy(() => import("./pages/Rent.tsx"));
const Missions = lazy(() => import("./pages/Missions.tsx"));
const Accounts = lazy(() => import("./pages/Accounts.tsx"));
const Reports = lazy(() => import("./pages/Reports.tsx"));
const Subscriptions = lazy(() => import("./pages/Subscriptions.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      window.location.origin,
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <BrowserRouter>
        <RouteSyncer />
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cards" element={<CreditCards />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/rent" element={<Rent />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster />
    </ThemeProvider>
  </>,
);
