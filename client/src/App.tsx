import { useState, useEffect } from "react";
import { Switch, Route, useLocation, useSearch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CurrencySelector } from "@/components/CurrencySelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AppSidebar } from "@/components/AppSidebar";
import { LoginPage } from "@/components/LoginPage";
import { SignupPage } from "@/components/SignupPage";
import { ForgotPasswordPage } from "@/components/ForgotPasswordPage";
import { ResetPasswordPage } from "@/components/ResetPasswordPage";
import { Dashboard } from "@/pages/Dashboard";
import { ToolsPage } from "@/pages/ToolsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { RenewalsPage } from "@/pages/RenewalsPage";
import { NotesPage } from "@/pages/NotesPage";
import { LowUsagePage } from "@/pages/LowUsagePage";
import { SettingsPage } from "@/components/SettingsPage";
import { PricingPage } from "@/pages/PricingPage";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { UserManagementPage } from "@/pages/UserManagementPage";
import { ApiKeysPage } from "@/pages/ApiKeysPage";
import { TeamCollaborationPage } from "@/pages/TeamCollaborationPage";
import { ReceiptStoragePage } from "@/pages/ReceiptStoragePage";
import { AdvancedToolsManagement } from "@/pages/AdvancedToolsManagement";
import { IntegrationsHub } from "@/pages/IntegrationsHub";
import { HelpPage } from "@/pages/HelpPage";
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
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-background">
            <Switch>
              <Route path="/" component={Dashboard} />
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  
  // Check for reset password token in URL
  const urlParams = new URLSearchParams(searchString);
  const resetToken = urlParams.get("token");
  const isResetPasswordRoute = location === "/reset-password" && resetToken;

  // Handle reset password route
  if (isResetPasswordRoute && resetToken) {
    return (
      <div className="min-h-screen bg-background">
        <ResetPasswordPage 
          token={resetToken} 
          onBackToLogin={() => {
            setLocation("/");
          }} 
        />
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background">
        <ForgotPasswordPage onBackToLogin={() => setShowForgotPassword(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showSignup ? (
        <SignupPage onSwitchToLogin={() => setShowSignup(false)} />
      ) : (
        <LoginPage 
          onSwitchToSignup={() => setShowSignup(true)} 
          onForgotPassword={() => setShowForgotPassword(true)}
        />
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
          <CurrencyProvider>
            <LanguageProvider>
              <TooltipProvider>
                <AppContent />
                <Toaster />
              </TooltipProvider>
            </LanguageProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
