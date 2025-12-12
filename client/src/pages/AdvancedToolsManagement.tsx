import { useState } from "react";
import { ArrowLeft, Wrench, CheckSquare, Trash2, Edit, Filter, Search, Tag, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tool } from "@shared/schema";

export function AdvancedToolsManagement() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isPaidPlan = user?.plan === "standard" || user?.plan === "premium";
  
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterUsage, setFilterUsage] = useState<string>("all");
  const [filterPaid, setFilterPaid] = useState<string>("all");
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const { data: toolsData, isLoading } = useQuery<{ tools: Tool[] }>({
    queryKey: ['/api/tools'],
    enabled: isPaidPlan,
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map(id => apiRequest("DELETE", `/api/tools/${id}`))
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tools'] });
      toast({ title: "Success", description: `${selectedTools.size} tool(s) deleted successfully` });
      setSelectedTools(new Set());
      setBulkDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete tools", variant: "destructive" });
    },
  });

  const updateUsageMutation = useMutation({
    mutationFn: async ({ ids, usageFrequency }: { ids: string[], usageFrequency: string }) => {
      const results = await Promise.all(
        ids.map(id => apiRequest("PATCH", `/api/tools/${id}`, { usageFrequency }))
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tools'] });
      toast({ title: "Success", description: `Updated usage for ${selectedTools.size} tool(s)` });
      setSelectedTools(new Set());
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update tools", variant: "destructive" });
    },
  });

  if (!isPaidPlan) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Advanced Tools Management</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Bulk operations, detailed management, and tool intelligence</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="text-center space-y-4 max-w-md">
              <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold">Upgrade for Advanced Management</h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                Advanced tools management with bulk operations and inline editing is available on Standard and Premium plans.
              </p>
              <Button 
                onClick={() => setLocation("/pricing")}
                className="mt-4 w-full sm:w-auto"
                data-testid="button-upgrade"
              >
                View Pricing Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tools = toolsData?.tools || [];
  
  const allCategories = [...new Set(tools.flatMap(t => t.categories || []))];
  
  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || tool.categories?.includes(filterCategory);
    const matchesUsage = filterUsage === "all" || tool.usageFrequency === filterUsage;
    const matchesPaid = filterPaid === "all" || 
      (filterPaid === "paid" && tool.isPaid) || 
      (filterPaid === "free" && !tool.isPaid);
    
    return matchesSearch && matchesCategory && matchesUsage && matchesPaid;
  });

  const toggleSelectAll = () => {
    if (selectedTools.size === filteredTools.length) {
      setSelectedTools(new Set());
    } else {
      setSelectedTools(new Set(filteredTools.map(t => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelection = new Set(selectedTools);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTools(newSelection);
  };

  const handleBulkUsageUpdate = (usageFrequency: string) => {
    updateUsageMutation.mutate({ ids: Array.from(selectedTools), usageFrequency });
  };

  const handleBulkDelete = () => {
    deleteMutation.mutate(Array.from(selectedTools));
  };

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Advanced Tools Management</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Bulk operations and advanced filtering</p>
        </div>
        <Button 
          variant="outline"
          onClick={() => setLocation("/tools")}
          data-testid="button-back-to-tools"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tools
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterUsage} onValueChange={setFilterUsage}>
              <SelectTrigger data-testid="select-usage">
                <SelectValue placeholder="Usage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Usage</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="rarely">Rarely</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPaid} onValueChange={setFilterPaid}>
              <SelectTrigger data-testid="select-paid">
                <SelectValue placeholder="Paid/Free" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tools</SelectItem>
                <SelectItem value="paid">Paid Only</SelectItem>
                <SelectItem value="free">Free Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedTools.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-sm font-medium">
                {selectedTools.size} tool(s) selected
              </span>
              <div className="flex flex-wrap gap-2">
                <Select onValueChange={handleBulkUsageUpdate}>
                  <SelectTrigger className="w-[160px]" data-testid="select-bulk-usage">
                    <Tag className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Set Usage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="rarely">Rarely</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="animate-pulse text-muted-foreground">Loading tools...</div>
          </CardContent>
        </Card>
      ) : filteredTools.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Tools Found</h3>
            <p className="text-muted-foreground">
              {tools.length === 0 
                ? "Add some tools to get started with advanced management"
                : "Try adjusting your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">
                    <Checkbox
                      checked={selectedTools.size === filteredTools.length && filteredTools.length > 0}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </th>
                  <th className="p-3 text-left text-sm font-medium">Tool</th>
                  <th className="p-3 text-left text-sm font-medium hidden md:table-cell">Categories</th>
                  <th className="p-3 text-left text-sm font-medium">Usage</th>
                  <th className="p-3 text-left text-sm font-medium">Cost</th>
                  <th className="p-3 text-left text-sm font-medium hidden sm:table-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTools.map((tool) => (
                  <tr key={tool.id} className="border-b hover:bg-muted/30" data-testid={`row-tool-${tool.id}`}>
                    <td className="p-3">
                      <Checkbox
                        checked={selectedTools.has(tool.id)}
                        onCheckedChange={() => toggleSelect(tool.id)}
                        data-testid={`checkbox-${tool.id}`}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {tool.logoUrl ? (
                          <img src={tool.logoUrl} alt={tool.name} className="w-8 h-8 rounded-lg object-contain bg-white p-0.5" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{tool.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{tool.websiteUrl}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(tool.categories || []).slice(0, 2).map(cat => (
                          <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                        ))}
                        {(tool.categories?.length || 0) > 2 && (
                          <Badge variant="outline" className="text-xs">+{tool.categories!.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge 
                        variant={tool.usageFrequency === "daily" ? "default" : tool.usageFrequency === "weekly" ? "secondary" : "outline"}
                        className={tool.usageFrequency === "rarely" ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : ""}
                      >
                        {tool.usageFrequency}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {tool.isPaid ? (
                        <span className="font-medium">${parseFloat(tool.billingAmount || "0").toFixed(2)}/{tool.billingCycle === "yearly" ? "yr" : "mo"}</span>
                      ) : (
                        <span className="text-muted-foreground">Free</span>
                      )}
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setLocation(`/tools?edit=${tool.id}`)}
                        data-testid={`button-edit-${tool.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardContent className="py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {filteredTools.length} of {tools.length} tools
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Tools</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTools.size} tool(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
