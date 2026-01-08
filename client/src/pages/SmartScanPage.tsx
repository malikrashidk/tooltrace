import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Loader2,
    Globe,
    Check,
    Plus,
    ExternalLink,
    EyeOff,
    AlertCircle,
    BarChart3,
    Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddToolDialog } from "@/components/AddToolDialog";
import { ToolLogo } from "@/components/ToolLogo";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DetectedSite {
    id: string;
    domainKey: string;
    displayName: string;
    faviconUrl?: string;
    visitCount7d: number;
    visitCount30d: number;
    lastSeenAt: string;
    confidenceLevel: 'confirmed' | 'likely' | 'visited';
    status: 'new' | 'added' | 'ignored';
    toolId?: string;
}

export default function SmartScanPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [addToolOpen, setAddToolOpen] = useState(false);
    const [selectedSite, setSelectedSite] = useState<DetectedSite | null>(null);

    const { data, isLoading } = useQuery<{ sites: DetectedSite[] }>({
        queryKey: ["/api/activity/smart-scan"],
        queryFn: async () => {
             const res = await apiRequest("GET", "/api/activity/smart-scan");
             return await res.json();
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            await apiRequest("PATCH", `/api/activity/smart-scan/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/activity/smart-scan"] });
        }
    });

    const markAddedMutation = useMutation({
        mutationFn: async ({ id, toolId }: { id: string, toolId: string }) => {
             await apiRequest("PATCH", `/api/activity/smart-scan/${id}/mark-added`, { toolId });
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ["/api/activity/smart-scan"] });
        }
    });

    const handleAddClick = (site: DetectedSite) => {
        setSelectedSite(site);
        setAddToolOpen(true);
    };

    const addToolMutation = useMutation({
        mutationFn: async (newTool: any) => {
            const res = await apiRequest("POST", "/api/tools", newTool);
            return await res.json();
        },
        onSuccess: (tool) => {
            if (selectedSite) {
                markAddedMutation.mutate({ id: selectedSite.id, toolId: tool.id });
            }
            queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
            setAddToolOpen(false);
            setSelectedSite(null);
            toast({ title: "Tool added", description: "The tool has been added to your dashboard." });
        },
        onError: (error: any) => {
             toast({
                 title: "Error adding tool",
                 description: error.message || "Something went wrong.",
                 variant: "destructive"
             });
        }
    });

    const handleSaveTool = (tool: any) => {
        addToolMutation.mutate(tool);
    };

    // Filter logic
    const sites = data?.sites || [];
    const activeSites = sites.filter(s => s.status !== 'ignored');

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Smart Scan</h1>
                <p className="text-muted-foreground">
                    Discover accounts based on your browsing activity.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Detected Sites</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeSites.length}</div>
                        <p className="text-xs text-muted-foreground">Active in last 90 days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {activeSites.filter(s => s.confidenceLevel !== 'visited').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Likely or Confirmed accounts</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Already Added</CardTitle>
                        <Check className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {activeSites.filter(s => s.toolId).length}
                        </div>
                        <p className="text-xs text-muted-foreground">Managed in Tooltrace</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Discovered Activity</CardTitle>
                    <CardDescription>
                        Sites you visit frequently. Add them to track subscriptions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Site</TableHead>
                                <TableHead>Confidence</TableHead>
                                <TableHead>Visits (30d)</TableHead>
                                <TableHead>Last Seen</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeSites.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No activity detected yet. Install the extension to start scanning.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activeSites.map((site) => (
                                    <TableRow key={site.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <ToolLogo
                                                    url={site.faviconUrl}
                                                    name={site.displayName}
                                                    websiteUrl={`https://${site.domainKey}`}
                                                    size="sm"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{site.displayName}</span>
                                                    <span className="text-xs text-muted-foreground">{site.domainKey}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                site.confidenceLevel === 'confirmed' ? 'default' :
                                                site.confidenceLevel === 'likely' ? 'secondary' : 'outline'
                                            }>
                                                {site.confidenceLevel}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <BarChart3 className="h-3 w-3 text-muted-foreground" />
                                                {site.visitCount30d}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                <span className="text-xs whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(site.lastSeenAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {site.toolId ? (
                                                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium text-xs">
                                                    <Check className="h-3.5 w-3.5" />
                                                    Added
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Not Added</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {site.toolId ? (
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a href={`/tools?id=${site.toolId}`} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        Open
                                                    </a>
                                                </Button>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAddClick(site)}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Add Tool
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <span className="sr-only">More</span>
                                                                <EyeOff className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => updateStatusMutation.mutate({ id: site.id, status: 'ignored' })}
                                                            >
                                                                Ignore Site
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AddToolDialog
                open={addToolOpen}
                onOpenChange={setAddToolOpen}
                onSave={handleSaveTool}
                initialData={selectedSite ? {
                    name: selectedSite.displayName,
                    websiteUrl: `https://${selectedSite.domainKey}`,
                    // We can pass domainKey if the dialog supported it, but url is enough usually
                } : undefined}
            />
        </div>
    );
}
