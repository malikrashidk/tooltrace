import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { InboxDiscovery } from "@/components/InboxDiscovery";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Tool } from "@/lib/analytics";

export default function SmartScanPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const addToolMutation = useMutation({
        mutationFn: async (newTool: Partial<Tool>) => {
            return await apiRequest("POST", "/api/tools", newTool);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
            toast({
                title: "Success",
                description: "Tool added successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to add tool",
                variant: "destructive",
            });
        },
    });

    const handleAddTool = (newTool: Partial<Tool>) => {
        addToolMutation.mutate(newTool);
    };

    return (
        <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation("/tools")}
                    className="rounded-full"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold">Smart Scan</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">Find and track your SaaS subscriptions from Gmail</p>
                </div>
            </div>

            <div className="mt-6">
                <InboxDiscovery onAddTool={handleAddTool} />
            </div>
        </div>
    );
}
