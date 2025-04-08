"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServerTransport = void 0;
const ws_1 = require("ws");
class WebSocketServerTransport {
    constructor(port = 8765) {
        this.clients = new Set();
        this.wss = new ws_1.WebSocketServer({ port });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                this.setupWebSocketServer();
                this.wss.once('listening', () => {
                    console.error(`WebSocket Server listening on port ${this.wss.address().port}`);
                    resolve();
                });
            });
        });
    }
    onMessage(handler) {
        this.messageHandler = handler;
    }
    send(message, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const messageStr = JSON.stringify(message);
            const sendPromises = Array.from(this.clients).map(client => {
                if (client.readyState === ws_1.WebSocket.OPEN) {
                    return new Promise((resolve, reject) => {
                        client.send(messageStr, (error) => {
                            if (error) {
                                reject(error);
                            }
                            else {
                                resolve();
                            }
                        });
                    });
                }
                return Promise.resolve();
            });
            yield Promise.all(sendPromises);
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            const closePromises = Array.from(this.clients).map(client => {
                return new Promise((resolve) => {
                    client.once('close', () => resolve());
                    client.close();
                });
            });
            yield Promise.all(closePromises);
            return new Promise((resolve) => {
                this.wss.close(() => resolve());
            });
        });
    }
    setupWebSocketServer() {
        this.wss.on('connection', (ws) => {
            console.error('New WebSocket client connected');
            this.clients.add(ws);
            ws.on('message', (data) => {
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
exports.WebSocketServerTransport = WebSocketServerTransport;
