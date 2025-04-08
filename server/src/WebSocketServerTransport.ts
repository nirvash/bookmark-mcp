import { WebSocketServer, WebSocket } from 'ws';
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage, RequestId } from "@modelcontextprotocol/sdk/types.js";

export class WebSocketServerTransport implements Transport {
    private wss: WebSocketServer;
    private messageHandler?: (message: string) => void;
    private clients: Set<WebSocket> = new Set();

    constructor(port: number = 8765) {
        this.wss = new WebSocketServer({ port });
    }

    async start(): Promise<void> {
        return new Promise((resolve) => {
            this.setupWebSocketServer();
            this.wss.once('listening', () => {
                console.error(`WebSocket Server listening on port ${(this.wss.address() as any).port}`);
                resolve();
            });
        });
    }

    onMessage(handler: (message: string) => void): void {
        this.messageHandler = handler;
    }

    async send(message: JSONRPCMessage, options?: { relatedRequestId?: RequestId }): Promise<void> {
        const messageStr = JSON.stringify(message);
        const sendPromises = Array.from(this.clients).map(client => {
            if (client.readyState === WebSocket.OPEN) {
                return new Promise<void>((resolve, reject) => {
                    client.send(messageStr, (error) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });
            }
            return Promise.resolve();
        });
        await Promise.all(sendPromises);
    }

    async close(): Promise<void> {
        const closePromises = Array.from(this.clients).map(client => {
            return new Promise<void>((resolve) => {
                client.once('close', () => resolve());
                client.close();
            });
        });
        await Promise.all(closePromises);

        return new Promise((resolve) => {
            this.wss.close(() => resolve());
        });
    }

    private setupWebSocketServer() {
        this.wss.on('connection', (ws: WebSocket) => {
            console.error('New WebSocket client connected');
            this.clients.add(ws);

            ws.on('message', (data: Buffer) => {
                if (this.messageHandler) {
                    this.messageHandler(data.toString());
                }
            });

            ws.on('close', () => {
                console.error('WebSocket client disconnected');
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket client error:', error);
            });
        });

        this.wss.on('error', (error) => {
            console.error('WebSocket Server error:', error);
        });
    }
}