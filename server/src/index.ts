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
    "ブックマークツリーを取得します。folderId や depth を指定して取得範囲を限定できます。各ノードには id, parentId, index, title, url (フォルダ以外), dateAdded, dateGroupModified (フォルダのみ), syncing, folderType (特定フォルダのみ) などの情報が含まれ、フォルダの場合は children プロパティに子アイテムの配列が含まれます",
    {
        folderId: z.string().optional().describe("取得するサブツリーの親フォルダID（未指定の場合はルート）"),
        depth: z.number().int().min(0).optional().describe("取得する階層数。0を指定するとフォルダ情報のみ（子を含まない）、1を指定すると直下の子アイテムのみ取得（未指定の場合は制限なし）")
    },
    async ({ folderId, depth }, extra) => {
        console.debug(`Received bookmark_get_tree request from roo`,
            folderId ? `for folderId: ${folderId}` : '',
            depth ? `with depth: ${depth}` : ''
        );

        const params: Record<string, unknown> = {};
        if (folderId) {
            params.id = folderId;
        }
        if (depth !== undefined) {
            params.depth = depth;
        }

        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_get_tree",
            id: Date.now().toString(),
            params: Object.keys(params).length > 0 ? params : undefined
        };

        // リクエストを Chrome 拡張に転送し、レスポンスを待つ
        try {
            const response = await sendRequestAndWaitResponse(request);
            // 拡張機能は常に配列を返す想定だが、サブツリー取得時は単一オブジェクトの場合もあるため調整
            const result = Array.isArray(response) ? response : [response];
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
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
        console.debug(`Received bookmark_search request from roo with query:`, query);
        
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
        console.debug(`Received bookmark_add request`);
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
    "指定したIDのブックマークを取得します。ノードには id, parentId, index, title, url (フォルダ以外), dateAdded, dateGroupModified (フォルダのみ), syncing, folderType (特定フォルダのみ) などの情報が含まれます",
    {
        id: z.string().describe("ブックマークのID")
    },
    async ({ id }, extra) => {
        console.debug(`Received bookmark_get request`);
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
    "複数のブックマークを一括で更新します。各ブックマークに対して title や url を個別に指定でき、どちらか片方の更新も可能です",
    {
        items: z.array(z.object({
            id: z.string().describe("更新するブックマークのID"),
            title: z.string().optional().describe("新しいタイトル"),
            url: z.string().optional().describe("新しいURL")
        })).describe("更新するブックマークのリスト")
    },
    async ({ items }, extra) => {
        console.debug(`Received bookmark_update request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_update",
            id: Date.now().toString(),
            params: { items }
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
    "ブックマークを削除します。id を文字列または配列で指定可能です",
    {
        id: z.union([
            z.string().describe("削除するブックマークのID"),
            z.array(z.string()).describe("削除するブックマークIDの配列")
        ])
    },
    async ({ id }, extra) => {
        console.debug(`Received bookmark_remove request`);
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
        console.debug(`Received bookmark_remove_tree request`);
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
        console.debug(`Received bookmark_create_folder request`);
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
    "指定されたブックマークを新しい場所に移動します。各ブックマークに対して移動先のフォルダを個別に指定できます。index は0から始まる位置を示し、その位置に挿入されます（例：index:0は先頭、index:5は6番目の位置）。index を省略すると末尾に追加されます。複数のブックマークを同じフォルダに移動する場合、前の操作による位置の変更が後続の index に影響することに注意してください",
    {
        items: z.array(z.object({
            id: z.string().describe("移動するブックマークのID"),
            parentId: z.string().describe("移動先の親フォルダID"),
            index: z.number().optional().describe("移動先のインデックス")
        })).describe("移動するブックマークのリスト")
    },
    async ({ items }, extra) => {
        console.debug(`Received bookmark_move request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_move",
            id: Date.now().toString(),
            params: { items }
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
    "指定したIDの直下の子アイテムを取得します。各ノードには id, parentId, index, title, url (フォルダ以外), dateAdded, dateGroupModified (フォルダのみ), syncing, folderType (特定フォルダのみ) などの情報が含まれます。返却値は配列です",
    {
        id: z.string().describe("親フォルダのID")
    },
    async ({ id }, extra) => {
        console.debug(`Received bookmark_get_children request`);
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
    "bookmark_copy",
    "指定されたブックマークを新しい場所にコピーします。各ブックマークに対してコピー先のフォルダを個別に指定できます。index は0から始まる位置を示し、その位置にコピーされます（例：index:0は先頭、index:5は6番目の位置）。index を省略すると末尾に追加されます。複数のブックマークを同じフォルダにコピーする場合、前の操作による位置の変更が後続の index に影響することに注意してください。元のブックマークはそのまま残ります",
    {
        items: z.array(z.object({
            sourceId: z.string().describe("コピー元のブックマークID"),
            parentId: z.string().describe("コピー先の親フォルダID"),
            index: z.number().optional().describe("コピー先のインデックス")
        })).describe("コピーするブックマークのリスト")
    },
    async ({ items }, extra) => {
        console.debug(`Received bookmark_copy request`);
        const request: JSONRPCRequestMessage = {
            jsonrpc: "2.0",
            method: "bookmark_copy",
            id: Date.now().toString(),
            params: { items }
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
    console.log("--- main() started ---");

    // WebSocketトランスポートの設定と接続
    console.log("Setting up WebSocket transport...");
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
    console.log("Setting up Stdio transport...");
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
    
    console.log("--- Bookmark MCP Server running (Stdio + WebSocket) ---");

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