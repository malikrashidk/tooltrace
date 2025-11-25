import { CSVImportExport } from "../CSVImportExport";
import { mockTools } from "@/lib/mockData";

export default function CSVImportExportExample() {
  return (
    <div className="p-4">
      <CSVImportExport
        tools={mockTools}
        onImport={(tools) => console.log("Imported tools:", tools)}
      />
    </div>
  );
}
