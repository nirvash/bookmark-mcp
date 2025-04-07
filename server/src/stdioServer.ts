import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "bookmark-stdio-server", // 新しいサーバー名
  version: "0.1.0", // バージョン指定
});

// サンプルの double_number ツール
server.tool(
  "double_number",
  "与えられた数値を2倍にする",
  {num: z.number().describe("数値")},
  async ({num}) => { // ハンドラを async にする (SDKの作法に合わせる)
    console.error(`Tool 'double_number' called with num: ${num}`); // サーバー側のログ
    return {content: [{type: "text", text: (num * 2).toString()}]};
  }
);

// --- ダミーブックマークデータ ---
const dummyBookmarkTree = [
  {
    id: '1',
    title: 'ブックマークバー',
    children: [
      { id: '2', parentId: '1', title: 'よく使うサイト', url: 'https://example.com/frequent' },
      { id: '3', parentId: '1', title: 'ニュース', children: [
        { id: '4', parentId: '3', title: 'Techニュース', url: 'https://example.com/tech-news' },
      ]},
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
server.tool(
  "mcp.bookmarks.getTree",
  "Get the entire bookmark tree structure.",
  {}, // No input parameters
  async () => {
    console.error("Tool 'mcp.bookmarks.getTree' called");
    // In the future, this would communicate with the Chrome extension
    // For now, return dummy data
    // Return stringified JSON data in the 'content' field with type 'text'
    return { content: [{ type: "text", text: JSON.stringify(dummyBookmarkTree, null, 2) }] }; // Pretty print for readability
  }
);

// TODO: Add other bookmark tools (getChildren, get, create, update, move, remove, removeTree)


async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Bookmark Stdio MCP Server running on stdio"); // ログを修正
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});