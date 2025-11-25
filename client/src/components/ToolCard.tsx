import { ExternalLink, MoreVertical, Pencil, Trash2, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Tool } from "@/lib/mockData";

interface ToolCardProps {
  tool: Tool;
  onEdit?: (tool: Tool) => void;
  onDelete?: (tool: Tool) => void;
}

export function ToolCard({ tool, onEdit, onDelete }: ToolCardProps) {
  const getUsageColor = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "weekly":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "rarely":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "";
    }
  };

  const formatCost = (amount: number, cycle: string) => {
    const formattedAmount = amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
    const cycleLabel = cycle === "monthly" ? "/mo" : cycle === "yearly" ? "/yr" : "";
    return `${formattedAmount}${cycleLabel}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="group hover-elevate transition-all duration-200" data-testid={`card-tool-${tool.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Avatar className="h-14 w-14 rounded-lg border-2 border-border/50">
              <AvatarImage src={tool.logoUrl} alt={tool.name} className="object-contain p-1" />
              <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-sm font-semibold">
                {getInitials(tool.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base truncate" data-testid={`text-tool-name-${tool.id}`}>
                {tool.name}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                {tool.isPaid && tool.billingAmount && (
                  <span className="text-base font-mono font-bold text-primary" data-testid={`text-tool-cost-${tool.id}`}>
                    {formatCost(tool.billingAmount, tool.billingCycle || "")}
                  </span>
                )}
                {!tool.isPaid && (
                  <Badge className="text-xs bg-green-100/50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    Free
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`button-tool-menu-${tool.id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(tool)} data-testid={`button-edit-tool-${tool.id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(tool)}
                className="text-destructive"
                data-testid={`button-delete-tool-${tool.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {tool.notes && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed" data-testid={`text-tool-notes-${tool.id}`}>
            {tool.notes}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {tool.categories.map((category) => (
            <Badge key={category} variant="outline" className="text-xs font-medium">
              {category}
            </Badge>
          ))}
          <Badge className={`text-xs font-medium ${getUsageColor(tool.usageFrequency)}`}>
            <Clock className="h-3 w-3 mr-1" />
            {tool.usageFrequency}
          </Badge>
        </div>

        {tool.isPaid && tool.nextRenewalDate && (
          <div className="flex items-center gap-2 mb-4 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 rounded-md">
            <Calendar className="h-3.5 w-3.5" />
            <span>Renews {new Date(tool.nextRenewalDate).toLocaleDateString()}</span>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.open(tool.websiteUrl, "_blank")}
          data-testid={`button-go-${tool.id}`}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Visit Website
        </Button>
      </CardContent>
    </Card>
  );
}
