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
server.tool("bookmark_get_tree", "ブックマークツリーを取得します。folderId や depth を指定して取得範囲を限定できます", {
    folderId: zod_1.z.string().optional().describe("取得するサブツリーの親フォルダID（未指定の場合はルート）"),
    depth: zod_1.z.number().int().min(0).optional().describe("取得する階層数。0を指定するとフォルダ情報のみ（子を含まない）、1を指定すると直下の子アイテムのみ取得（未指定の場合は制限なし）")
}, (_a, extra_1) => __awaiter(void 0, [_a, extra_1], void 0, function* ({ folderId, depth }, extra) {
    console.error(`Received bookmark_get_tree request from roo`, folderId ? `for folderId: ${folderId}` : '', depth ? `with depth: ${depth}` : '');
    const params = {};
    if (folderId) {
        params.id = folderId;
    }
    if (depth !== undefined) {
        params.depth = depth;
    }
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_get_tree",
        id: Date.now().toString(),
        params: Object.keys(params).length > 0 ? params : undefined
    };
    // リクエストを Chrome 拡張に転送し、レスポンスを待つ
    try {
        const response = yield sendRequestAndWaitResponse(request);
        // 拡張機能は常に配列を返す想定だが、サブツリー取得時は単一オブジェクトの場合もあるため調整
        const result = Array.isArray(response) ? response : [response];
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
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
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
server.tool("bookmark_add", "新しいブックマークを追加します", {
    parentId: zod_1.z.string().describe("親フォルダのID"),
    title: zod_1.z.string().describe("ブックマークのタイトル"),
    url: zod_1.z.string().describe("ブックマークのURL"),
    index: zod_1.z.number().optional().describe("追加位置のインデックス")
}, (_a, extra_1) => __awaiter(void 0, [_a, extra_1], void 0, function* ({ parentId, title, url, index }, extra) {
    console.error(`Received bookmark_add request`);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_add",
        id: Date.now().toString(),
        params: { parentId, title, url, index }
    };
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
server.tool("bookmark_get", "指定したIDのブックマークを取得します", {
    id: zod_1.z.string().describe("ブックマークのID")
}, (_a, extra_1) => __awaiter(void 0, [_a, extra_1], void 0, function* ({ id }, extra) {
    console.error(`Received bookmark_get request`);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_get",
        id: Date.now().toString(),
        params: { id }
    };
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
server.tool("bookmark_update", "複数のブックマークを一括で更新します。各ブックマークに対して title や url を個別に指定でき、どちらか片方の更新も可能です", {
    items: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().describe("更新するブックマークのID"),
        title: zod_1.z.string().optional().describe("新しいタイトル"),
        url: zod_1.z.string().optional().describe("新しいURL")
    })).describe("更新するブックマークのリスト")
}, (_a, extra_1) => __awaiter(void 0, [_a, extra_1], void 0, function* ({ items }, extra) {
    console.error(`Received bookmark_update request`);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_update",
        id: Date.now().toString(),
        params: { items }
    };
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
server.tool("bookmark_remove", "ブックマークを削除します。id を文字列または配列で指定可能です", {
    id: zod_1.z.union([
        zod_1.z.string().describe("削除するブックマークのID"),
        zod_1.z.array(zod_1.z.string()).describe("削除するブックマークIDの配列")
    ])
}, (_a, extra_1) => __awaiter(void 0, [_a, extra_1], void 0, function* ({ id }, extra) {
    console.error(`Received bookmark_remove request`);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_remove",
        id: Date.now().toString(),
        params: { id }
    };
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
server.tool("bookmark_remove_tree", "ブックマークツリーを削除します", {
    id: zod_1.z.string().describe("削除するブックマークツリーのID")
}, (_a, extra_1) => __awaiter(void 0, [_a, extra_1], void 0, function* ({ id }, extra) {
    console.error(`Received bookmark_remove_tree request`);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_remove_tree",
        id: Date.now().toString(),
        params: { id }
    };
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
server.tool("bookmark_create_folder", "新しいフォルダを作成します", {
    parentId: zod_1.z.string().describe("親フォルダのID"),
    title: zod_1.z.string().describe("フォルダのタイトル"),
    index: zod_1.z.number().optional().describe("追加位置のインデックス")
}, (_a, extra_1) => __awaiter(void 0, [_a, extra_1], void 0, function* ({ parentId, title, index }, extra) {
    console.error(`Received bookmark_create_folder request`);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_create_folder",
        id: Date.now().toString(),
        params: { parentId, title, index }
    };
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
server.tool("bookmark_move", "指定されたブックマークを新しい場所に移動します。各ブックマークに対して移動先のフォルダを個別に指定できます。index は0から始まる位置を示し、その位置に挿入されます（例：index:0は先頭、index:5は6番目の位置）。index を省略すると末尾に追加されます。複数のブックマークを同じフォルダに移動する場合、前の操作による位置の変更が後続の index に影響することに注意してください", {
    items: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().describe("移動するブックマークのID"),
        parentId: zod_1.z.string().describe("移動先の親フォルダID"),
        index: zod_1.z.number().optional().describe("移動先のインデックス")
    })).describe("移動するブックマークのリスト")
}, (_a, extra_1) => __awaiter(void 0, [_a, extra_1], void 0, function* ({ items }, extra) {
    console.error(`Received bookmark_move request`);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_move",
        id: Date.now().toString(),
        params: { items }
    };
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
server.tool("bookmark_get_root_folders", "トップ階層のフォルダ一覧を取得します", {}, (_, extra) => __awaiter(void 0, void 0, void 0, function* () {
    console.error(`Received bookmark_get_root_folders request`);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_get_root_folders",
        id: Date.now().toString()
    };
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
server.tool("bookmark_get_children", "指定したIDの直下の子アイテムを取得します", {
    id: zod_1.z.string().describe("親フォルダのID")
}, (_a, extra_1) => __awaiter(void 0, [_a, extra_1], void 0, function* ({ id }, extra) {
    console.error(`Received bookmark_get_children request`);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_get_children",
        id: Date.now().toString(),
        params: { id }
    };
    try {
        const response = yield sendRequestAndWaitResponse(request);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
    }
    catch (error) {
        console.error('Failed to get response from extension:', error);
        throw error;
    }
}));
server.tool("bookmark_copy", "指定されたブックマークを新しい場所にコピーします。各ブックマークに対してコピー先のフォルダを個別に指定できます。index は0から始まる位置を示し、その位置にコピーされます（例：index:0は先頭、index:5は6番目の位置）。index を省略すると末尾に追加されます。複数のブックマークを同じフォルダにコピーする場合、前の操作による位置の変更が後続の index に影響することに注意してください。元のブックマークはそのまま残ります", {
    items: zod_1.z.array(zod_1.z.object({
        sourceId: zod_1.z.string().describe("コピー元のブックマークID"),
        parentId: zod_1.z.string().describe("コピー先の親フォルダID"),
        index: zod_1.z.number().optional().describe("コピー先のインデックス")
    })).describe("コピーするブックマークのリスト")
}, (_a, extra_1) => __awaiter(void 0, [_a, extra_1], void 0, function* ({ items }, extra) {
    console.error(`Received bookmark_copy request`);
    const request = {
        jsonrpc: "2.0",
        method: "bookmark_copy",
        id: Date.now().toString(),
        params: { items }
    };
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
