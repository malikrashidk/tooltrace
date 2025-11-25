import { useState, useMemo } from "react";
import { Plus, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/ToolCard";
import { SearchFilter, type FilterState } from "@/components/SearchFilter";
import { AddToolDialog } from "@/components/AddToolDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import {
  mockTools,
  mockCategories,
  type Tool,
} from "@/lib/mockData";
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
  // todo: remove mock functionality - replace with real API data
  const [tools, setTools] = useState<Tool[]>(mockTools);
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

  const filteredTools = useMemo(() => {
    let result = [...tools];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tool) =>
          tool.name.toLowerCase().includes(query) ||
          tool.notes?.toLowerCase().includes(query) ||
          tool.categories.some((c) => c.toLowerCase().includes(query)) ||
          tool.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    if (filters.categories.length > 0) {
      result = result.filter((tool) =>
        tool.categories.some((c) => filters.categories.includes(c))
      );
    }

    if (filters.usageFrequency.length > 0) {
      result = result.filter((tool) =>
        filters.usageFrequency.includes(tool.usageFrequency)
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
          return (b.billingAmount || 0) - (a.billingAmount || 0);
        case "renewal":
          if (!a.nextRenewalDate) return 1;
          if (!b.nextRenewalDate) return -1;
          return new Date(a.nextRenewalDate).getTime() - new Date(b.nextRenewalDate).getTime();
        case "usage":
          const usageOrder = { daily: 0, weekly: 1, rarely: 2 };
          return usageOrder[a.usageFrequency] - usageOrder[b.usageFrequency];
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [tools, searchQuery, filters]);

  const handleAddTool = (newTool: Partial<Tool>) => {
    const tool: Tool = {
      id: `tool-${Date.now()}`,
      name: newTool.name || "",
      websiteUrl: newTool.websiteUrl || "",
      notes: newTool.notes || "",
      isPaid: newTool.isPaid || false,
      categories: newTool.categories || [],
      tags: newTool.tags || [],
      usageFrequency: newTool.usageFrequency || "weekly",
      logoUrl: newTool.logoUrl,
      billingAmount: newTool.billingAmount,
      billingCycle: newTool.billingCycle,
      nextRenewalDate: newTool.nextRenewalDate,
      paymentMethod: newTool.paymentMethod,
    };
    setTools([...tools, tool]);
    toast({
      title: "Tool added",
      description: `${tool.name} has been added to your collection.`,
    });
  };

  const handleEditTool = (tool: Tool) => {
    console.log("Edit tool:", tool);
  };

  const handleDeleteTool = (tool: Tool) => {
    setDeleteDialog({ open: true, tool });
  };

  const confirmDelete = () => {
    if (deleteDialog.tool) {
      setTools(tools.filter((t) => t.id !== deleteDialog.tool!.id));
      toast({
        title: "Tool deleted",
        description: `${deleteDialog.tool.name} has been removed.`,
      });
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
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">All Tools</h1>
          <p className="text-muted-foreground">
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
          <AddToolDialog categories={mockCategories} onSave={handleAddTool} />
        </div>
      </div>

      <SearchFilter
        categories={mockCategories.map((c) => c.name)}
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
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTools.map((tool) => (
                <TableRow key={tool.id} data-testid={`table-row-${tool.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-lg border">
                        <AvatarImage src={tool.logoUrl} alt={tool.name} className="object-contain p-0.5" />
                        <AvatarFallback className="rounded-lg text-xs">
                          {getInitials(tool.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{tool.name}</p>
                        <a
                          href={tool.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tool.categories.slice(0, 2).map((cat) => (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                      {tool.categories.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{tool.categories.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
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
                  <TableCell className="text-right font-mono">
                    {tool.isPaid && tool.billingAmount
                      ? formatCurrency(tool.billingAmount)
                      : "Free"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tool.nextRenewalDate
                      ? new Date(tool.nextRenewalDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
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

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        toolName={deleteDialog.tool?.name || ""}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
