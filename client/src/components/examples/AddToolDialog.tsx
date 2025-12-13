import { AddToolDialog } from "../AddToolDialog";
import { mockCategories } from "@/lib/mockData";

export default function AddToolDialogExample() {
  return (
    <div className="p-4">
      <AddToolDialog
        categories={mockCategories}
        onSave={(tool) => console.log("Tool saved:", tool)}
      />
    </div>
  );
}



