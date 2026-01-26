import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "../auth";
import { log } from "../app";
import { parse } from "url";

// Message types for communication
export type WsMessageType =
    | "AUTH_SUCCESS"
    | "AUTH_ERROR"
    | "DETECTION_UPDATE"
    | "NOTIFICATION";

export interface WsMessage {
    type: WsMessageType;
    payload: any;
}

// Store for active connections: userId -> Set of WebSockets
const connections = new Map<string, Set<WebSocket>>();

export function setupWebSocket(server: Server) {
    const wss = new WebSocketServer({ noServer: true });

    // Handle the HTTP upgrade to WebSocket
    server.on("upgrade", (request, socket, head) => {
        const { pathname, query } = parse(request.url || "", true);

        if (pathname === "/ws") {
            const token = query.token as string;
            const user = token ? verifyToken(token) : null;

            if (!user) {
                log(`WS Authentication failed for connection attempt`, "websocket");
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit("connection", ws, user.userId);
            });
        } else {
            socket.destroy();
        }
    });

    wss.on("connection", (ws: WebSocket, userId: string) => {
        log(`Client connected: ${userId}`, "websocket");

        // Add connection to store
        if (!connections.has(userId)) {
            connections.set(userId, new Set());
        }
        connections.get(userId)?.add(ws);

        // Send connection success message
        sendToUser(userId, {
            type: "AUTH_SUCCESS",
            payload: { userId }
        });

        ws.on("close", () => {
            log(`Client disconnected: ${userId}`, "websocket");
            const userConnections = connections.get(userId);
            if (userConnections) {
                userConnections.delete(ws);
                if (userConnections.size === 0) {
                    connections.delete(userId);
                }
            }
        });

        ws.on("error", (error) => {
            log(`WS Error for user ${userId}: ${error.message}`, "error");
        });
    });

    return wss;
}

/**
 * Send a message to all active WebSocket connections for a specific user
 */
export function sendToUser(userId: string, message: WsMessage) {
    const userConnections = connections.get(userId);
    if (userConnections && userConnections.size > 0) {
        const data = JSON.stringify(message);
        userConnections.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });
        return true;
    }
    return false;
}

/**
 * Broadcast a message to ALL connected users (useful for admin or global alerts)
 */
export function broadcast(message: WsMessage) {
    const data = JSON.stringify(message);
    connections.forEach((userConnections) => {
        userConnections.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });
    });
}
