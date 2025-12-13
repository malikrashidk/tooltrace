import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Pin, PinOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import type { Note } from "@shared/schema";

export function NotesPage() {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const { data: notesData, isLoading } = useQuery<{ notes: Note[] }>({
    queryKey: ["/api/notes"],
  });

  const notes = notesData?.notes || [];

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; isPinned?: boolean }) => {
      const res = await apiRequest("POST", "/api/notes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setNewTitle("");
      setNewContent("");
      toast({ description: "Note created successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        description: error.message || "Failed to create note",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; content?: string; isPinned?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/notes/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setEditingId(null);
      setEditTitle("");
      setEditContent("");
      toast({ description: "Note updated successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        description: error.message || "Failed to update note",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/notes/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ description: "Note deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        description: error.message || "Failed to delete note",
      });
    },
  });

  const wordCount = (text: string) => {
    return text.split(/\s+/).filter(Boolean).length;
  };

  const charCount = (text: string) => text.length;
  const contentWords = wordCount(newContent);
  const contentChars = charCount(newContent);
  const isOverLimit = contentWords > 1200 || contentChars > 12000;

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Notes</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Create and organize your personal notes (1200 word limit)</p>
      </div>

      {/* New Note Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Note title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            data-testid="input-note-title"
          />
          <div className="space-y-2">
            <Textarea
              placeholder="Write your note here... (max 1200 words)"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-32"
              data-testid="textarea-note-content"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {contentWords} words ·· {contentChars} characters
              </span>
              {isOverLimit && <span className="text-destructive">Limit exceeded</span>}
            </div>
          </div>
          <Button
            onClick={() => {
              if (!newTitle.trim()) {
                toast({ variant: "destructive", description: "Title is required" });
                return;
              }
              if (!newContent.trim()) {
                toast({ variant: "destructive", description: "Content is required" });
                return;
              }
              if (contentWords > 1200) {
                toast({ variant: "destructive", description: "Note exceeds 1200 word limit" });
                return;
              }
              createMutation.mutate({ title: newTitle, content: newContent });
            }}
            disabled={createMutation.isPending || isOverLimit}
            data-testid="button-create-note"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
              No notes yet. Create your first note above!
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className={note.isPinned ? "border-yellow-500 dark:border-yellow-600" : ""}>
              <CardContent className="pt-6">
                {editingId === note.id ? (
                  <div className="space-y-4">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Note title"
                      data-testid={`input-edit-note-title-${note.id}`}
                    />
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Note content"
                      className="min-h-32"
                      data-testid={`textarea-edit-note-content-${note.id}`}
                    />
                    <div className="flex flex-col sm:flex-row gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateMutation.mutate({
                            id: note.id,
                            title: editTitle,
                            content: editContent,
                          });
                        }}
                        disabled={updateMutation.isPending}
                        data-testid="button-save-note"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-col sm:flex-row">
                      <h3 className="text-lg font-semibold break-words" data-testid={`text-note-title-${note.id}`}>{note.title}</h3>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            updateMutation.mutate({
                              id: note.id,
                              isPinned: !note.isPinned,
                            });
                          }}
                          data-testid={`button-pin-note-${note.id}`}
                        >
                          {note.isPinned ? (
                            <PinOff className="h-4 w-4" />
                          ) : (
                            <Pin className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(note.id);
                            setEditTitle(note.title);
                            setEditContent(note.content);
                          }}
                          data-testid={`button-edit-note-${note.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(note.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-note-${note.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words" data-testid={`text-note-content-${note.id}`}>
                      {note.content}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {wordCount(note.content)} words ·· Updated {new Date(note.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}




