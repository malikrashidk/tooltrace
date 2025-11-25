import { useState, useMemo } from "react";
import { Plus, Download, Upload, Copy, Edit2, Trash2, ChevronRight, Calendar, DollarSign, Zap, Filter, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { mockTools, type Tool } from "@/lib/mockData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function AdvancedToolsManagement() {
  const { user } = useAuth();
  const isPaidPlan = user?.plan === "standard" || user?.plan === "premium";
  const { toast } = useToast();
  const [tools, setTools] = useState<Tool[]>(mockTools);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  if (!isPaidPlan) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">Advanced Tools Management</h1>
          <p className="text-muted-foreground">Bulk operations, detailed management, and tool intelligence</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-5xl">⚙️</div>
              <h2 className="text-2xl font-semibold">Upgrade for Advanced Management</h2>
              <p className="text-muted-foreground">
                Advanced tools management with bulk operations and inline editing is available on Standard and Premium plans.
              </p>
              <Button asChild className="mt-4">
                <a href="/pricing">View Pricing Plans</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSelectTool = (toolId: string) => {
    const newSelected = new Set(selectedTools);
    if (newSelected.has(toolId)) {
      newSelected.delete(toolId);
    } else {
      newSelected.add(toolId);
    }
    setSelectedTools(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTools.size === tools.length) {
      setSelectedTools(new Set());
    } else {
      setSelectedTools(new Set(tools.map((t) => t.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedTools.size === 0) return;
    setTools(tools.filter((t) => !selectedTools.has(t.id)));
    setSelectedTools(new Set());
    toast({
      description: `${selectedTools.size} tool(s) deleted`,
    });
  };

  const handleBulkExport = () => {
    const csvContent = [
      ["Name", "Category", "Website", "Cost", "Billing Cycle", "Usage", "Renewal Date"],
      ...tools
        .filter((t) => selectedTools.size === 0 || selectedTools.has(t.id))
        .map((t) => [
          t.name,
          t.categories.join("; "),
          t.websiteUrl,
          t.billingAmount || "Free",
          t.billingCycle || "N/A",
          t.usageFrequency,
          t.nextRenewalDate || "N/A",
        ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tools-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    
    toast({
      description: `Exported ${selectedTools.size || tools.length} tool(s)`,
    });
  };

  const handleBulkCategoryEdit = (category: string) => {
    if (selectedTools.size === 0) return;
    const updated = tools.map((t) =>
      selectedTools.has(t.id)
        ? { ...t, categories: [...new Set([...t.categories, category])] }
        : t
    );
    setTools(updated);
    setSelectedTools(new Set());
    toast({
      description: `Added category to ${selectedTools.size} tool(s)`,
    });
  };

  const selectedToolsArray = Array.from(selectedTools);
  
  const totalCost = tools
    .filter((t) => selectedTools.size === 0 || selectedTools.has(t.id))
    .reduce((sum, t) => sum + (t.billingAmount || 0), 0);

  const handleEditNote = (toolId: string, notes: string) => {
    setEditingNotes((prev) => ({
      ...prev,
      [toolId]: notes,
    }));
  };

  const handleSaveNote = (toolId: string) => {
    const newNotes = editingNotes[toolId];
    setTools(
      tools.map((t) =>
        t.id === toolId ? { ...t, notes: newNotes } : t
      )
    );
    setEditingNotes((prev) => {
      const updated = { ...prev };
      delete updated[toolId];
      return updated;
    });
    toast({
      description: "Notes updated",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Advanced Tools Management</h1>
        <p className="text-muted-foreground">Bulk operations, detailed management, and tool intelligence</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Tools</p>
            <p className="text-3xl font-semibold">{tools.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Monthly Cost</p>
            <p className="text-3xl font-semibold font-mono">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Selected</p>
            <p className="text-3xl font-semibold">{selectedTools.size}</p>
          </CardContent>
        </Card>
      </div>

      {selectedTools.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <p className="text-sm">
              <span className="font-semibold">{selectedTools.size}</span> tool(s) selected
            </p>
            <div className="flex gap-2 flex-wrap">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Filter className="h-4 w-4 mr-1" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Category to Selected</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    {["Design", "Development", "AI", "Cloud", "Marketing", "Communication"].map((cat) => (
                      <Button
                        key={cat}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleBulkCategoryEdit(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="outline" onClick={handleBulkExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Tools</CardTitle>
            <CardDescription>Manage your complete tool inventory</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 border rounded-lg">
            <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
              <Checkbox
                checked={selectedTools.size === tools.length && tools.length > 0}
                onCheckedChange={handleSelectAll}
                data-testid="checkbox-select-all"
              />
              <span className="text-sm font-medium text-muted-foreground">
                {selectedTools.size > 0 ? `${selectedTools.size} selected` : "Select all"}
              </span>
            </div>

            {tools.map((tool) => {
              const isExpanded = expandedTool === tool.id;
              const isSelected = selectedTools.has(tool.id);

              return (
                <div key={tool.id}>
                  <div className="flex items-center gap-3 p-4 border-b hover:bg-muted/50 transition">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectTool(tool.id)}
                      data-testid={`checkbox-tool-${tool.id}`}
                    />
                    <button
                      onClick={() => setExpandedTool(isExpanded ? null : tool.id)}
                      className="flex-1 flex items-center gap-3 hover:opacity-75 transition text-left"
                      data-testid={`button-expand-tool-${tool.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{tool.name}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {tool.categories.map((cat) => (
                            <Badge key={cat} variant="secondary" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {tool.billingAmount && (
                        <div className="text-right">
                          <p className="font-mono font-semibold">${tool.billingAmount}</p>
                          <p className="text-xs text-muted-foreground">{tool.billingCycle}</p>
                        </div>
                      )}
                      <ChevronRight
                        className={`h-5 w-5 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="bg-muted/30 p-4 space-y-3 border-b">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Usage</p>
                          <Badge variant="outline" className="capitalize">
                            {tool.usageFrequency}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                          <Badge variant={tool.isPaid ? "default" : "secondary"}>
                            {tool.isPaid ? "Paid" : "Free"}
                          </Badge>
                        </div>
                        {tool.nextRenewalDate && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Next Renewal</p>
                            <p className="text-sm font-mono">{tool.nextRenewalDate}</p>
                          </div>
                        )}
                        {tool.paymentMethod && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Payment Method</p>
                            <p className="text-sm">{tool.paymentMethod}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-muted-foreground">Notes</p>
                          {editingNotes[tool.id] !== undefined && (
                            <div className="flex gap-1">
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => handleSaveNote(tool.id)}
                                data-testid={`button-save-notes-${tool.id}`}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => {
                                  const updated = { ...editingNotes };
                                  delete updated[tool.id];
                                  setEditingNotes(updated);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {editingNotes[tool.id] !== undefined ? (
                          <Textarea
                            value={editingNotes[tool.id]}
                            onChange={(e) => handleEditNote(tool.id, e.target.value)}
                            placeholder="Add notes for this tool..."
                            className="text-sm h-20"
                            data-testid={`textarea-notes-${tool.id}`}
                          />
                        ) : (
                          <div
                            onClick={() => handleEditNote(tool.id, tool.notes || "")}
                            className="text-sm p-2 rounded border border-dashed cursor-pointer hover:bg-background/50 transition"
                            data-testid={`notes-edit-${tool.id}`}
                          >
                            {tool.notes ? (
                              <p>{tool.notes}</p>
                            ) : (
                              <p className="text-muted-foreground italic">Click to add notes...</p>
                            )}
                          </div>
                        )}
                      </div>

                      {tool.tags.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
                          <div className="flex gap-1 flex-wrap">
                            {tool.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(tool.websiteUrl, "_blank")}
                        >
                          Open Website
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bulk Import</CardTitle>
            <CardDescription>Import tools from CSV file</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Choose CSV File
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Smart Insights</CardTitle>
            <CardDescription>Tool recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• You have <strong>{tools.filter((t) => t.usageFrequency === "rarely").length} rarely used</strong> tools</p>
            <p>• Potential monthly savings: <strong>${tools.filter((t) => t.usageFrequency === "rarely").reduce((sum, t) => sum + (t.billingAmount || 0), 0).toFixed(2)}</strong></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
