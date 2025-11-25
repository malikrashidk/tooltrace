import { useState, useMemo } from "react";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/StatsCards";
import { ToolCard } from "@/components/ToolCard";
import { RenewalsWidget } from "@/components/RenewalsWidget";
import { LowUsageWidget } from "@/components/LowUsageWidget";
import { CategoryChart } from "@/components/CategoryChart";
import { SearchFilter, type FilterState } from "@/components/SearchFilter";
import { AddToolDialog } from "@/components/AddToolDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { CSVImportExport } from "@/components/CSVImportExport";
import { useToast } from "@/hooks/use-toast";
import {
  mockTools,
  mockCategories,
  getMonthlySpend,
  getYearlySpend,
  getUpcomingRenewals,
  getLowUsageTools,
  getCategorySpending,
  type Tool,
} from "@/lib/mockData";

export function Dashboard() {
  const { toast } = useToast();
  // todo: remove mock functionality - replace with real API data
  const [tools, setTools] = useState<Tool[]>(mockTools);
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

  const monthlySpend = useMemo(() => getMonthlySpend(tools), [tools]);
  const yearlySpend = useMemo(() => getYearlySpend(tools), [tools]);
  const upcomingRenewals = useMemo(() => getUpcomingRenewals(tools, 30), [tools]);
  const lowUsageTools = useMemo(() => getLowUsageTools(tools), [tools]);
  const categorySpending = useMemo(() => getCategorySpending(tools), [tools]);

  const paidTools = tools.filter((t) => t.isPaid).length;
  const freeTools = tools.filter((t) => !t.isPaid).length;

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
    // todo: remove mock functionality - replace with real API call
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
    toast({
      title: "Edit mode",
      description: `Editing ${tool.name}...`,
    });
  };

  const handleDeleteTool = (tool: Tool) => {
    setDeleteDialog({ open: true, tool });
  };

  const confirmDelete = () => {
    if (deleteDialog.tool) {
      // todo: remove mock functionality - replace with real API call
      setTools(tools.filter((t) => t.id !== deleteDialog.tool!.id));
      toast({
        title: "Tool deleted",
        description: `${deleteDialog.tool.name} has been removed.`,
      });
    }
    setDeleteDialog({ open: false, tool: null });
  };

  const handleImport = (importedTools: Partial<Tool>[]) => {
    // todo: remove mock functionality - replace with real API call
    const newTools = importedTools.map((t, index) => ({
      id: `imported-${Date.now()}-${index}`,
      name: t.name || "",
      websiteUrl: t.websiteUrl || "",
      notes: t.notes || "",
      isPaid: t.isPaid || false,
      categories: t.categories || [],
      tags: t.tags || [],
      usageFrequency: t.usageFrequency || "weekly",
      logoUrl: t.logoUrl,
      billingAmount: t.billingAmount,
      billingCycle: t.billingCycle,
      nextRenewalDate: t.nextRenewalDate,
      paymentMethod: t.paymentMethod,
    })) as Tool[];
    setTools([...tools, ...newTools]);
    toast({
      title: "Import complete",
      description: `${newTools.length} tools have been imported.`,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-8 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage and track your SaaS subscriptions</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CSVImportExport tools={tools} onImport={handleImport} />
            <AddToolDialog categories={mockCategories} onSave={handleAddTool} />
          </div>
        </div>
      </div>

      <StatsCards
        monthlySpend={monthlySpend}
        yearlySpend={yearlySpend}
        totalTools={tools.length}
        paidTools={paidTools}
        freeTools={freeTools}
        lowUsageCount={lowUsageTools.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SearchFilter
            categories={mockCategories.map((c) => c.name)}
            onSearch={setSearchQuery}
            onFilterChange={setFilters}
            activeFilters={filters}
          />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Your Tools</h2>
              <span className="text-sm text-muted-foreground">
                {filteredTools.length} of {tools.length} tools
              </span>
            </div>

            {filteredTools.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-muted/40 to-muted/20 rounded-lg border-2 border-dashed border-muted/50">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No tools found</h3>
                <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
                  {searchQuery || filters.categories.length > 0
                    ? "Try adjusting your search or filters"
                    : "Get started by adding your first SaaS tool to begin tracking"}
                </p>
                {!searchQuery && filters.categories.length === 0 && (
                  <AddToolDialog
                    categories={mockCategories}
                    onSave={handleAddTool}
                    trigger={
                      <Button size="lg">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Tool
                      </Button>
                    }
                  />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onEdit={handleEditTool}
                    onDelete={handleDeleteTool}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <RenewalsWidget
            renewals={upcomingRenewals}
            title="Upcoming Renewals (30 days)"
            onViewAll={() => console.log("View all renewals")}
          />
          <LowUsageWidget
            tools={lowUsageTools}
            onViewAll={() => console.log("View low usage")}
            onReviewTool={(tool) => console.log("Review:", tool.name)}
          />
          <CategoryChart data={categorySpending} />
        </div>
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
