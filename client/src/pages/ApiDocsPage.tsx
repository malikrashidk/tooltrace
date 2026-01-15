import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, ArrowLeft, BookOpen, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export function ApiDocsPage() {
    const [, setLocation] = useLocation();

    const { data: docs, isLoading, error } = useQuery<string>({
        queryKey: ["/api/v1/docs"],
        queryFn: async () => {
            const response = await fetch("/api/v1/docs");
            if (!response.ok) throw new Error("Failed to load documentation");
            return response.text();
        }
    });

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Navigation */}
                <div className="mb-6 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => setLocation("/integrations")}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Integrations
                    </Button>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span className="text-sm font-medium">API Documentation</span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground animate-pulse">Loading documentation...</p>
                    </div>
                ) : error ? (
                    <Card className="border-destructive/50 bg-destructive/5">
                        <CardContent className="py-10 text-center">
                            <p className="text-destructive font-medium">Failed to load documentation. Please try again later.</p>
                            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <article className="prose prose-slate dark:prose-invert max-w-none">
                        <div className="bg-card border rounded-xl p-6 sm:p-10 shadow-sm">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-6 pb-2 border-b" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-10 mb-4 flex items-center gap-2" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-xl font-medium mt-8 mb-3" {...props} />,
                                    code: ({ node, inline, ...props }: any) =>
                                        inline ? (
                                            <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-sm" {...props} />
                                        ) : (
                                            <div className="relative group">
                                                <code className="block bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto border my-4" {...props} />
                                            </div>
                                        ),
                                    pre: ({ node, ...props }) => <pre className="bg-transparent p-0 m-0" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="space-y-2 list-disc pl-6 my-4" {...props} />,
                                    li: ({ node, ...props }) => <li className="text-muted-foreground" {...props} />,
                                    p: ({ node, ...props }) => <p className="leading-relaxed text-muted-foreground my-4" {...props} />,
                                }}
                            >
                                {docs || ""}
                            </ReactMarkdown>
                        </div>
                    </article>
                )}

                <footer className="mt-12 py-8 border-t text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Need more help? Contact our support team or visit our developer forum.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" size="sm" className="gap-2">
                            <Mail className="h-4 w-4" />
                            Contact Support
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Developer Forum
                        </Button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
