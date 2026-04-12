import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Footprints, UtensilsCrossed, Scale,
  Moon, Pill, Settings, Menu, X, Leaf, Sun
} from "lucide-react";

import Dashboard from "@/pages/Dashboard";
import Activity from "@/pages/Activity";
import Calories from "@/pages/Calories";
import Weight from "@/pages/Weight";
import Sleep from "@/pages/Sleep";
import Medications from "@/pages/Medications";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/activity", label: "Activity", icon: Footprints },
  { path: "/calories", label: "Calories", icon: UtensilsCrossed },
  { path: "/weight", label: "Weight", icon: Scale },
  { path: "/sleep", label: "Sleep", icon: Moon },
  { path: "/medications", label: "Medications", icon: Pill },
  { path: "/settings", label: "Settings", icon: Settings },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [location] = useLocation();
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-out",
          "md:translate-x-0 md:static md:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display font-semibold text-lg text-foreground tracking-tight">Bloom</span>
          <button
            className="ml-auto md:hidden text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close menu"
            data-testid="button-close-sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location === path;
            return (
              <Link
                key={path}
                href={path}
                onClick={onClose}
                data-testid={`nav-${label.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-border text-xs text-muted-foreground">
          Stay consistent. You've got this. 💚
        </div>
      </aside>
    </>
  );
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
            data-testid="button-open-menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground text-base">Bloom</span>
          </div>
          <button
            className="ml-auto text-muted-foreground hover:text-foreground"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle theme"
            data-testid="button-theme-toggle"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Desktop theme toggle */}
        <div className="hidden md:flex justify-end px-6 py-2">
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle theme"
            data-testid="button-theme-toggle-desktop"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/activity" component={Activity} />
            <Route path="/calories" component={Calories} />
            <Route path="/weight" component={Weight} />
            <Route path="/sleep" component={Sleep} />
            <Route path="/medications" component={Medications} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <AppShell />
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}
