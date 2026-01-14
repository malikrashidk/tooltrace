import { useState, useMemo, useEffect } from "react";
import { Plus, Grid3X3, List, Package, RefreshCw, Download } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/ToolCard";
import { SearchFilter, type FilterState } from "@/components/SearchFilter";
import { AddToolDialog } from "@/components/AddToolDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Tool } from "@/lib/analytics";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { convertToCSV, downloadCSV } from "@/lib/export";
import { fromCents } from "../../../shared/money";

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
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: toolsData } = useQuery<{ tools: Tool[] }>({
    queryKey: ["/api/tools"],
  });

  const tools = toolsData?.tools || [];

  // Check for import param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importData = params.get("import");
    if (importData) {
      try {
        const toolsToImport = JSON.parse(atob(importData));
        if (Array.isArray(toolsToImport) && toolsToImport.length > 0) {
          let addedCount = 0;
          toolsToImport.forEach(t => {
            if (!tools.some(existing => existing.name === t.name)) {
              addToolMutation.mutate({
                name: t.name,
                websiteUrl: `https://${t.website}`,
                categories: [t.category || "Other"],
                isPaid: false
              });
              addedCount++;
            }
          });
          if (addedCount > 0) {
            toast({ title: "Import Successful", description: `Added ${addedCount} new tools from extension.` });
          }
          window.history.replaceState({}, "", "/tools");
        }
      } catch (e) {
        console.error("Import failed", e);
      }
    }
  }, [window.location.search, tools]);

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
  const [editDialog, setEditDialog] = useState<{ open: boolean; tool: Tool | null }>({ open: false, tool: null });

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
    setEditDialog({ open: true, tool });
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

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">All Tools</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            {tools.length} tool{tools.length === 1 ? "" : "s"} tracked
            {(user as any)?.plan === "free" && tools.length > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({Math.min(tools.length, 10)} of 10 available)
              </span>
            )}
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
          <Button
            variant="outline"
            onClick={() => {
              if (tools.length > 0) {
                const csv = convertToCSV(tools);
                downloadCSV(csv, "tooltrace-export.csv");
                toast({ title: "Exported", description: "Your tools have been exported to CSV." });
              }
            }}
            disabled={tools.length === 0 || (user as any)?.plan === "free"}
            className="shadow-sm hidden sm:flex"
            title={(user as any)?.plan === "free" ? "CSV export available on Pro and Enterprise plans" : ""}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/smart-scan")}
            className="shadow-sm border-primary/20 hover:bg-primary/5"
          >
            <RefreshCw className="h-4 w-4 mr-2 text-primary" />
            Smart Tracker
          </Button>
        </div>
      </div>

      <div className="w-full space-y-6">

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
              {user?.emailVerifiedAt && (
                <AddToolDialog categories={categories} onSave={handleAddTool} />
              )}
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
                {filteredTools.map((tool, index) => {
                  const isDisabledForFreeUser = (user as any)?.plan === "free" && index >= 10;
                  return (
                    <ToolCard
                      key={tool.id}
                      tool={{ ...tool, isLocked: isDisabledForFreeUser } as any}
                      onEdit={isDisabledForFreeUser ? undefined : handleEditTool}
                      onDelete={isDisabledForFreeUser ? undefined : handleDeleteTool}
                    />
                  );
                })}
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
                    {filteredTools.map((tool, index) => {
                      const isDisabledForFreeUser = (user as any)?.plan === "free" && index >= 10;
                      return (
                        <TableRow key={tool.id} data-testid={`table-row-${tool.id}`} className={isDisabledForFreeUser ? "opacity-50" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border flex-shrink-0">
                                <AvatarImage
                                  src={tool.logoUrl || (tool.websiteUrl ? `https://www.google.com/s2/favicons?domain=${new URL(tool.websiteUrl.startsWith('http') ? tool.websiteUrl : `https://${tool.websiteUrl}`).hostname}&sz=128` : undefined)}
                                  alt={tool.name}
                                  className="object-contain p-0.5"
                                />
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
                              className={`text-xs ${tool.usageFrequency === "daily"
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
                              ? formatAmount(fromCents(tool.billingAmount))
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDisabledForFreeUser}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => !isDisabledForFreeUser && handleEditTool(tool)}
                                  disabled={isDisabledForFreeUser}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => !isDisabledForFreeUser && handleDeleteTool(tool)}
                                  className="text-destructive"
                                  disabled={isDisabledForFreeUser}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Edit dialog (controlled) - open when user chooses to edit a tool */}
            <AddToolDialog
              categories={categories}
              editTool={editDialog.tool || null}
              open={editDialog.open}
              onOpenChange={(open) => {
                if (!open) setEditDialog({ open: false, tool: null });
                else setEditDialog((s) => ({ ...s, open }));
              }}
              onSave={(data) => {
                if (editDialog.tool) {
                  // Only send the fields that need to be updated, plus the ID
                  const updates = {
                    ...data,
                    id: editDialog.tool.id
                  };
                  updateToolMutation.mutate(updates as Tool);
                } else {
                  addToolMutation.mutate(data);
                }
                setEditDialog({ open: false, tool: null });
              }}
            />
          </>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        toolName={deleteDialog.tool?.name || ""}
        onConfirm={confirmDelete}
      />
    </div>
  );
}



