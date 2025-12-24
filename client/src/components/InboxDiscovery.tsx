import React, { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Mail, RefreshCw, Plus, Check, Loader2, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tool } from "@/lib/analytics";

interface DiscoveryResult {
    id: string;
    vendorName: string;
    vendorDomain: string;
    confidence: number;
    lastSeenAt: string;
}

export function InboxDiscovery({ onAddTool }: { onAddTool: (tool: Partial<Tool>) => void }) {
    const { toast } = useToast();
    const searchString = useSearch();
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(searchString);
        if (params.get("gmail_connected") === "true") {
            // Remove the param from URL to prevent multiple scans on refresh
            window.history.replaceState({}, "", window.location.pathname);
            scanMutation.mutate();
        }
    }, [searchString]);

    const { data: resultsData, isLoading: isLoadingResults } = useQuery({
        queryKey: ["/api/inbox/results"],
    });

    const { data: profileData } = useQuery<any>({
        queryKey: ["/api/user/profile"],
    });

    const results = (resultsData as any)?.results || [];

    const scanMutation = useMutation({
        mutationFn: async () => {
            setIsScanning(true);
            const res = await apiRequest("POST", "/api/inbox/scan");
            return await res.json() as { count: number };
        },
        onSuccess: (data: { count: number, results?: DiscoveryResult[] }) => {
            if (data.results) {
                queryClient.setQueryData(["/api/inbox/results"], { results: data.results });
            } else {
                queryClient.invalidateQueries({ queryKey: ["/api/inbox/results"] });
            }
            toast({
                title: "Scan Complete",
                description: `Found ${data.count || 0} potential subscriptions.`,
            });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Scan Failed",
                description: error.message || "Could not complete the scan.",
            });
        },
        onSettled: () => setIsScanning(false),
    });

    const connectMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("GET", "/api/inbox/google/connect");
            const data = await res.json();
            return data.url as string;
        },
        onSuccess: (url: string) => {
            window.location.href = url;
        },
    });

    const disconnectMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", "/api/inbox/disconnect");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inbox/results"] });
            toast({ description: "Gmail account disconnected" });
        },
    });

    return (
        <Card className="h-full bg-gradient-to-br from-primary/5 via-transparent to-transparent border-primary/20">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <RefreshCw className={`h-5 w-5 text-primary ${isScanning ? 'animate-spin' : ''}`} />
                        Smart Scan
                    </CardTitle>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold tracking-wider">
                        Beta
                    </Badge>
                </div>
                <CardDescription>
                    Automatically discover your SaaS subscriptions from your inbox.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!profileData?.googleId ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-sm">Connect your Gmail</p>
                            <p className="text-xs text-muted-foreground max-w-[200px]">
                                Securely connect your Gmail to discover subscriptions.
                            </p>
                        </div>
                        <Button
                            onClick={() => connectMutation.mutate()}
                            disabled={connectMutation.isPending}
                            className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                        >
                            {connectMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            Connect Gmail
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Connected:</span>
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                                    Gmail
                                </Badge>
                            </div>
                            <Button size="sm" variant="ghost" className="text-destructive h-8 px-2" onClick={() => disconnectMutation.mutate()}>
                                Disconnect
                            </Button>
                        </div>

                        {results.length > 0 ? (
                            <ScrollArea className="h-[300px] pr-4">
                                <div className="space-y-3">
                                    {results.map((result: DiscoveryResult) => (
                                        <div
                                            key={result.id}
                                            className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors"
                                        >
                                            <div className="min-w-0 flex-1 mr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-sm">{result.vendorName}</span>
                                                    <Badge variant="secondary" className="bg-primary/10 text-primary-foreground text-[10px] h-4">
                                                        {result.confidence}% match
                                                    </Badge>
                                                </div>
                                                <a
                                                    href={`https://${result.vendorDomain}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                                                >
                                                    {result.vendorDomain} <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 w-8 p-0"
                                                onClick={() => onAddTool({
                                                    name: result.vendorName,
                                                    websiteUrl: `https://${result.vendorDomain}`,
                                                    isPaid: true
                                                })}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            results.length === 0 && !isScanning && (
                                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <RefreshCw className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-sm">Ready to scan?</p>
                                        <p className="text-xs text-muted-foreground max-w-[200px]">
                                            We'll look for receipts and billing emails from the last 12 months.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => scanMutation.mutate()}
                                        disabled={isScanning}
                                        className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                                    >
                                        {isScanning ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        Start Smart Scan
                                    </Button>
                                </div>
                            )
                        )}
                        {isScanning && (
                            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Scanning your inbox for subscriptions...</p>
                            </div>
                        )}
                    </>
                )}

                <Alert className="mt-4 py-2 border-none bg-blue-50/50 dark:bg-blue-900/10">
                    <AlertDescription className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <Check className="h-3 w-3 text-blue-500" />
                        Privacy First: We only scan for keywords. No raw content is stored.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}
