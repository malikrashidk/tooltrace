import { useState } from "react";
import { Users, Plus, Mail, Shield, UserMinus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FeaturePaywall } from "@/components/FeaturePaywall";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TeamMember = {
  id: string;
  email: string;
  name?: string;
  role: "owner" | "admin" | "member" | "viewer";
  avatarUrl?: string;
  status: "active" | "pending";
  joinedAt?: string | Date;
};

export function TeamCollaborationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isPremium = user?.plan === "enterprise";

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");

  const { data: teamData } = useQuery<{ members: TeamMember[] }>({
    queryKey: ['/api/team/members'],
    enabled: isPremium,
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await apiRequest("POST", "/api/team/invite", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
      toast({ title: "Success", description: "Invitation sent successfully" });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("member");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send invitation", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/team/members/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
      toast({ title: "Success", description: "Team member removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove team member", variant: "destructive" });
    },
  });

  const teamMembers = teamData?.members || [];

  if (!isPremium) {
    return (
      <FeaturePaywall
        title="Team Collaboration"
        description="Invite your team members to collaborate on SaaS management. Multi-user roles, granular permissions, and shared dashboards are available on the Enterprise plan."
        requiredPlan="enterprise"
        icon={<Users className="h-8 w-8 text-primary animate-pulse" />}
      />
    );
  }

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Error", description: "Please enter an email address", variant: "destructive" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "member":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "viewer":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "";
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "owner":
        return "Full access, billing, and team management";
      case "admin":
        return "Manage tools, settings, and team members";
      case "member":
        return "Add and edit tools, view analytics";
      case "viewer":
        return "View-only access to tools and analytics";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Team Collaboration</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Manage your team and permissions</p>
        </div>
        <Button
          onClick={() => setInviteDialogOpen(true)}
          className="w-full sm:w-auto"
          data-testid="button-invite-member"
        >
          <Plus className="h-4 w-4 mr-2" />
          Invite Team Member
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">of 10 seats available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.filter(m => m.status === "active").length}</div>
            <p className="text-xs text-muted-foreground mt-1">members active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.filter(m => m.status === "pending").length}</div>
            <p className="text-xs text-muted-foreground mt-1">invitations pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>Manage your team and their access permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg"
                data-testid={`team-member-${member.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
                    <AvatarFallback>{(member.name || member.email).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.name || member.email}</p>
                      {member.role === "owner" && <Crown className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    {member.status === "pending" && (
                      <Badge variant="outline" className="text-xs mt-1">Pending Invitation</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getRoleBadgeColor(member.role)}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>
                  {member.role !== "owner" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMutation.mutate(member.id)}
                      disabled={removeMutation.isPending}
                      data-testid={`button-remove-${member.id}`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Permissions
          </CardTitle>
          <CardDescription>Understanding what each role can do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["owner", "admin", "member", "viewer"].map((role) => (
              <div key={role} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className={getRoleBadgeColor(role)}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{getRoleDescription(role)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to collaborate on your SaaS management
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9"
                  data-testid="input-invite-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full management access</SelectItem>
                  <SelectItem value="member">Member - Add and edit tools</SelectItem>
                  <SelectItem value="viewer">Viewer - View only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteMutation.isPending}
              data-testid="button-send-invite"
            >
              <Mail className="h-4 w-4 mr-2" />
              {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



