import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Mail, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function VerificationModal({ isOpen, onClose }: VerificationModalProps) {
    const [isResending, setIsResending] = useState(false);
    const { toast } = useToast();

    const handleResend = async () => {
        setIsResending(true);
        try {
            await apiRequest("POST", "/api/auth/resend-verification");
            toast({
                title: "Verification Email Sent",
                description: "Please check your inbox (and spam folder) for the verification link.",
            });
        } catch (error: any) {
            toast({
                title: "Failed to send email",
                description: error.message || "Something went wrong. Please try again later.",
                variant: "destructive",
            });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-primary/20 bg-background/95 backdrop-blur-sm">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl font-bold">Verify Your Email</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        To keep your account secure, some actions require a verified email address.
                        This only takes a moment!
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-muted/50 rounded-lg p-4 flex gap-4 items-start">
                        <div className="p-2 rounded-md bg-background border shadow-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Check your inbox</p>
                            <p className="text-xs text-muted-foreground">
                                We sent a verification link to your registered email address.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full sm:w-auto"
                    >
                        Maybe Later
                    </Button>
                    <Button
                        onClick={handleResend}
                        disabled={isResending}
                        className="w-full sm:w-auto gap-2"
                    >
                        {isResending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Mail className="h-4 w-4" />
                        )}
                        Resend Verification Link
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
