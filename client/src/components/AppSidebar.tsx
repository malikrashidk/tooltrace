import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  Settings, 
  LogOut, 
  ChevronLeft,
  Calendar,
  AlertTriangle,
  Layers,
  CreditCard,
  BarChart2,
  Code2,
  Users,
  FileText,
  Lock,
  Sliders,
  Zap,
  HelpCircle,
  MessageSquare,
  StickyNote
} from "lucide-react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "All Tools",
    url: "/tools",
    icon: Package,
  },
  {
    title: "Advanced Management",
    url: "/tools-advanced",
    icon: Sliders,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Notes",
    url: "/notes",
    icon: StickyNote,
  },
  {
    title: "Renewals",
    url: "/renewals",
    icon: Calendar,
  },
  {
    title: "Low Usage",
    url: "/low-usage",
    icon: AlertTriangle,
  },
];

const settingsNavItems = [
  {
    title: "Pricing",
    url: "/pricing",
    icon: CreditCard,
    locked: false,
  },
  {
    title: "Receipts & Invoices",
    url: "/receipts",
    icon: FileText,
    locked: false,
  },
  {
    title: "Integrations",
    url: "/integrations",
    icon: Zap,
    locked: true,
  },
  {
    title: "Team Collaboration",
    url: "/team",
    icon: Users,
    locked: true,
  },
  {
    title: "API Keys",
    url: "/api-keys",
    icon: Code2,
    locked: true,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    locked: false,
  },
];

const supportNavItems = [
  {
    title: "Help & Documentation",
    url: "/help",
    icon: HelpCircle,
    locked: false,
  },
];

const adminNavItems = [
  {
    title: "Admin Dashboard",
    url: "/admin",
    icon: BarChart2,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isPaidPlan = user?.plan === "standard" || user?.plan === "premium";
  
  const getItemStatus = (item: typeof settingsNavItems[0]) => {
    if (!item.locked) return "available";
    if (isPaidPlan) return "available";
    return "locked";
  };
  const { state } = useSidebar();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-primary-foreground" />
          </div>
          {state === "expanded" && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">Tool Trace</span>
              <span className="text-xs text-muted-foreground truncate">Manage your tools and subscriptions</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => {
                const status = getItemStatus(item);
                const isLocked = status === "locked";
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      tooltip={item.title}
                      className={isLocked ? "opacity-50 hover:opacity-75" : ""}
                    >
                      <Link 
                        href={item.url} 
                        data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                        className="relative"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {isLocked && (
                          <Lock className="h-3 w-3 absolute right-2 text-amber-500" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-start gap-3 w-full px-2 py-2 rounded-md hover:bg-sidebar-accent text-left"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={undefined} alt={user?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user?.name ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  {state === "expanded" && (
                    <div className="flex flex-col gap-0 min-w-0 flex-1">
                      <span className="text-sm font-medium truncate leading-tight">
                        {user?.name || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate leading-tight">
                        {user?.email || "user@example.com"}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-56"
                align="start"
              >
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive cursor-pointer"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppHeader() {
  return (
    <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-background sticky top-0 z-40">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
    </header>
  );
}



