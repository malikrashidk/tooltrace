import { useState, useRef } from "react";
import { FileText, Lock, Upload, Trash2, Download, Plus, Calendar, DollarSign, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Receipt, Tool } from "@shared/schema";

export function ReceiptStoragePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { formatAmount } = useCurrency();
  const isPaidPlan = user?.plan === "pro" || user?.plan === "enterprise";
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: receiptsData, isLoading: receiptsLoading } = useQuery<{ receipts: Receipt[] }>({
    queryKey: ['/api/receipts'],
    enabled: isPaidPlan,
  });

  const { data: toolsData } = useQuery<{ tools: Tool[] }>({
    queryKey: ['/api/tools'],
    enabled: isPaidPlan,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: { fileName: string; fileData: string; toolId?: string; amount?: string; receiptDate?: string }) => {
      const response = await apiRequest("POST", "/api/receipts", formData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh the list immediately
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      // Force refetch active queries to ensure UI updates
      queryClient.refetchQueries({ queryKey: ['/api/receipts'] });
      toast({ title: "Success", description: "Receipt uploaded successfully" });
      handleCloseUploadDialog();
    },
    onError: (error: any) => {
      const msg = error?.message || "";
      if (msg.startsWith("403:") || msg.includes("Receipt storage is only")) {
        // Prompt upgrade instead of showing a destructive error
        toast({ title: "Upgrade required", description: "Receipt storage requires a Pro or Enterprise plan.", });
        setLocation("/pricing");
        return;
      }

      toast({ title: "Error", description: error.message || "Failed to upload receipt", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/receipts/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      toast({ title: "Success", description: "Receipt deleted successfully" });
      setDeleteDialogOpen(false);
      setReceiptToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete receipt", variant: "destructive" });
    },
  });

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setSelectedFile(null);
    setSelectedToolId("");
    setAmount("");
    setReceiptDate("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Error", description: "Only PDF, PNG, JPG, and JPEG files are allowed", variant: "destructive" });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 2MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      uploadMutation.mutate({
        fileName: selectedFile.name,
        fileData: base64Data,
        toolId: selectedToolId || undefined,
        amount: amount || undefined,
        receiptDate: receiptDate || undefined,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDownload = (receipt: Receipt) => {
    const link = document.createElement('a');
    link.href = receipt.fileUrl;
    link.download = receipt.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getToolName = (toolId: string | null) => {
    if (!toolId || !toolsData?.tools) return "No tool linked";
    const tool = toolsData.tools.find(t => t.id === toolId);
    return tool?.name || "Unknown tool";
  };

  const formatDate = (dateString: Date | string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatReceiptAmount = (amount: string | null) => {
    if (!amount) return "N/A";
    return formatAmount(amount);
  };

  if (!isPaidPlan) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Invoice & Receipt Storage</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Upload and organize invoices and receipts for your subscriptions</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="text-center space-y-4 max-w-md">
              <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold">Upgrade for Receipt Storage</h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                Store and organize invoices and receipts with Pro and Enterprise plans.
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

  const receipts = receiptsData?.receipts || [];
  const tools = toolsData?.tools || [];

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Invoice & Receipt Storage</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Upload and organize invoices and receipts for your subscriptions</p>
        </div>
        <Button 
          onClick={() => setUploadDialogOpen(true)}
          className="w-full sm:w-auto"
          data-testid="button-upload-receipt"
        >
          <Plus className="h-4 w-4 mr-2" />
          Upload Receipt
        </Button>
      </div>

      {receiptsLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="animate-pulse text-muted-foreground">Loading receipts...</div>
          </CardContent>
        </Card>
      ) : receipts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <FileText className="h-12 w-12 mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Receipts Yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Upload your first receipt to start organizing your subscription invoices
            </p>
            <Button 
              onClick={() => setUploadDialogOpen(true)}
              data-testid="button-upload-first-receipt"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First Receipt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {receipts.map((receipt) => (
            <Card key={receipt.id} className="hover-elevate" data-testid={`card-receipt-${receipt.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{receipt.fileName}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Uploaded {formatDate(receipt.uploadDate)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDownload(receipt)}
                      data-testid={`button-download-${receipt.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setReceiptToDelete(receipt);
                        setDeleteDialogOpen(true);
                      }}
                      data-testid={`button-delete-${receipt.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Link className="h-4 w-4" />
                  <span className="truncate">{getToolName(receipt.toolId)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{formatReceiptAmount(receipt.amount)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Receipt date: {formatDate(receipt.receiptDate)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Receipt</DialogTitle>
            <DialogDescription>
              Upload a receipt or invoice file (PDF, PNG, JPG, JPEG - max 2MB)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                ref={fileInputRef}
                data-testid="input-file"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tool">Link to Tool (optional)</Label>
              <Select value={selectedToolId} onValueChange={setSelectedToolId}>
                <SelectTrigger data-testid="select-tool">
                  <SelectValue placeholder="Select a tool" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tool</SelectItem>
                  {tools.map((tool) => (
                    <SelectItem key={tool.id} value={tool.id}>{tool.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (optional)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptDate">Receipt Date (optional)</Label>
              <Input
                id="receiptDate"
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                data-testid="input-receipt-date"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCloseUploadDialog}
              className="w-full sm:w-auto"
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-confirm-upload"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{receiptToDelete?.fileName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => receiptToDelete && deleteMutation.mutate(receiptToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



