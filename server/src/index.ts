import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "bookmark-mcp",
  version: "1.0.0",
});

// --- Define Tools ---
// よりシンプルな形に戻して、位置引数で呼び出す
server.tool(
    "bookmark_get_tree",
    "ブックマークツリー全体を取得します",
    {},
    async () => {
        console.error(`Received bookmark_get_tree request`);
        return { content: [{ type: "text", text: JSON.stringify({ message: "bookmark_get_tree called" }) }] };
    }
);

server.tool(
    "bookmark_search",
    "タイトルやURLで検索します",
    {
        query: z.string().describe("検索キーワード")
    },
    async ({ query }) => {
        console.error(`Received bookmark_search request with query:`, query);
        return { content: [{ type: "text", text: JSON.stringify({ message: "bookmark_search called", query }) }] };
    }
);

async function main() {
    console.error("--- main() started (Stdio Mode) ---");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("--- Bookmark MCP Server running on Stdio ---");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});