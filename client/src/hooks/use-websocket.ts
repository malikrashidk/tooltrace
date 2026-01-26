import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./use-toast";
import { useQueryClient } from "@tanstack/react-query";

type WsMessageType =
    | "AUTH_SUCCESS"
    | "AUTH_ERROR"
    | "DETECTION_UPDATE"
    | "NOTIFICATION";

interface WsMessage {
    type: WsMessageType;
    payload: any;
}

export function useWebSocket() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

    const connect = useCallback(() => {
        if (!user || socketRef.current?.readyState === WebSocket.OPEN) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws?token=${token}`;

        console.log("[WebSocket] Connecting to", wsUrl);
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("[WebSocket] Connected");
            setIsConnected(true);
        };

        socket.onmessage = (event) => {
            try {
                const message: WsMessage = JSON.parse(event.data);
                console.log("[WebSocket] Received message:", message);

                switch (message.type) {
                    case "DETECTION_UPDATE":
                        // Invalidate Smart Scan queries to refresh UI
                        queryClient.invalidateQueries({ queryKey: ["/api/activity/smart-scan"] });
                        break;

                    case "NOTIFICATION":
                        toast({
                            title: message.payload.title,
                            description: message.payload.message,
                        });
                        break;

                    case "AUTH_ERROR":
                        console.error("[WebSocket] Auth error:", message.payload);
                        socket.close();
                        break;
                }
            } catch (error) {
                console.error("[WebSocket] Failed to parse message:", error);
            }
        };

        socket.onclose = () => {
            console.log("[WebSocket] Disconnected");
            setIsConnected(false);

            // Attempt reconnection after 5 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, 5000);
        };

        socket.onerror = (error) => {
            console.error("[WebSocket] Error:", error);
        };

        socketRef.current = socket;
    }, [user, queryClient, toast]);

    useEffect(() => {
        connect();

        return () => {
            if (socketRef.current) {
                // Clear timeout and close socket on unmount
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                socketRef.current.close();
            }
        };
    }, [connect]);

    return { isConnected };
}
