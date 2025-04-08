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
    "bookmark_add",
    "新しいブックマークを追加します",
    {
        parentId: z.string().describe("親フォルダのID"),
        title: z.string().describe("ブックマークのタイトル"),
        url: z.string().describe("ブックマークのURL"),
        index: z.number().optional().describe("追加位置のインデックス")
    },
    async ({ parentId, title, url, index }, extra) => {
        console.error(`Received bookmark_add request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_add",
            id: Date.now().toString(),
            params: { parentId, title, url, index }
        };
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
    "bookmark_get",
    "指定したIDのブックマークを取得します",
    {
        id: z.string().describe("ブックマークのID")
    },
    async ({ id }, extra) => {
        console.error(`Received bookmark_get request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_get",
            id: Date.now().toString(),
            params: { id }
        };
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
    "bookmark_update",
    "ブックマークを更新します",
    {
        id: z.string().describe("ブックマークのID"),
        changes: z.object({
            title: z.string().optional().describe("新しいタイトル"),
            url: z.string().optional().describe("新しいURL")
        }).describe("更新する内容")
    },
    async ({ id, changes }, extra) => {
        console.error(`Received bookmark_update request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_update",
            id: Date.now().toString(),
            params: { id, changes }
        };
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
    "bookmark_remove",
    "ブックマークを削除します",
    {
        id: z.string().describe("削除するブックマークのID")
    },
    async ({ id }, extra) => {
        console.error(`Received bookmark_remove request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_remove",
            id: Date.now().toString(),
            params: { id }
        };
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
    "bookmark_remove_tree",
    "ブックマークツリーを削除します",
    {
        id: z.string().describe("削除するブックマークツリーのID")
    },
    async ({ id }, extra) => {
        console.error(`Received bookmark_remove_tree request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_remove_tree",
            id: Date.now().toString(),
            params: { id }
        };
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
    "bookmark_create_folder",
    "新しいフォルダを作成します",
    {
        parentId: z.string().describe("親フォルダのID"),
        title: z.string().describe("フォルダのタイトル"),
        index: z.number().optional().describe("追加位置のインデックス")
    },
    async ({ parentId, title, index }, extra) => {
        console.error(`Received bookmark_create_folder request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_create_folder",
            id: Date.now().toString(),
            params: { parentId, title, index }
        };
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
    "bookmark_move",
    "ブックマークを移動します",
    {
        id: z.string().describe("移動するブックマークのID"),
        parentId: z.string().describe("移動先の親フォルダのID"),
        index: z.number().optional().describe("移動先のインデックス")
    },
    async ({ id, parentId, index }, extra) => {
        console.error(`Received bookmark_move request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_move",
            id: Date.now().toString(),
            params: { id, parentId, index }
        };
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
    "bookmark_get_root_folders",
    "トップ階層のフォルダ一覧を取得します",
    {},
    async (_, extra) => {
        console.error(`Received bookmark_get_root_folders request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_get_root_folders",
            id: Date.now().toString()
        };
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
    "bookmark_get_children",
    "指定したIDの直下の子アイテムを取得します",
    {
        id: z.string().describe("親フォルダのID")
    },
    async ({ id }, extra) => {
        console.error(`Received bookmark_get_children request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_get_children",
            id: Date.now().toString(),
            params: { id }
        };
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
    "bookmark_move_multiple",
    "複数のブックマークをまとめて移動します",
    {
        items: z.array(z.object({
            id: z.string().describe("移動するブックマークのID"),
            index: z.number().optional().describe("移動先のインデックス")
        })).describe("移動するブックマークのリスト"),
        parentId: z.string().describe("移動先の親フォルダのID")
    },
    async ({ items, parentId }, extra) => {
        console.error(`Received bookmark_move_multiple request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_move_multiple",
            id: Date.now().toString(),
            params: { items, parentId }
        };
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