# Bookmark Organizer (MCP) - Design Plan

## 1. Goal

Develop a Chrome extension and a local MCP server to allow an LLM to manage Chrome bookmarks via MCP. The LLM will utilize external APIs (like OpenAI/Gemini) and assumes web access capabilities are provided by other MCP servers.

## 2. Project Structure

```
c:\Work\bookmark-mcp/
├── docs/
│   └── design_plan.md
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.js
│   ├── options.html
│   └── options.js
└── server/
    └── (Server implementation files - TBD)
```

## 3. Architecture Overview & Key Decisions

*   **Challenge:** Chrome Extensions (specifically Manifest V3 Service Workers) cannot act as servers listening for incoming network connections due to security restrictions.
*   **Solution:** A two-component architecture is adopted:
    1.  **Local MCP Server:** Runs as a separate process on the user's machine. It listens for incoming MCP connections (from LLM clients) and also communicates with the Chrome Extension.
    2.  **Chrome Extension:** Acts as a *client* connecting to the local MCP server. Its primary roles are:
        *   Accessing the Chrome Bookmarks API based on instructions received from the server.
        *   Sending bookmark data or status updates back to the server.
*   **Communication Flow:** LLM Client -> MCP Server -> Chrome Extension -> Chrome Bookmarks API (and back). This allows indirect control of bookmarks via MCP while respecting Chrome's security model.
*   **Technology Choice:** The MCP server will be built with Node.js (TypeScript) using the official `typescript-sdk` for MCP compliance and ease of development for the user. Communication between all components will primarily use WebSocket, initially aiming for standard MCP format even between the server and extension.


## 4. Chrome Extension (`extension/`)

*   **Manifest:** Version 3
*   **Permissions:** `bookmarks`, `storage`, `alarms`
*   **Components:**
    *   Background Script (Service Worker): Communicates with the MCP server and manipulates Chrome Bookmarks API.
    *   Popup UI: Basic controls and status display.
    *   Options UI: Configuration for the MCP server address.
*   **Functionality:** Acts as a client to the local MCP server, relaying commands and receiving results to interact with the Chrome Bookmarks API.

## 5. MCP Server (`server/`)

*   **Environment:** Runs as a separate process on the local PC.
*   **Technology Stack:** Node.js (TypeScript), using the official `modelcontextprotocol/typescript-sdk`. Frameworks like Express might be used alongside the SDK if needed for specific routing or middleware, but the core MCP logic will leverage the SDK.
*   **Communication:** Primarily WebSocket.
    *   **External (LLM Client <-> Server):** Standard MCP over WebSocket, intended to be handled by the `typescript-sdk`.
    *   **Internal (Server <-> Chrome Extension):** Also WebSocket. The initial approach will be to use the standard MCP format over this connection as well, leveraging the SDK. If this proves overly complex for the extension-side implementation, a simpler custom JSON format over WebSocket might be considered as a fallback.
*   **Data Store:** Optional, for caching bookmark data (e.g., SQLite, JSON).
*   **Core Functionality:** Acts as a proxy to the Chrome Bookmarks API via the extension. Does **not** handle web access or direct LLM interaction.
*   **Minimal MCP Command Set:**
    *   `mcp.bookmarks.getTree()`: Get the entire bookmark tree.
    *   `mcp.bookmarks.getChildren(id)`: Get children of a specific folder.
    *   `mcp.bookmarks.get(ids)`: Get specific bookmark(s)/folder(s) by ID.
    *   `mcp.bookmarks.create(bookmarkInfo)`: Create a new bookmark or folder.
    *   `mcp.bookmarks.update(id, changes)`: Update a bookmark or folder.
    *   `mcp.bookmarks.move(id, destination)`: Move a bookmark or folder.
    *   `mcp.bookmarks.remove(id)`: Remove a bookmark.
    *   `mcp.bookmarks.removeTree(id)`: Remove a folder and its contents.

## 6. LLM Role (Client-Side)

*   Acts as the primary "brain" for bookmark organization.
*   Uses the MCP commands provided by this server in combination with commands from other MCP servers (e.g., for web access) to perform tasks like classification, search, title generation, and identifying dead links.