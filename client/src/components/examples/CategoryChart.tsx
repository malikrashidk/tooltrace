import { CategoryChart } from "../CategoryChart";
import { mockTools, getCategorySpending } from "@/lib/mockData";

export default function CategoryChartExample() {
  const categoryData = getCategorySpending(mockTools);
  
  return (
    <div className="p-4 max-w-md">
      <CategoryChart data={categoryData} />
    </div>
  );
}
