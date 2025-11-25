import { ToolCard } from "../ToolCard";
import { mockTools } from "@/lib/mockData";

export default function ToolCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {mockTools.slice(0, 3).map((tool) => (
        <ToolCard
          key={tool.id}
          tool={tool}
          onEdit={(t) => console.log("Edit:", t.name)}
          onDelete={(t) => console.log("Delete:", t.name)}
        />
      ))}
    </div>
  );
}
