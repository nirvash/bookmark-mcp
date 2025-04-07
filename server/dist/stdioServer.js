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
const zod_1 = require("zod");
const server = new mcp_js_1.McpServer({
    name: "bookmark-stdio-server", // 新しいサーバー名
    version: "0.1.0", // バージョン指定
});
// サンプルの double_number ツール
server.tool("double_number", "与えられた数値を2倍にする", { num: zod_1.z.number().describe("数値") }, (_a) => __awaiter(void 0, [_a], void 0, function* ({ num }) {
    console.error(`Tool 'double_number' called with num: ${num}`); // サーバー側のログ
    return { content: [{ type: "text", text: (num * 2).toString() }] };
}));
// --- ダミーブックマークデータ ---
const dummyBookmarkTree = [
    {
        id: '1',
        title: 'ブックマークバー',
        children: [
            { id: '2', parentId: '1', title: 'よく使うサイト', url: 'https://example.com/frequent' },
            { id: '3', parentId: '1', title: 'ニュース', children: [
                    { id: '4', parentId: '3', title: 'Techニュース', url: 'https://example.com/tech-news' },
                ] },
        ],
    },
    {
        id: '5',
        title: 'その他のブックマーク',
        children: [],
    },
];
// ---------------------------
// --- ブックマーク操作ツール ---
// mcp.bookmarks.getTree ツール
server.tool("mcp.bookmarks.getTree", "Get the entire bookmark tree structure.", {}, // No input parameters
() => __awaiter(void 0, void 0, void 0, function* () {
    console.error("Tool 'mcp.bookmarks.getTree' called");
    // In the future, this would communicate with the Chrome extension
    // For now, return dummy data
    // Return stringified JSON data in the 'content' field with type 'text'
    return { content: [{ type: "text", text: JSON.stringify(dummyBookmarkTree, null, 2) }] }; // Pretty print for readability
}));
// TODO: Add other bookmark tools (getChildren, get, create, update, move, remove, removeTree)
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const transport = new stdio_js_1.StdioServerTransport();
        yield server.connect(transport);
        console.error("Bookmark Stdio MCP Server running on stdio"); // ログを修正
    });
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
