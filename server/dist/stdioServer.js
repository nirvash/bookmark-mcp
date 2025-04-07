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
// TODO: ここにブックマーク操作用のツール (getTreeなど) を追加していく
// server.tool(
//   "mcp.bookmarks.getTree",
//   "Get the entire bookmark tree",
//   {}, // No input schema needed for getTree
//   async () => {
//     console.error("Tool 'mcp.bookmarks.getTree' called");
//     // ここで実際のブックマーク取得ロジックを呼び出す (将来的には拡張機能と連携)
//     // 今はダミーデータを返す
//     const dummyBookmarkTree = [ /* ... ダミーデータ ... */ ];
//     return { result: dummyBookmarkTree }; // MCPの応答形式に合わせる (resultフィールド)
//   }
// );
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
