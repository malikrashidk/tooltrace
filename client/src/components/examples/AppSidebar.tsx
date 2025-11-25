import { AppSidebar, AppHeader } from "../AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/context/AuthContext";

export default function AppSidebarExample() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <div className="flex h-[500px] w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1">
            <AppHeader />
            <main className="flex-1 p-6 bg-background">
              <h1 className="text-2xl font-semibold">Main Content Area</h1>
              <p className="text-muted-foreground mt-2">
                This is where your page content would appear.
              </p>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
}
