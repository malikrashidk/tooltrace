import { useState, useMemo } from "react";
import { Plus, Grid3X3, List, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/ToolCard";
import { SearchFilter, type FilterState } from "@/components/SearchFilter";
import { AddToolDialog } from "@/components/AddToolDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Tool } from "@/lib/analytics";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";

type ViewMode = "grid" | "list";

export function ToolsPage() {
  const { toast } = useToast();
  
  const { data: toolsData } = useQuery<{ tools: Tool[] }>({
    queryKey: ["/api/tools"],
  });
  
  const tools = toolsData?.tools || [];
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    usageFrequency: [],
    isPaid: "all",
    sortBy: "name",
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tool: Tool | null }>({
    open: false,
    tool: null,
  });

  // Get unique categories from tools
  const categories = useMemo(() => {
    const cats = new Set<string>();
    tools.forEach(tool => {
      tool.categories?.forEach(cat => cats.add(cat));
    });
    return Array.from(cats);
  }, [tools]);

  const filteredTools = useMemo(() => {
    let result = [...tools];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tool) =>
          tool.name.toLowerCase().includes(query) ||
          tool.notes?.toLowerCase().includes(query) ||
          tool.categories?.some((c) => c.toLowerCase().includes(query)) ||
          tool.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }

    if (filters.categories.length > 0) {
      result = result.filter((tool) =>
        tool.categories?.some((c) => filters.categories.includes(c))
      );
    }

    if (filters.usageFrequency.length > 0) {
      result = result.filter((tool) =>
        tool.usageFrequency && filters.usageFrequency.includes(tool.usageFrequency)
      );
    }

    if (filters.isPaid !== "all") {
      result = result.filter((tool) =>
        filters.isPaid === "paid" ? tool.isPaid : !tool.isPaid
      );
    }

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "cost":
          const amountA = typeof a.billingAmount === 'string' ? parseFloat(a.billingAmount) : (a.billingAmount || 0);
          const amountB = typeof b.billingAmount === 'string' ? parseFloat(b.billingAmount) : (b.billingAmount || 0);
          return amountB - amountA;
        case "renewal":
          if (!a.nextRenewalDate) return 1;
          if (!b.nextRenewalDate) return -1;
          return new Date(a.nextRenewalDate).getTime() - new Date(b.nextRenewalDate).getTime();
        case "usage":
          const usageOrder: Record<string, number> = { daily: 0, weekly: 1, rarely: 2 };
          return (usageOrder[a.usageFrequency || "rarely"] || 2) - (usageOrder[b.usageFrequency || "rarely"] || 2);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [tools, searchQuery, filters]);

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

  const updateToolMutation = useMutation({
    mutationFn: async (tool: Tool) => {
      return await apiRequest("PATCH", `/api/tools/${tool.id}`, tool);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({
        title: "Success",
        description: "Tool updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tool",
        variant: "destructive",
      });
    },
  });

  const deleteToolMutation = useMutation({
    mutationFn: async (toolId: string) => {
      return await apiRequest("DELETE", `/api/tools/${toolId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({
        title: "Success",
        description: "Tool deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tool",
        variant: "destructive",
      });
    },
  });

  const handleAddTool = (newTool: Partial<Tool>) => {
    addToolMutation.mutate(newTool);
  };

  const handleEditTool = (tool: Tool) => {
    updateToolMutation.mutate(tool);
  };

  const handleDeleteTool = (tool: Tool) => {
    setDeleteDialog({ open: true, tool });
  };

  const confirmDelete = () => {
    if (deleteDialog.tool) {
      deleteToolMutation.mutate(deleteDialog.tool.id);
    }
    setDeleteDialog({ open: false, tool: null });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">All Tools</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            {tools.length} tools in your collection
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <AddToolDialog categories={categories} onSave={handleAddTool} />
        </div>
      </div>

      {tools.length === 0 ? (
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold">No tools yet</h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-xs">
                Start by adding your first tool/website/app to begin tracking your subscriptions and much more.
              </p>
            </div>
            <AddToolDialog categories={categories} onSave={handleAddTool} />
          </div>
        </div>
      ) : (
        <>
          <SearchFilter
            categories={categories}
            onSearch={setSearchQuery}
            onFilterChange={setFilters}
            activeFilters={filters}
          />

          {filteredTools.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No tools found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
            </div>
          ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onEdit={handleEditTool}
              onDelete={handleDeleteTool}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px] sm:w-[200px]">Tool</TableHead>
                <TableHead className="hidden md:table-cell">Categories</TableHead>
                <TableHead className="hidden md:table-cell">Usage</TableHead>
                <TableHead className="text-right w-[80px] sm:w-[100px]">Cost</TableHead>
                <TableHead className="hidden sm:table-cell w-[100px] sm:w-[120px]">Renewal</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTools.map((tool) => (
                <TableRow key={tool.id} data-testid={`table-row-${tool.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border flex-shrink-0">
                        <AvatarImage src={tool.logoUrl || undefined} alt={tool.name} className="object-contain p-0.5" />
                        <AvatarFallback className="rounded-lg text-xs">
                          {getInitials(tool.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base break-words">{tool.name}</p>
                        <a
                          href={tool.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {tool.categories?.slice(0, 2).map((cat) => (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                      {(tool.categories?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(tool.categories?.length || 0) - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        tool.usageFrequency === "daily"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : tool.usageFrequency === "weekly"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {tool.usageFrequency}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs sm:text-sm whitespace-nowrap">
                    {tool.isPaid && tool.billingAmount
                      ? formatCurrency(typeof tool.billingAmount === 'string' ? parseFloat(tool.billingAmount) : tool.billingAmount)
                      : "Free"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                    {tool.nextRenewalDate
                      ? new Date(tool.nextRenewalDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditTool(tool)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteTool(tool)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
          )}
        </>
      )}

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        toolName={deleteDialog.tool?.name || ""}
        onConfirm={confirmDelete}
      />
    </div>
  );
}



