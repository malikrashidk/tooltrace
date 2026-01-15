import { useState, useEffect } from "react";
import { Switch, Route, useLocation, useSearch, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { VerificationProvider } from "@/context/VerificationContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CurrencySelector } from "@/components/CurrencySelector";
import { AppSidebar } from "@/components/AppSidebar";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { Dashboard } from "@/pages/Dashboard";
import { ToolsPage } from "@/pages/ToolsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { RenewalsPage } from "@/pages/RenewalsPage";
import { NotesPage } from "@/pages/NotesPage";
import { LowUsagePage } from "@/pages/LowUsagePage";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { SettingsPage } from "@/pages/SettingsPage";
import { PricingPage } from "@/pages/PricingPage";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { UserManagementPage } from "@/pages/UserManagementPage";
import { ApiKeysPage } from "@/pages/ApiKeysPage";
import { TeamCollaborationPage } from "@/pages/TeamCollaborationPage";
import { ReceiptStoragePage } from "@/pages/ReceiptStoragePage";
import { AdvancedToolsManagement } from "@/pages/AdvancedToolsManagement";
import { IntegrationsHub } from "@/pages/IntegrationsHub";
import { HelpPage } from "@/pages/HelpPage";
import { ApiDocsPage } from "@/pages/ApiDocsPage";
import { AcceptInvitePage } from "@/pages/AcceptInvitePage";
import SmartScanPage from "@/pages/SmartScanPage";
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
            <div className="flex items-center gap-2">
              <CurrencySelector />
              <ThemeToggle />
            </div>
          </header>
          <EmailVerificationBanner />
          <main className="flex-1 overflow-y-auto bg-background">
            <Switch>
              <Route path="/docs/api" component={ApiDocsPage} />
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/tools" component={ToolsPage} />
              <Route path="/tools-advanced" component={AdvancedToolsManagement} />
              <Route path="/analytics" component={AnalyticsPage} />
              <Route path="/renewals" component={RenewalsPage} />
              <Route path="/notes" component={NotesPage} />
              <Route path="/low-usage" component={LowUsagePage} />
              <Route path="/pricing" component={PricingPage} />
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/users" component={UserManagementPage} />
              <Route path="/api-keys" component={ApiKeysPage} />
              <Route path="/team" component={TeamCollaborationPage} />
              <Route path="/receipts" component={ReceiptStoragePage} />
              <Route path="/integrations" component={IntegrationsHub} />
              <Route path="/help" component={HelpPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/smart-scan" component={SmartScanPage} />
              <Route path="/team/accept" component={AcceptInvitePage} />
              {/* Redirect auth routes to dashboard if already logged in */}
              <Route path="/login"><Redirect to="/" /></Route>
              <Route path="/signup"><Redirect to="/" /></Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Wrapper for LoginPage to handle local "Forgot Password" toggle state
// while keeping the main URL as /login
function LoginRoute() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [, setLocation] = useLocation();

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background">
        <ForgotPasswordPage onBackToLogin={() => setShowForgotPassword(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LoginPage
        onSwitchToSignup={() => setLocation("/signup")}
        onForgotPassword={() => setShowForgotPassword(true)}
      />
    </div>
  );
}

function SignupRoute() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <SignupPage onSwitchToLogin={() => setLocation("/login")} />
    </div>
  );
}

function UnauthenticatedApp() {
  const [location] = useLocation();
  const searchString = useSearch();

  // Check for reset password token in URL
  const urlParams = new URLSearchParams(searchString);
  const resetToken = urlParams.get("token");
  const isResetPasswordRoute = location === "/reset-password" && resetToken;

  if (isResetPasswordRoute) {
    return (
      <div className="min-h-screen bg-background">
        <ResetPasswordPage
          token={resetToken}
          onBackToLogin={() => {
            // If they navigate back, go to login
            window.location.href = "/login";
          }}
        />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={LoginRoute} />
      <Route path="/signup" component={SignupRoute} />
      <Route path="/team/accept" component={AcceptInvitePage} />
      <Route path="/reset-password">
        <Redirect to="/login" />
      </Route>
      {/* Catch-all: Redirect to Login with returnTo */}
      <Route>
        {() => {
          // We can't access params here directly if wouter doesn't pass it in the way we expect for a catch-all
          // But since we are inside a Route component (or fallback), we can rely on the outer hook if needed.
          // However, wouter's Route `component` or `children` render prop usually receives params.
          // If it's a catch-all (no path), it matches everything.
          // Let's use window.location directly to be safe and avoid type errors with 'location' prop not existing on params.
          const currentPath = window.location.pathname;
          if (currentPath === "/login" || currentPath === "/signup") return null;

          const returnTo = currentPath + window.location.search;
          return <Redirect to={`/login?returnTo=${encodeURIComponent(returnTo)}`} />;
        }}
      </Route>
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const search = useSearch();

  // Robust Intent Capture: Listen for plan/cycle params globally
  // This ensures intent is saved even if user is redirected (e.g., from /signup to /login)
  useEffect(() => {
    const params = new URLSearchParams(search);
    const plan = params.get("plan");
    const cycle = params.get("cycle");

    if (plan) {
      console.log("[App] Capturing plan intent:", { plan, cycle });
      sessionStorage.setItem("pending_plan", plan);
      if (cycle) {
        sessionStorage.setItem("pending_cycle", cycle);
      }
    }
  }, [search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <CurrencyProvider>
            <VerificationProvider>
              <TooltipProvider>
                <AppContent />
                <Toaster />
              </TooltipProvider>
            </VerificationProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
