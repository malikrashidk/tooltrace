import React, { createContext, useContext, useState } from "react";
import { VerificationModal } from "@/components/VerificationModal";

interface VerificationContextType {
    openVerificationModal: () => void;
}

const VerificationContext = createContext<VerificationContextType | undefined>(undefined);

export function VerificationProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const openVerificationModal = () => setIsOpen(true);
    const closeVerificationModal = () => setIsOpen(false);

    // Listen for global verification triggers
    React.useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener("open-verification-modal", handleOpen);
        return () => window.removeEventListener("open-verification-modal", handleOpen);
    }, []);

    return (
        <VerificationContext.Provider value={{ openVerificationModal }}>
            {children}
            <VerificationModal isOpen={isOpen} onClose={closeVerificationModal} />
        </VerificationContext.Provider>
    );
}

export function useVerification() {
    const context = useContext(VerificationContext);
    if (context === undefined) {
        throw new Error("useVerification must be used within a VerificationProvider");
    }
    return context;
}
