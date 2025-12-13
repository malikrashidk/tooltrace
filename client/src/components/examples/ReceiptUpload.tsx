import { ReceiptUpload } from "../ReceiptUpload";

export default function ReceiptUploadExample() {
  const mockReceipts = [
    { id: "1", name: "Invoice-Nov-2025.pdf", uploadDate: "2025-11-01" },
    { id: "2", name: "Receipt-Oct-2025.pdf", uploadDate: "2025-10-15" },
  ];

  return (
    <div className="p-4 max-w-md">
      <ReceiptUpload
        toolId="1"
        toolName="Figma"
        receipts={mockReceipts}
        onUpload={(file) => console.log("Upload:", file.name)}
        onDelete={(id) => console.log("Delete:", id)}
      />
    </div>
  );
}



