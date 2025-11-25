import { useState } from "react";
import { Mail, Trash2, Plus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

// todo: remove mock functionality - replace with real API
const mockTeamMembers = [
  {
    id: "member-1",
    name: "John Doe",
    email: "john@example.com",
    role: "admin",
    status: "active",
    joinedDate: "2024-06-15",
    avatar: "JD",
  },
  {
    id: "member-2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "member",
    status: "active",
    joinedDate: "2024-08-20",
    avatar: "JS",
  },
  {
    id: "member-3",
    name: "Bob Johnson",
    email: "bob@example.com",
    role: "viewer",
    status: "pending",
    joinedDate: "2024-11-20",
    avatar: "BJ",
  },
];

const roleDescriptions = {
  admin: "Can manage team, billing, and all tools",
  member: "Can create and manage tools",
  viewer: "Can view tools but cannot make changes",
};

export function TeamCollaborationPage() {
  const [teamMembers, setTeamMembers] = useState(mockTeamMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateInviteLink = () => {
    // todo: remove mock functionality - replace with real API call
    const link = `https://saazhub.com/invite/${Math.random().toString(36).substring(2, 15)}`;
    setInviteLink(link);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({
      description: "Invite link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInvite = () => {
    if (!inviteEmail.trim()) return;

    // todo: remove mock functionality - replace with real API call
    const newMember = {
      id: `member-${Date.now()}`,
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: inviteRole as any,
      status: "pending",
      joinedDate: new Date().toISOString().split("T")[0],
      avatar: inviteEmail.substring(0, 2).toUpperCase(),
    };

    setTeamMembers([...teamMembers, newMember]);
    setInviteEmail("");
    setInviteRole("member");
    setShowInviteDialog(false);
    toast({
      description: `Invitation sent to ${inviteEmail}`,
    });
  };

  const removeMember = (id: string) => {
    // todo: remove mock functionality - replace with real API call
    setTeamMembers(teamMembers.filter((member) => member.id !== id));
    toast({
      description: "Team member removed",
    });
  };

  const updateRole = (id: string, newRole: string) => {
    // todo: remove mock functionality - replace with real API call
    setTeamMembers(
      teamMembers.map((member) =>
        member.id === id ? { ...member, role: newRole } : member
      )
    );
    toast({
      description: "Role updated",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Team Collaboration</h1>
        <p className="text-muted-foreground">Invite team members to collaborate on SaaS management</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>{teamMembers.length} members in your team</CardDescription>
          </div>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>Add a new member to your team</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    placeholder="member@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    data-testid="input-invite-email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger data-testid="select-invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {roleDescriptions[inviteRole as keyof typeof roleDescriptions]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={sendInvite} data-testid="button-send-invite">
                    Send Invite
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(value) => updateRole(member.id, value)}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-role-${member.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.status === "active" ? "default" : "secondary"}
                      >
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{member.joinedDate}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember(member.id)}
                        data-testid="button-remove-member"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite via Link
          </CardTitle>
          <CardDescription>Share a link to invite multiple team members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={generateInviteLink}
            data-testid="button-generate-link"
            className="w-full"
          >
            Generate Invite Link
          </Button>
          {inviteLink && (
            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="font-mono text-sm"
                data-testid="input-invite-link"
              />
              <Button
                onClick={copyInviteLink}
                variant="outline"
                size="icon"
                data-testid="button-copy-link"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Admin</p>
            <p className="text-sm text-muted-foreground">
              Full access to team, billing, integrations, and all tools
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-sm">Member</p>
            <p className="text-sm text-muted-foreground">
              Can create, edit, and manage SaaS tools and their details
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-sm">Viewer</p>
            <p className="text-sm text-muted-foreground">
              Read-only access to view tools and analytics
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
