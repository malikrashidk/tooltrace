import { useState } from "react";
import { Upload, FileText, X, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Receipt {
  id: string;
  name: string;
  uploadDate: string;
  url?: string;
}

interface ReceiptUploadProps {
  toolId: string;
  toolName: string;
  receipts: Receipt[];
  onUpload: (file: File) => void;
  onDelete: (receiptId: string) => void;
}

export function ReceiptUpload({
  toolName,
  receipts,
  onUpload,
  onDelete,
}: ReceiptUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      onUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <Card data-testid="receipt-upload">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Receipts & Invoices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          data-testid="drop-zone-receipt"
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">Upload receipt or invoice</p>
          <p className="text-xs text-muted-foreground mb-3">
            PDF, PNG, or JPG up to 10MB
          </p>
          <label>
            <Button variant="secondary" size="sm" className="cursor-pointer" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </span>
            </Button>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-receipt-file"
            />
          </label>
        </div>

        {receipts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Uploaded Files</p>
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                data-testid={`receipt-item-${receipt.id}`}
              >
                <FileText className="h-8 w-8 text-muted-foreground p-1.5 bg-background rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{receipt.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(receipt.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewUrl(receipt.url || null)}
                        data-testid={`button-view-receipt-${receipt.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>{receipt.name}</DialogTitle>
                      </DialogHeader>
                      <div className="flex items-center justify-center min-h-[400px] bg-muted rounded-lg">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={receipt.name}
                            className="max-w-full max-h-[60vh] object-contain"
                          />
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <FileText className="h-16 w-16 mx-auto mb-2" />
                            <p>Preview not available</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`button-download-receipt-${receipt.id}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(receipt.id)}
                    data-testid={`button-delete-receipt-${receipt.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



