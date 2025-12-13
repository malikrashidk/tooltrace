import { useState } from "react";
import { DeleteConfirmDialog } from "../DeleteConfirmDialog";
import { Button } from "@/components/ui/button";

export default function DeleteConfirmDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4">
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete Tool
      </Button>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        toolName="Figma"
        onConfirm={() => {
          console.log("Tool deleted");
          setOpen(false);
        }}
      />
    </div>
  );
}



