import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Upload, X, Link2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Tool } from "@/lib/analytics";
import { knownTools, type KnownTool } from "../../../shared/known-tools";

const toolSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
  websiteUrl: z.string().url("Please enter a valid URL"),
  notes: z.string().optional(),
  isPaid: z.boolean(),
  usageFrequency: z.enum(["daily", "weekly", "rarely"]),
  billingAmount: z.number().optional(),
  billingCycle: z.enum(["monthly", "yearly", "one-time"]).optional(),
  nextRenewalDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  secureNote: z.string().optional(),
  isPinned: z.boolean().optional(),
});

type ToolFormData = z.infer<typeof toolSchema>;

interface AddToolDialogProps {
  categories: string[];
  onSave: (tool: Partial<Tool>) => void;
  editTool?: Tool | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddToolDialog({ categories, onSave, editTool, trigger, open: openProp, onOpenChange }: AddToolDialogProps) {
  // Support controlled open state when `open` and `onOpenChange` are provided
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof openProp === "boolean" && typeof onOpenChange === "function";
  const open = isControlled ? openProp : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;
  const [selectedCategories, setSelectedCategories] = useState<string[]>(editTool?.categories || []);
  const [categoryInput, setCategoryInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(editTool?.tags || []);
  const [logoPreview, setLogoPreview] = useState<string | null>(editTool?.logoUrl || null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const form = useForm<ToolFormData>({
    resolver: zodResolver(toolSchema),
    defaultValues: {
      name: editTool?.name || "",
      websiteUrl: editTool?.websiteUrl || "",
      notes: editTool?.notes || "",
      isPaid: editTool?.isPaid || false,
      usageFrequency: (editTool?.usageFrequency as "daily" | "weekly" | "rarely") || "weekly",
      billingAmount: editTool?.billingAmount ? parseFloat(editTool.billingAmount) : undefined,
      billingCycle: (editTool?.billingCycle as "monthly" | "yearly" | "one-time") || "monthly",
      nextRenewalDate: editTool?.nextRenewalDate
        ? (editTool.nextRenewalDate instanceof Date
          ? editTool.nextRenewalDate.toISOString().split('T')[0]
          : new Date(editTool.nextRenewalDate).toISOString().split('T')[0])
        : "",
      paymentMethod: editTool?.paymentMethod || "",
      username: "",
      password: "",
      secureNote: "",
      isPinned: editTool?.isPinned || false,
    },
  });

  // Reset form when editTool or open changes (so edit fields populate)
  useEffect(() => {
    form.reset({
      name: editTool?.name || "",
      websiteUrl: editTool?.websiteUrl || "",
      notes: editTool?.notes || "",
      isPaid: editTool?.isPaid || false,
      usageFrequency: (editTool?.usageFrequency as "daily" | "weekly" | "rarely") || "weekly",
      billingAmount: editTool?.billingAmount ? parseFloat(String(editTool.billingAmount)) : undefined,
      billingCycle: (editTool?.billingCycle as "monthly" | "yearly" | "one-time") || "monthly",
      nextRenewalDate: editTool?.nextRenewalDate
        ? (editTool.nextRenewalDate instanceof Date
          ? editTool.nextRenewalDate.toISOString().split("T")[0]
          : new Date(editTool.nextRenewalDate).toISOString().split("T")[0])
        : "",
      paymentMethod: editTool?.paymentMethod || "",
      username: "",
      password: "",
      secureNote: "",
      isPinned: editTool?.isPinned || false,
    });
    setSelectedCategories(editTool?.categories || []);
    setTags(editTool?.tags || []);
    setLogoPreview(editTool?.logoUrl || null);
  }, [editTool, open]);

  const isPaid = form.watch("isPaid");

  const onSubmit = (data: ToolFormData) => {
    // Ensure numeric fields are converted to string or null (never empty string)
    const billingAmount = data.billingAmount && data.billingAmount > 0 ? String(data.billingAmount) : null;
    const nextRenewalDate = data.nextRenewalDate && data.nextRenewalDate.trim() ? data.nextRenewalDate : undefined;
    const billingCycle = data.billingCycle && data.billingCycle.trim() ? data.billingCycle : null;
    const paymentMethod = data.paymentMethod && data.paymentMethod.trim() ? data.paymentMethod : null;
    const notes = data.notes && data.notes.trim() ? data.notes : null;

    // Clean up secure fields if they are empty
    const secureData: any = {};
    if (data.username && data.password) {
      secureData.username = data.username;
      secureData.password = data.password;
    }
    if (data.secureNote) {
      secureData.secureNote = data.secureNote;
    }

    onSave({
      ...data,
      ...secureData,
      billingAmount,
      billingCycle,
      paymentMethod,
      notes,
      nextRenewalDate: nextRenewalDate ? new Date(nextRenewalDate) : null,
      categories: selectedCategories,
      tags,
      logoUrl: logoPreview || undefined,
    });
    setOpen(false);
    form.reset();
    setSelectedCategories([]);
    setTags([]);
    setLogoPreview(null);
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-fetch favicon when website URL changes if no custom logo is set
  const websiteUrl = form.watch("websiteUrl");
  useEffect(() => {
    if (!logoPreview && websiteUrl && !editTool?.logoUrl) {
      try {
        // Basic validation to ensure it looks like a domain before requesting
        if (websiteUrl.includes(".")) {
          const domain = websiteUrl.replace(/^https?:\/\//, "").split("/")[0];
          // Use Google's favicon service as a fallback
          // We don't set it as "logoPreview" (which implies a custom upload)
          // but we can render it in the UI if logoPreview is null.
          // However, to persist it, we might want to let the user see it.
          // For now, the ToolCard handles the display fallback.
          // But the user requested "logos for tools I add".
          // If we want to save it, we can set it here.
        }
      } catch (e) {
        // ignore
      }
    }
  }, [websiteUrl, logoPreview, editTool]);

  const handleToolSelect = (tool: KnownTool) => {
    form.setValue("name", tool.name);
    form.setValue("websiteUrl", `https://${tool.website}`);

    if (tool.category && !selectedCategories.includes(tool.category)) {
      setSelectedCategories(prev => [...prev, tool.category]);
    }

    // Automatically set logo preview from external favicon service (not stored on server)
    setLogoPreview(`https://www.google.com/s2/favicons?domain=${tool.website}&sz=128`);

    setComboboxOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button data-testid="button-add-tool">
            <Plus className="h-4 w-4 mr-2" />
            Add Tool
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-4 sm:mb-6">
          <DialogTitle className="text-xl sm:text-2xl">{editTool ? "Edit Tool" : "Add New Tool"}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {editTool
              ? "Update the details of your SaaS tool."
              : "Add a new SaaS tool to your collection."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="flex flex-col items-center sm:items-start flex-shrink-0">
                  <label className="cursor-pointer" data-testid="input-logo-upload">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed border-border rounded-xl flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-contain rounded-lg p-2"
                        />
                      ) : (
                        <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-2 text-center sm:text-left">Brand Logo</p>
                </div>

                <div className="flex-1 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="font-semibold">Tool Name</FormLabel>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={comboboxOpen}
                                className={cn(
                                  "w-full justify-between h-11 text-base sm:text-sm",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="input-tool-name"
                              >
                                {field.value || "Select or type tool name..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[calc(100vw-2.5rem)] sm:w-[400px] p-0"
                            align="start"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                          >
                            <Command filter={(value, search) => {
                              const item = knownTools.find(t => t.name.toLowerCase() === value.toLowerCase());
                              if (!item) return 0;

                              const searchLower = search.toLowerCase();
                              if (item.name.toLowerCase().includes(searchLower)) return 1;
                              if (item.website.toLowerCase().includes(searchLower)) return 1;
                              if (item.aliases.some(alias => alias.toLowerCase().includes(searchLower))) return 1;

                              return 0;
                            }}>
                              <CommandInput
                                placeholder="Search common tools..."
                                onValueChange={(search) => {
                                  setSearchValue(search);
                                }}
                              />
                              <CommandEmpty className="py-2 px-4 text-sm">
                                <p className="text-muted-foreground mb-2">No known tool found.</p>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => {
                                    // Use the custom search value
                                    field.onChange(searchValue);
                                    setComboboxOpen(false);
                                  }}
                                >
                                  Use "{searchValue}"
                                </Button>
                              </CommandEmpty>
                              <CommandGroup heading="Suggestions">
                                <ScrollArea className="h-[300px]">
                                  <CommandList className="pb-10 md:pb-0">
                                    {knownTools.map((tool) => (
                                      <CommandItem
                                        key={tool.name}
                                        value={tool.name}
                                        onSelect={() => handleToolSelect(tool)}
                                        className="cursor-pointer py-3 md:py-2"
                                      >
                                        <div className="flex items-center w-full">
                                          <Avatar className="h-8 w-8 mr-3 rounded-md border bg-white flex-shrink-0">
                                            <AvatarImage src={`https://www.google.com/s2/favicons?domain=${tool.website}&sz=64`} alt={tool.name} />
                                            <AvatarFallback className="text-[10px]">{tool.name.slice(0, 2)}</AvatarFallback>
                                          </Avatar>
                                          <div className="flex flex-col min-w-0 flex-1">
                                            <span className="font-medium truncate">{tool.name}</span>
                                            <span className="text-xs text-muted-foreground truncate">{tool.website}</span>
                                          </div>
                                          <Check
                                            className={cn(
                                              "ml-auto h-4 w-4",
                                              field.value === tool.name ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandList>
                                </ScrollArea>
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Website URL</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="https://example.com"
                              className="pl-9 h-11 text-base sm:text-sm"
                              data-testid="input-website-url"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What do you use this tool for?"
                        className="resize-none"
                        rows={2}
                        data-testid="input-notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Categories</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleCategory(category)}
                      data-testid={`select-category-${category.toLowerCase()}`}
                    >
                      {category}
                    </Badge>
                  ))}
                  {/* Show selected custom categories as well */}
                  {selectedCategories
                    .filter(c => !categories.includes(c))
                    .map(category => (
                      <Badge
                        key={category}
                        variant="default"
                        className="cursor-pointer bg-primary/80"
                        onClick={() => toggleCategory(category)}
                      >
                        {category} <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))
                  }
                </div>
                <div className="flex gap-2">
                  <Input
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    placeholder="Add custom category..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (categoryInput.trim() && !selectedCategories.includes(categoryInput.trim())) {
                          setSelectedCategories([...selectedCategories, categoryInput.trim()]);
                          setCategoryInput("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (categoryInput.trim() && !selectedCategories.includes(categoryInput.trim())) {
                        setSelectedCategories([...selectedCategories, categoryInput.trim()]);
                        setCategoryInput("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel>Tags</FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    data-testid="input-tag"
                  />
                  <Button type="button" variant="secondary" onClick={addTag} data-testid="button-add-tag">
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeTag(tag)}
                          data-testid={`remove-tag-${tag}`}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="usageFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usage Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-usage">
                          <SelectValue placeholder="How often do you use this?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="rarely">Rarely</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="isPaid"
                  render={({ field }) => (
                    <FormItem className="flex-1 flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Paid Subscription</FormLabel>
                        <FormDescription>Is this a paid tool?</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-paid"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPinned"
                  render={({ field }) => (
                    <FormItem className="flex-1 flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Pin Tool</FormLabel>
                        <FormDescription>Show in quick access?</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-pinned"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 p-4 sm:p-5 bg-muted/20 rounded-xl border border-border/50">
                <h4 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                  Secure Credentials
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tight py-0">Optional</Badge>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Username / Email</FormLabel>
                        <FormControl>
                          <Input placeholder="user@example.com" {...field} autoComplete="off" className="h-10 sm:h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} autoComplete="new-password" className="h-10 sm:h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="secureNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secure Note</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Store recovery codes, API keys, or other secrets here..."
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isPaid && (
                <div className="space-y-4 p-4 sm:p-5 bg-primary/5 rounded-xl border border-primary/10">
                  <h4 className="font-bold text-sm sm:text-base text-primary">Billing Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billingAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Amount</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                                $
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                className="pl-7 h-10 sm:h-9"
                                placeholder="0.00"
                                data-testid="input-billing-amount"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billingCycle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Billing Cycle</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-billing-cycle" className="h-10 sm:h-9">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                              <SelectItem value="one-time">One-time</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nextRenewalDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Next Renewal Date</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-renewal-date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-method">
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Credit Card">Credit Card</SelectItem>
                              <SelectItem value="PayPal">PayPal</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-tool">
                {editTool ? "Save Changes" : "Add Tool"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
