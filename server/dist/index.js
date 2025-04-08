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
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const WebSocketServerTransport_js_1 = require("./WebSocketServerTransport.js");
const zod_1 = require("zod");
// MCPサーバーの設定
const server = new mcp_js_1.McpServer({
    name: "bookmark-mcp",
    version: "1.0.0",
});
let wsTransport;
// Chrome拡張からのレスポンスを待つためのPromiseを管理
const pendingRequests = new Map();
// --- Define Tools ---
server.tool("bookmark_get_tree", "ブックマークツリー全体を取得します", {}, (_, extra) => __awaiter(void 0, void 0, void 0, function* () {
    console.error(`Received bookmark_get_tree request from roo`);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_get_tree",
        id: Date.now().toString()
    };
    // リクエストを Chrome 拡張に転送し、レスポンスを待つ
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
server.tool("bookmark_search", "タイトルやURLで検索します", {
    query: zod_1.z.string().describe("検索キーワード")
}, (_a, extra_1) => __awaiter(void 0, [_a, extra_1], void 0, function* ({ query }, extra) {
    console.error(`Received bookmark_search request from roo with query:`, query);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_search",
        id: Date.now().toString(),
        params: { query }
    };
    // リクエストを Chrome 拡張に転送し、レスポンスを待つ
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
// Chrome拡張にリクエストを送信し、レスポンスを待つヘルパー関数
function sendRequestAndWaitResponse(request) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            // リクエストIDに対応するハンドラを保存
            pendingRequests.set(request.id, { resolve, reject });
            // リクエストを Chrome 拡張に送信
            wsTransport.send(request).catch(error => {
                pendingRequests.delete(request.id);
                reject(error);
            });
            // タイムアウト設定（10秒）
            setTimeout(() => {
                if (pendingRequests.has(request.id)) {
                    pendingRequests.delete(request.id);
                    reject(new Error("Request timeout"));
                }
            }, 10000);
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.error("--- main() started ---");
        // WebSocketトランスポートの設定と接続
        console.error("Setting up WebSocket transport...");
        wsTransport = new WebSocketServerTransport_js_1.WebSocketServerTransport(8765);
        // Chrome拡張からのレスポンスを処理
        wsTransport.onMessage((messageStr) => {
            try {
                const message = JSON.parse(messageStr);
                // レスポンスの場合（idがあり、methodがない）
                const pending = pendingRequests.get(message.id);
                if (pending) {
                    pendingRequests.delete(message.id);
                    if ('error' in message) {
                        pending.reject(new Error(message.error.message));
                    }
                    else {
                        pending.resolve(message.result);
                    }
                }
            }
            catch (error) {
                console.error('Failed to process message from extension:', error);
            }
        });
        yield wsTransport.start();
        // Stdioトランスポートの設定と接続
        console.error("Setting up Stdio transport...");
        const stdioTransport = new stdio_js_1.StdioServerTransport();
        yield server.connect(stdioTransport);
        console.error("--- Bookmark MCP Server running (Stdio + WebSocket) ---");
        // プロセス終了時のクリーンアップ
        process.on('SIGINT', () => __awaiter(this, void 0, void 0, function* () {
            console.error('Shutting down...');
            yield wsTransport.close();
            process.exit(0);
        }));
    });
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
