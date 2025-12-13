import { LowUsageWidget } from "../LowUsageWidget";
import { mockTools, getLowUsageTools } from "@/lib/mockData";

export default function LowUsageWidgetExample() {
  const lowUsageTools = getLowUsageTools(mockTools);
  
  return (
    <div className="p-4 max-w-md">
      <LowUsageWidget
        tools={lowUsageTools}
        onViewAll={() => console.log("View all low usage tools")}
        onReviewTool={(tool) => console.log("Review tool:", tool.name)}
      />
    </div>
  );
}



