import { useState } from "react";
import { ExternalLink, MoreVertical, Pencil, Trash2, Clock, Calendar, Key, Pin, Lock } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import type { Tool } from "@/lib/analytics";
import { CredentialsDialog } from "./CredentialsDialog";

interface ToolCardProps {
  tool: Tool;
  onEdit?: (tool: Tool) => void;
  onDelete?: (tool: Tool) => void;
  onCredentialsUpdate?: (tool: Tool) => void;
}

export function ToolCard({ tool, onEdit, onDelete, onCredentialsUpdate }: ToolCardProps) {
  const [showCredentials, setShowCredentials] = useState(false);
  const { toast } = useToast();
  const { formatAmount } = useCurrency();
  const credentials = tool.credentials as { username?: string; email?: string; password?: string; notes?: string; lastUpdated?: string | Date } | undefined;
  const hasSecureData = (tool as any).hasCredentials || (tool as any).secureNote;
  const totalUsageMinutes = (tool as any).totalUsageTime ? parseInt((tool as any).totalUsageTime) : 0;

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
    const formatted = formatAmount(amount);
    const cycleLabel = cycle === "monthly" ? "/mo" : cycle === "yearly" ? "/yr" : "";
    return `${formatted}${cycleLabel}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper to generate favicon URL if logoUrl is missing
  const getLogoUrl = (tool: Tool) => {
    if (tool.logoUrl) return tool.logoUrl;
    if (tool.websiteUrl) {
      try {
        // Extract domain
        const url = new URL(tool.websiteUrl.startsWith('http') ? tool.websiteUrl : `https://${tool.websiteUrl}`);
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  };

  return (
    <Card className={`group hover-elevate transition-all duration-200 relative ${tool.isLocked ? 'overflow-hidden' : ''}`} data-testid={`card-tool-${tool.id}`}>
      {(tool as any).isPinned && (
        <div className="absolute top-2 right-2 text-primary opacity-80 rotate-45">
          <Pin className="h-4 w-4" fill="currentColor" />
        </div>
      )}

      {tool.isLocked && (
        <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
          <Lock className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="font-semibold text-sm">Subscription Locked</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[150px]">Upgrade your plan to unlock and manage this tool.</p>
          <Button variant="link" size="sm" className="mt-2 h-auto p-0" onClick={() => window.location.href = '/pricing'}>
            View Plans
          </Button>
        </div>
      )}

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Avatar className="h-14 w-14 rounded-lg border-2 border-border/50 bg-white dark:bg-zinc-900">
              <AvatarImage src={getLogoUrl(tool)} alt={tool.name} className="object-contain p-2" />
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
                    {formatCost(Number(tool.billingAmount) as number, tool.billingCycle || "")}
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
            <DropdownMenuTrigger asChild disabled={tool.isLocked}>
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
              <DropdownMenuItem onClick={() => setShowCredentials(true)} data-testid={`button-credentials-${tool.id}`}>
                <Key className="h-4 w-4 mr-2" />
                Manage Login Info
              </DropdownMenuItem>
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
          {tool.categories?.map((category) => (
            <Badge key={category} variant="outline" className="text-xs font-medium">
              {category}
            </Badge>
          ))}
          <Badge className={`text-xs font-medium ${getUsageColor(tool.usageFrequency)}`}>
            <Clock className="h-3 w-3 mr-1" />
            {tool.usageFrequency}
          </Badge>
          {hasSecureData && (
            <Badge variant="outline" className="text-xs font-medium border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">
              <Lock className="h-3 w-3 mr-1" />
              Secured
            </Badge>
          )}
          {totalUsageMinutes > 0 && (
            <Badge variant="outline" className="text-xs font-medium border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400">
              <Clock className="h-3 w-3 mr-1" />
              {Math.round(totalUsageMinutes / 60)}h used
            </Badge>
          )}
        </div>

        {tool.isPaid && tool.nextRenewalDate && (
          <div className="flex items-center gap-2 mb-4 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 rounded-md">
            <Calendar className="h-3.5 w-3.5" />
            <span>Renews {new Date(tool.nextRenewalDate).toLocaleDateString()}</span>
          </div>
        )}

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(tool.websiteUrl, "_blank")}
            disabled={tool.isLocked}
            data-testid={`button-go-${tool.id}`}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Visit Website
          </Button>
          {credentials?.username && (
            <Button
              variant="secondary"
              className="w-full"
              disabled={tool.isLocked}
              onClick={() => setShowCredentials(true)}
              data-testid={`button-autofill-${tool.id}`}
            >
              <Key className="h-4 w-4 mr-2" />
              View Login Info
            </Button>
          )}
        </div>

        <CredentialsDialog
          tool={tool}
          open={showCredentials}
          onOpenChange={setShowCredentials}
          onSave={(updatedTool: Tool) => {
            onCredentialsUpdate?.(updatedTool);
            setShowCredentials(false);
            toast({ description: "Login info saved securely" });
          }}
        />
      </CardContent>
    </Card>
  );
}
