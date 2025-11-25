import { useState } from "react";
import { SearchFilter, type FilterState } from "../SearchFilter";
import { mockCategories } from "@/lib/mockData";

export default function SearchFilterExample() {
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    usageFrequency: [],
    isPaid: "all",
    sortBy: "name",
  });

  return (
    <div className="p-4 max-w-2xl">
      <SearchFilter
        categories={mockCategories.map((c) => c.name)}
        onSearch={(query) => console.log("Search:", query)}
        onFilterChange={setFilters}
        activeFilters={filters}
      />
    </div>
  );
}
