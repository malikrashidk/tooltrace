import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Upload, X, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import type { Tool } from "@/lib/analytics";

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
});

type ToolFormData = z.infer<typeof toolSchema>;

interface AddToolDialogProps {
  categories: string[];
  onSave: (tool: Partial<Tool>) => void;
  editTool?: Tool | null;
  trigger?: React.ReactNode;
}

export function AddToolDialog({ categories, onSave, editTool, trigger }: AddToolDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(editTool?.categories || []);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(editTool?.tags || []);
  const [logoPreview, setLogoPreview] = useState<string | null>(editTool?.logoUrl || null);

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
    },
  });

  const isPaid = form.watch("isPaid");

  const onSubmit = (data: ToolFormData) => {
    onSave({
      ...data,
      billingAmount: data.billingAmount?.toString(),
      nextRenewalDate: data.nextRenewalDate ? new Date(data.nextRenewalDate) : undefined,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTool ? "Edit Tool" : "Add New Tool"}</DialogTitle>
          <DialogDescription>
            {editTool
              ? "Update the details of your SaaS tool."
              : "Add a new SaaS tool to your collection."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <label className="cursor-pointer" data-testid="input-logo-upload">
                    <div className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-contain rounded-lg p-1"
                        />
                      ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 text-center">Logo</p>
                </div>

                <div className="flex-1 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tool Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Figma" data-testid="input-tool-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="https://example.com"
                              className="pl-9"
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
                <div className="flex flex-wrap gap-2">
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

              <FormField
                control={form.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
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

              {isPaid && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium">Billing Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billingAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                $
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                className="pl-7"
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
                          <FormLabel>Billing Cycle</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-billing-cycle">
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

                  <div className="grid grid-cols-2 gap-4">
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
