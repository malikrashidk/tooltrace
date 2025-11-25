import { useState } from "react";
import { Upload, Download, Trash2, Eye, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// todo: remove mock functionality - replace with real file storage
const mockReceipts = [
  {
    id: "receipt-1",
    toolName: "Slack",
    fileName: "slack_invoice_oct_2024.pdf",
    size: "2.4 MB",
    uploadDate: "2024-10-15",
    amount: 149.99,
    invoiceDate: "2024-10-01",
    type: "invoice",
  },
  {
    id: "receipt-2",
    toolName: "Figma",
    fileName: "figma_receipt_nov_2024.pdf",
    size: "1.8 MB",
    uploadDate: "2024-11-01",
    amount: 120.0,
    invoiceDate: "2024-11-01",
    type: "receipt",
  },
  {
    id: "receipt-3",
    toolName: "GitHub Pro",
    fileName: "github_annual_receipt.pdf",
    size: "956 KB",
    uploadDate: "2024-09-20",
    amount: 99.99,
    invoiceDate: "2024-09-20",
    type: "invoice",
  },
  {
    id: "receipt-4",
    toolName: "Notion",
    fileName: "notion_yearly_invoice.pdf",
    size: "1.2 MB",
    uploadDate: "2024-08-10",
    amount: 120.0,
    invoiceDate: "2024-08-01",
    type: "invoice",
  },
];

export function ReceiptStoragePage() {
  const [receipts, setReceipts] = useState(mockReceipts);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedTool, setSelectedTool] = useState("");
  const [fileType, setFileType] = useState("invoice");
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadReceipt = () => {
    if (!selectedFile || !selectedTool) {
      toast({
        description: "Please select a file and tool",
        variant: "destructive",
      });
      return;
    }

    // todo: remove mock functionality - replace with real file upload API
    const newReceipt = {
      id: `receipt-${Date.now()}`,
      toolName: selectedTool,
      fileName: selectedFile.name,
      size: `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`,
      uploadDate: new Date().toISOString().split("T")[0],
      amount: 0,
      invoiceDate: new Date().toISOString().split("T")[0],
      type: fileType,
    };

    setReceipts([...receipts, newReceipt]);
    setSelectedFile(null);
    setSelectedTool("");
    setFileType("invoice");
    setShowUploadDialog(false);
    toast({
      description: "Receipt uploaded successfully",
    });
  };

  const deleteReceipt = (id: string) => {
    // todo: remove mock functionality - replace with real API call
    setReceipts(receipts.filter((receipt) => receipt.id !== id));
    toast({
      description: "Receipt deleted",
    });
  };

  const downloadReceipt = (fileName: string) => {
    // todo: remove mock functionality - implement real download
    toast({
      description: `Downloading ${fileName}...`,
    });
  };

  const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const uniqueTools = new Set(receipts.map((r) => r.toolName)).size;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Invoice & Receipt Storage</h1>
        <p className="text-muted-foreground">Upload and organize invoices and receipts for your subscriptions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Receipts</p>
              <p className="text-3xl font-semibold">{receipts.length}</p>
              <p className="text-xs text-muted-foreground mt-1">files stored</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
              <p className="text-3xl font-semibold font-mono">${totalAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">tracked receipts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Tools</p>
              <p className="text-3xl font-semibold">{uniqueTools}</p>
              <p className="text-xs text-muted-foreground mt-1">have receipts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Receipts & Invoices</CardTitle>
            <CardDescription>Manage your SaaS subscription documents</CardDescription>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Receipt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Receipt or Invoice</DialogTitle>
                <DialogDescription>Add a new document to your storage</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Tool</label>
                  <Select value={selectedTool} onValueChange={setSelectedTool}>
                    <SelectTrigger data-testid="select-tool-receipt">
                      <SelectValue placeholder="Choose a tool..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Slack">Slack</SelectItem>
                      <SelectItem value="Figma">Figma</SelectItem>
                      <SelectItem value="GitHub Pro">GitHub Pro</SelectItem>
                      <SelectItem value="Notion">Notion</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Document Type</label>
                  <Select value={fileType} onValueChange={setFileType}>
                    <SelectTrigger data-testid="select-document-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="statement">Statement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Upload File</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                      data-testid="input-file"
                    />
                    <label htmlFor="file-input" className="cursor-pointer block">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      {selectedFile ? (
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium">Click to upload or drag and drop</p>
                          <p className="text-xs text-muted-foreground">PDF, PNG, or JPG (max 10MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={uploadReceipt} data-testid="button-upload-receipt">
                    Upload
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">No receipts uploaded yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  receipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.toolName}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{receipt.fileName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {receipt.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {receipt.uploadDate}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {receipt.size}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadReceipt(receipt.fileName)}
                            data-testid="button-download-receipt"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteReceipt(receipt.id)}
                            data-testid="button-delete-receipt"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Storage Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold text-sm mb-1">Supported Formats</p>
            <p className="text-sm text-muted-foreground">PDF, PNG, JPG, JPEG</p>
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">Maximum File Size</p>
            <p className="text-sm text-muted-foreground">10 MB per file</p>
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">Total Storage</p>
            <p className="text-sm text-muted-foreground">Premium: Unlimited • Standard: 500 MB • Free: 50 MB</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
