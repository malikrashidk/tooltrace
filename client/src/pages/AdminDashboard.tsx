import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, TrendingUp, Activity } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AdminDashboard() {
  const [, setLocation] = useLocation();

  // Fetch stats
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/stats", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const stats = statsResponse || { totalUsers: 0, totalRevenue: 0, activeSubscriptions: 0 };
  const totalUsers = stats.totalUsers || 0;
  const activeUsers = stats.activeSubscriptions || 0;
  const totalRevenue = stats.totalRevenue || 0;
  const monthlyRecurring = (stats.totalRevenue || 0) / 12;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, subscriptions, and revenue</p>
      </div>

      <div className="flex gap-2 mb-4">
        <Button onClick={() => setLocation("/admin/users")} variant="outline" data-testid="button-manage-users">
          <Users className="h-4 w-4 mr-2" />
          Manage Users
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-semibold">{totalUsers}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {activeUsers} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-semibold font-mono">
                  ${totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="text-2xl font-semibold font-mono">
                  ${monthlyRecurring.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Monthly recurring</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-semibold">
                  {totalUsers > 0 ? (((activeUsers / totalUsers) * 100).toFixed(1)) : "0"}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">To paid plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Add, edit, or delete users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">Go to User Management to view and manage all users</p>
            <Button onClick={() => setLocation("/admin/users")} data-testid="button-manage-users-card">
              Manage Users
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
