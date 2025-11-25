import { useEffect, useState } from "react";
import { Users, DollarSign, TrendingUp, Activity, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 76%, 36%)", "hsl(271, 91%, 65%)"];

// todo: remove mock functionality - replace with real API data
const mockUsers = [
  {
    id: "1",
    email: "john@example.com",
    name: "John Doe",
    plan: "premium",
    status: "active",
    joinedDate: "2024-06-15",
    toolsCount: 25,
    monthlySpend: 450,
    totalRevenue: 1800,
  },
  {
    id: "2",
    email: "jane@example.com",
    name: "Jane Smith",
    plan: "standard",
    status: "active",
    joinedDate: "2024-07-20",
    toolsCount: 12,
    monthlySpend: 180,
    totalRevenue: 720,
  },
  {
    id: "3",
    email: "bob@example.com",
    name: "Bob Johnson",
    plan: "free",
    status: "active",
    joinedDate: "2024-08-10",
    toolsCount: 4,
    monthlySpend: 0,
    totalRevenue: 0,
  },
  {
    id: "4",
    email: "alice@example.com",
    name: "Alice Williams",
    plan: "premium",
    status: "inactive",
    joinedDate: "2024-05-01",
    toolsCount: 18,
    monthlySpend: 300,
    totalRevenue: 2700,
  },
];

const planDistribution = [
  { name: "Free", value: 45 },
  { name: "Standard", value: 35 },
  { name: "Premium", value: 20 },
];

const revenueData = [
  { month: "Jul", revenue: 1200 },
  { month: "Aug", revenue: 1900 },
  { month: "Sep", revenue: 2400 },
  { month: "Oct", revenue: 2210 },
  { month: "Nov", revenue: 2290 },
  { month: "Dec", revenue: 3000 },
];

const userGrowth = [
  { week: "W1", users: 20 },
  { week: "W2", users: 35 },
  { week: "W3", users: 55 },
  { week: "W4", users: 100 },
];

export function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // todo: remove mock functionality - implement real admin check
    setIsAdmin(true);
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have access to the admin dashboard.</p>
        </div>
      </div>
    );
  }

  const totalUsers = mockUsers.length;
  const activeUsers = mockUsers.filter((u) => u.status === "active").length;
  const totalRevenue = mockUsers.reduce((sum, u) => sum + u.totalRevenue, 0);
  const monthlyRecurring = mockUsers.reduce((sum, u) => sum + u.monthlySpend, 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, subscriptions, and revenue</p>
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
                  {(((totalUsers - mockUsers.filter((u) => u.plan === "free").length) / totalUsers) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">To paid plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly recurring revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Active users by subscription plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {planDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
          <CardDescription>New users per week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                  }}
                />
                <Bar dataKey="users" fill="hsl(217, 91%, 60%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users & Subscriptions</CardTitle>
          <CardDescription>Manage user accounts and subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Tools</TableHead>
                  <TableHead className="text-right">Monthly Spend</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.plan === "premium"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : user.plan === "standard"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                        }
                      >
                        {user.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.toolsCount}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${user.monthlySpend.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === "active" ? "default" : "secondary"}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => console.log("View user:", user.id)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log("Edit user:", user.id)}>
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log("View subscription:", user.id)}>
                            View Subscription
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
