import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface SearchFilterProps {
  categories: string[];
  onSearch: (query: string) => void;
  onFilterChange: (filters: FilterState) => void;
  activeFilters: FilterState;
}

export interface FilterState {
  categories: string[];
  usageFrequency: string[];
  isPaid: "all" | "paid" | "free";
  sortBy: "name" | "cost" | "renewal" | "usage";
}

export function SearchFilter({
  categories,
  onSearch,
  onFilterChange,
  activeFilters,
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const toggleCategory = (category: string) => {
    const newCategories = activeFilters.categories.includes(category)
      ? activeFilters.categories.filter((c) => c !== category)
      : [...activeFilters.categories, category];
    onFilterChange({ ...activeFilters, categories: newCategories });
  };

  const toggleUsage = (usage: string) => {
    const newUsage = activeFilters.usageFrequency.includes(usage)
      ? activeFilters.usageFrequency.filter((u) => u !== usage)
      : [...activeFilters.usageFrequency, usage];
    onFilterChange({ ...activeFilters, usageFrequency: newUsage });
  };

  const clearFilters = () => {
    onFilterChange({
      categories: [],
      usageFrequency: [],
      isPaid: "all",
      sortBy: "name",
    });
  };

  const hasActiveFilters =
    activeFilters.categories.length > 0 ||
    activeFilters.usageFrequency.length > 0 ||
    activeFilters.isPaid !== "all";

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-filters">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFilters.categories.length +
                      activeFilters.usageFrequency.length +
                      (activeFilters.isPaid !== "all" ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      data-testid="button-clear-filters"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Categories</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Badge
                        key={category}
                        variant={activeFilters.categories.includes(category) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleCategory(category)}
                        data-testid={`filter-category-${category.toLowerCase()}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Usage Frequency</Label>
                  <div className="space-y-2">
                    {["daily", "weekly", "rarely"].map((usage) => (
                      <div key={usage} className="flex items-center gap-2">
                        <Checkbox
                          id={`usage-${usage}`}
                          checked={activeFilters.usageFrequency.includes(usage)}
                          onCheckedChange={() => toggleUsage(usage)}
                          data-testid={`filter-usage-${usage}`}
                        />
                        <Label htmlFor={`usage-${usage}`} className="text-sm capitalize">
                          {usage}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type</Label>
                  <Select
                    value={activeFilters.isPaid}
                    onValueChange={(value: "all" | "paid" | "free") =>
                      onFilterChange({ ...activeFilters, isPaid: value })
                    }
                  >
                    <SelectTrigger data-testid="select-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tools</SelectItem>
                      <SelectItem value="paid">Paid Only</SelectItem>
                      <SelectItem value="free">Free Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Select
            value={activeFilters.sortBy}
            onValueChange={(value: "name" | "cost" | "renewal" | "usage") =>
              onFilterChange({ ...activeFilters, sortBy: value })
            }
          >
            <SelectTrigger className="w-[140px]" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="cost">Cost</SelectItem>
              <SelectItem value="renewal">Renewal Date</SelectItem>
              <SelectItem value="usage">Usage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.categories.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => toggleCategory(category)}
              data-testid={`active-filter-${category.toLowerCase()}`}
            >
              {category}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {activeFilters.usageFrequency.map((usage) => (
            <Badge
              key={usage}
              variant="secondary"
              className="gap-1 cursor-pointer capitalize"
              onClick={() => toggleUsage(usage)}
              data-testid={`active-filter-${usage}`}
            >
              {usage}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {activeFilters.isPaid !== "all" && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer capitalize"
              onClick={() => onFilterChange({ ...activeFilters, isPaid: "all" })}
              data-testid="active-filter-type"
            >
              {activeFilters.isPaid}
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}



