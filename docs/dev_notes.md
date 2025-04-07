# Development Notes

## Initial Setup (Stdio MCP Server)

This document records the steps taken to set up the initial stdio-based MCP server for bookmark management.

### 1. Project Initialization

*   Initialized Git repository: `git init`
*   Created directories: `mkdir docs`, `mkdir server`, `mkdir examples`
*   Initialized Node.js project in `server/`: `cd server && npm init -y`

### 2. Dependencies Installation

Installed necessary packages for TypeScript, Node.js server, MCP SDK, and development utilities:
```bash
# In server/ directory
npm install typescript @types/node @types/express @types/cors --save-dev
npm install ts-node nodemon --save-dev
npm install @modelcontextprotocol/sdk zod
# Note: express, cors were installed during HTTP server attempts, but might not be strictly needed for stdio server now.
```

### 3. TypeScript Configuration

Created `server/tsconfig.json` to configure the TypeScript compiler. Key settings:
*   `module`: "CommonJS"
*   `outDir`: "./dist"
*   `rootDir`: "./src"
*   `include`: Initially `["src/**/*"]`, later changed to `["src/stdioServer.ts"]` to avoid compilation errors from the unused `mockServer.ts`.
*   `strict`: Initially `true`, temporarily set to `false` during debugging, but should ideally be re-enabled later.

### 4. Server Implementation (`stdioServer.ts`)

*   Created `server/src/stdioServer.ts` based on the `@modelcontextprotocol/sdk` example.
*   Uses `StdioServerTransport` for communication.
*   Implemented a sample tool `double_number`.
*   Placeholder for future bookmark tools (`mcp.bookmarks.getTree`, etc.).

### 5. Build Process

*   Added a `build` script to `server/package.json`: `"build": "tsc"`
*   Added a `start:stdio` script: `"start:stdio": "ts-node src/stdioServer.ts"` (Initially used for local testing, now used by Roo Cline config).
*   Compiled the TypeScript code: `npm run build --prefix server` (Generates `server/dist/stdioServer.js`).

### 6. Roo Cline MCP Configuration (`mcp_settings.json`)

After several attempts with remote WebSocket/HTTP servers failed due to connection issues ("unknown scheme", "Not connected"), switched to a `type: "local"` configuration using stdio.

The final working configuration in `mcp_settings.json` is:
```json
{
  "mcpServers": {
    "bookmark-stdio-server": {
      "command": "node",
      "args": ["C:\\Work\\bookmark-mcp\\server\\dist\\stdioServer.js"], // Absolute path to compiled JS
      "env": {},
      "disabled": false, // Use 'disabled' instead of 'enabled'
      "alwaysAllow": ["double_number"]
    }
  }
}
```
*Key learnings during configuration:*
*   `type: "local"` requires `command` and `args`.
*   Using the compiled JS file (`node dist/stdioServer.js`) with an absolute path proved more reliable than using `npm run ...` or `ts-node` directly in the config.
*   The `disabled` field (set to `false`) seems to be required instead of `enabled`.

### 7. Running and Testing

*   **Prerequisites:** Ensure the server is built (`npm run build --prefix server`).
*   **Execution:** Roo Cline automatically starts the server process defined in `mcp_settings.json` when needed. No manual server start is required.
*   **Testing:** Use the `use_mcp_tool` command within Roo Cline to interact with the server.
    *   Example: Test the `double_number` tool.
      ```xml
      <use_mcp_tool>
      <server_name>bookmark-stdio-server</server_name>
      <tool_name>double_number</tool_name>
      <arguments>
      {
        "num": 10
      }
      </arguments>
      </use_mcp_tool>
      ```

### 8. Troubleshooting Notes

*   **EADDRINUSE:** Encountered port conflict errors when trying to run the HTTP/WebSocket server manually. Resolved by ensuring previous processes were fully terminated or by using the stdio approach which doesn't bind to a port in the same way.
*   **MCP Connection Errors:** Faced "No connection found", "unknown scheme", and "Not connected" errors with `type: "remote"` configurations. Switching to `type: "local"` and using the compiled JS with an absolute path resolved these.
*   **TypeScript Compilation Errors:** Addressed various TS errors in `mockServer.ts` (which is now excluded from the build) and `stdioServer.ts`. Debugging involved checking types, ensuring correct imports, and verifying syntax (especially closing braces). Temporarily disabling `strict` mode or using `any` type helped isolate issues but should be revisited.