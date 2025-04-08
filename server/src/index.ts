import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebSocketServerTransport } from "./WebSocketServerTransport.js";
import { z } from "zod";

type JSONRPCRequestMessage = {
    jsonrpc: "2.0";
    method: string;
    id: string | number;
    params?: Record<string, unknown>;
};

type JSONRPCResponseMessage = {
    jsonrpc: "2.0";
    id: string | number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
};

// MCPサーバーの設定
const server = new McpServer({
    name: "bookmark-mcp",
    version: "1.0.0",
});

let wsTransport: WebSocketServerTransport;

// Chrome拡張からのレスポンスを待つためのPromiseを管理
const pendingRequests = new Map<string | number, {
    resolve: (response: any) => void;
    reject: (error: Error) => void;
}>();

// --- Define Tools ---
server.tool(
    "bookmark_get_tree",
    "ブックマークツリー全体を取得します",
    {},
    async (_, extra) => {
        console.error(`Received bookmark_get_tree request from roo`);
        
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_get_tree",
            id: Date.now().toString()
        };

        // リクエストを Chrome 拡張に転送し、レスポンスを待つ
        try {
            const response = await sendRequestAndWaitResponse(request);
            return { content: [{ type: "text", text: JSON.stringify(response) }] };
        } catch (error) {
            console.error('Failed to get response from extension:', error);
            throw error;
        }
    }
);

server.tool(
    "bookmark_search",
    "タイトルやURLで検索します",
    {
        query: z.string().describe("検索キーワード")
    },
    async ({ query }, extra) => {
        console.error(`Received bookmark_search request from roo with query:`, query);
        
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_search",
            id: Date.now().toString(),
            params: { query }
        };

        // リクエストを Chrome 拡張に転送し、レスポンスを待つ
        try {
            const response = await sendRequestAndWaitResponse(request);
            return { content: [{ type: "text", text: JSON.stringify(response) }] };
        } catch (error) {
            console.error('Failed to get response from extension:', error);
            throw error;
        }
    }
);

// Chrome拡張にリクエストを送信し、レスポンスを待つヘルパー関数
async function sendRequestAndWaitResponse(request: JSONRPCRequestMessage): Promise<any> {
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
}

async function main() {
    console.error("--- main() started ---");

    // WebSocketトランスポートの設定と接続
    console.error("Setting up WebSocket transport...");
    wsTransport = new WebSocketServerTransport(8765);

    // Chrome拡張からのレスポンスを処理
    wsTransport.onMessage((messageStr) => {
        try {
            const message = JSON.parse(messageStr) as JSONRPCResponseMessage;
            
            // レスポンスの場合（idがあり、methodがない）
            const pending = pendingRequests.get(message.id);
            if (pending) {
                pendingRequests.delete(message.id);
                if ('error' in message) {
                    pending.reject(new Error(message.error.message));
                } else {
                    pending.resolve(message.result);
                }
            }
        } catch (error) {
            console.error('Failed to process message from extension:', error);
        }
    });

    await wsTransport.start();

    // Stdioトランスポートの設定と接続
    console.error("Setting up Stdio transport...");
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
    
    console.error("--- Bookmark MCP Server running (Stdio + WebSocket) ---");

    // プロセス終了時のクリーンアップ
    process.on('SIGINT', async () => {
        console.error('Shutting down...');
        await wsTransport.close();
        process.exit(0);
    });
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});