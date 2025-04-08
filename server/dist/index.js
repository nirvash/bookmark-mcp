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
    name: "bookmark-mcp",
    version: "1.0.0",
});
// --- Define Tools ---
// よりシンプルな形に戻して、位置引数で呼び出す
server.tool("bookmark_get_tree", "ブックマークツリー全体を取得します", {}, () => __awaiter(void 0, void 0, void 0, function* () {
    console.error(`Received bookmark_get_tree request`);
    return { content: [{ type: "text", text: JSON.stringify({ message: "bookmark_get_tree called" }) }] };
}));
server.tool("bookmark_search", "タイトルやURLで検索します", {
    query: zod_1.z.string().describe("検索キーワード")
}, (_a) => __awaiter(void 0, [_a], void 0, function* ({ query }) {
    console.error(`Received bookmark_search request with query:`, query);
    return { content: [{ type: "text", text: JSON.stringify({ message: "bookmark_search called", query }) }] };
}));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.error("--- main() started (Stdio Mode) ---");
        const transport = new stdio_js_1.StdioServerTransport();
        yield server.connect(transport);
        console.error("--- Bookmark MCP Server running on Stdio ---");
    });
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
