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


async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Bookmark Stdio MCP Server running on stdio"); // ログを修正
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});