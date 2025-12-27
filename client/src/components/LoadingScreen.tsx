import { motion } from "framer-motion";

export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-6">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.8, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="relative w-24 h-24 flex items-center justify-center bg-white rounded-2xl shadow-xl p-4"
                >
                    <img
                        src="/tooltrace-logo.png"
                        alt="ToolTrace"
                        className="w-full h-full object-contain"
                    />
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center gap-2"
                >
                    <h3 className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        ToolTrace
                    </h3>
                    <p className="text-sm text-muted-foreground animate-pulse">
                        {message}
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
