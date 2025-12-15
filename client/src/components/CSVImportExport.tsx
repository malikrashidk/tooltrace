import { useState } from "react";
import { Download, Upload, FileText, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import type { Tool } from "@/lib/analytics";

interface CSVImportExportProps {
  tools: Tool[];
  onImport: (tools: Partial<Tool>[]) => void;
}

export function CSVImportExport({ tools, onImport }: CSVImportExportProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const generateCSV = () => {
    const headers = [
      "name",
      "websiteUrl",
      "notes",
      "isPaid",
      "categories",
      "tags",
      "usageFrequency",
      "billingAmount",
      "billingCycle",
      "nextRenewalDate",
      "paymentMethod",
    ];

    const rows = tools.map((tool) => [
      tool.name,
      tool.websiteUrl,
      tool.notes || "",
      tool.isPaid ? "true" : "false",
      tool.categories.join(";"),
      tool.tags.join(";"),
      tool.usageFrequency,
      tool.billingAmount?.toString() || "",
      tool.billingCycle || "",
      tool.nextRenewalDate || "",
      tool.paymentMethod || "",
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saas-tools-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const headers = [
      "name",
      "websiteUrl",
      "notes",
      "isPaid",
      "categories",
      "tags",
      "usageFrequency",
      "billingAmount",
      "billingCycle",
      "nextRenewalDate",
      "paymentMethod",
    ];

    const exampleRow = [
      "Figma",
      "https://figma.com",
      "Design tool",
      "true",
      "Design;Productivity",
      "ui;prototyping",
      "daily",
      "15",
      "monthly",
      "2025-12-01",
      "Credit Card",
    ];

    const csv = [
      headers.join(","),
      exampleRow.map((cell) => `"${cell}"`).join(","),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "saas-tools-import-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (content: string): Partial<Tool>[] => {
    const lines = content.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
    const tools: Partial<Tool>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^,]+)/g)?.map((v) => v.replace(/"/g, "").trim()) || [];
      const tool: Record<string, unknown> = {};

      headers.forEach((header, index) => {
        const value = values[index] || "";
        switch (header) {
          case "isPaid":
            tool[header] = value.toLowerCase() === "true";
            break;
          case "categories":
          case "tags":
            tool[header] = value ? value.split(";").map((s) => s.trim()) : [];
            break;
          case "billingAmount":
            tool[header] = value ? parseFloat(value) : undefined;
            break;
          default:
            tool[header] = value || undefined;
        }
      });

      if (tool.name && tool.websiteUrl) {
        tools.push(tool as Partial<Tool>);
      }
    }

    return tools;
  };

  const handleFileUpload = async (file: File) => {
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      const content = await file.text();
      const parsedTools = parseCSV(content);

      let success = 0;
      const errors: string[] = [];

      for (let i = 0; i < parsedTools.length; i++) {
        setImportProgress(Math.round(((i + 1) / parsedTools.length) * 100));
        
        try {
          await new Promise((resolve) => setTimeout(resolve, 100));
          success++;
        } catch {
          errors.push(`Row ${i + 2}: Failed to import ${parsedTools[i].name}`);
        }
      }

      onImport(parsedTools);
      setImportResult({
        success,
        failed: errors.length,
        errors,
      });
    } catch {
      setImportResult({
        success: 0,
        failed: 1,
        errors: ["Failed to parse CSV file"],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "text/csv") {
      handleFileUpload(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-csv-import-export">
          <FileText className="h-4 w-4 mr-2" />
          Import/Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import & Export Tools</DialogTitle>
          <DialogDescription>
            Bulk manage your tools with CSV files
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" data-testid="tab-import">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </TabsTrigger>
            <TabsTrigger value="export" data-testid="tab-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4 mt-4">
            {!importing && !importResult && (
              <>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  data-testid="drop-zone-import"
                >
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-2">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    or click to browse
                  </p>
                  <label>
                    <Button variant="secondary" className="cursor-pointer" asChild>
                      <span>
                        <FileText className="h-4 w-4 mr-2" />
                        Choose File
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      data-testid="input-file-upload"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Need a template?</span>
                  <button
                    onClick={downloadTemplate}
                    className="text-primary hover:underline"
                    data-testid="button-download-template"
                  >
                    Download CSV template
                  </button>
                </div>
              </>
            )}

            {importing && (
              <div className="py-8 space-y-4">
                <div className="text-center">
                  <p className="font-medium mb-2">Importing tools...</p>
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">{importProgress}%</p>
                </div>
              </div>
            )}

            {importResult && (
              <div className="py-4 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  {importResult.failed === 0 ? (
                    <Check className="h-8 w-8 text-green-500" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">Import Complete</p>
                    <p className="text-sm text-muted-foreground">
                      {importResult.success} tools imported
                      {importResult.failed > 0 && `, ${importResult.failed} failed`}
                    </p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-sm text-destructive space-y-1">
                    {importResult.errors.map((error, i) => (
                      <p key={i}>{error}</p>
                    ))}
                  </div>
                )}
                <Button
                  variant="secondary"
                  onClick={() => setImportResult(null)}
                  className="w-full"
                >
                  Import Another File
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="text-center py-8 bg-muted/50 rounded-lg">
              <Download className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium mb-2">Export All Tools</p>
              <p className="text-sm text-muted-foreground mb-4">
                Download all {tools.length} tools as a CSV file
              </p>
              <Button onClick={generateCSV} data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



