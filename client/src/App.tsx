import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { LoginPage } from "@/components/LoginPage";
import { SignupPage } from "@/components/SignupPage";
import { Dashboard } from "@/pages/Dashboard";
import { ToolsPage } from "@/pages/ToolsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { RenewalsPage } from "@/pages/RenewalsPage";
import { LowUsagePage } from "@/pages/LowUsagePage";
import { SettingsPage } from "@/components/SettingsPage";
import { PricingPage } from "@/pages/PricingPage";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { ApiKeysPage } from "@/pages/ApiKeysPage";
import { TeamCollaborationPage } from "@/pages/TeamCollaborationPage";
import { ReceiptStoragePage } from "@/pages/ReceiptStoragePage";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background sticky top-0 z-40 gap-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto bg-background">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/tools" component={ToolsPage} />
              <Route path="/analytics" component={AnalyticsPage} />
              <Route path="/renewals" component={RenewalsPage} />
              <Route path="/low-usage" component={LowUsagePage} />
              <Route path="/pricing" component={PricingPage} />
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/api-keys" component={ApiKeysPage} />
              <Route path="/team" component={TeamCollaborationPage} />
              <Route path="/receipts" component={ReceiptStoragePage} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function UnauthenticatedApp() {
  const [showSignup, setShowSignup] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {showSignup ? (
        <SignupPage onSwitchToLogin={() => setShowSignup(false)} />
      ) : (
        <LoginPage onSwitchToSignup={() => setShowSignup(true)} />
      )}
    </div>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <UnauthenticatedApp />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
