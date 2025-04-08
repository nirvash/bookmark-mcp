# Bookmark MCP

Chrome ブックマークを管理するための MCP (Machine Control Protocol) 拡張機能です。  
Chrome bookmark management extension using MCP (Machine Control Protocol).

## 概要 / Overview

このプロジェクトは、LLMからChrome ブックマークを操作するためのMCPツールです。  
This project is an MCP tool for manipulating Chrome bookmarks from LLM.

コンポーネント構成：  
Components:

1. Chrome拡張機能 / Chrome Extension
   - Chromeのブックマークを操作するための拡張機能
   - Extension to manipulate Chrome bookmarks
   - `extension/` ディレクトリに配置
   - Located in the `extension/` directory

2. MCPサーバー / MCP Server
   - LLMからの標準入出力でブックマーク操作のコマンドを処理
   - Processes bookmark operation commands via stdin/stdout from LLM
   - `server/` ディレクトリに配置
   - Located in the `server/` directory

## インストール / Installation

### 拡張機能のインストール / Extension Installation

1. Chrome で `chrome://extensions` を開く  
   Open `chrome://extensions` in Chrome

2. デベロッパーモードを有効にする  
   Enable Developer Mode

3. `extension` フォルダを「パッケージ化されていない拡張機能を読み込む」で読み込む  
   Load the `extension` folder using "Load unpacked"

### MCPツールの登録 / MCP Tool Registration

1. Cursorの設定を開く  
   Open Cursor settings

2. MCPツールの設定セクションに移動  
   Navigate to MCP tools section

3. 以下の設定をMCP設定ファイル（`~/.cursor/mcp.json`）に追加：  
   Add the following settings to the MCP configuration file (`~/.cursor/mcp.json`):

   ```json
   {
     "mcpServers": {
       "bookmark-mcp": {
         "protocol": "stdio",
         "command": "node",
         "args": [
           "<プロジェクトパス>/server/dist/index.js"
         ],
         "cwd": "<プロジェクトパス>",
         "description": "Bookmark MCP Server (Stdio)"
       }
     }
   }
   ```

   > 注: `<プロジェクトパス>` は実際のプロジェクトのパスに置き換えてください。  
   > Note: Replace `<プロジェクトパス>` with the actual project path.

## 利用可能なコマンド / Available Commands

LLMから以下のコマンドを使用してブックマークを操作できます：  
The following commands are available for bookmark manipulation from LLM:

#### ブックマークツリー全体を取得 / Get Entire Bookmark Tree
```typescript
mcp_bookmark_get_tree()
```

#### ブックマークの検索 / Search Bookmarks
```typescript
mcp_bookmark_search({
    query: "<検索キーワード>"  // タイトルやURLで検索 / Search by title or URL
})
```

#### 新しいブックマークを追加 / Add New Bookmark
```typescript
mcp_bookmark_add({
    parentId: "<フォルダID>",  // 追加位置の親フォルダID / Parent folder ID
    title: "<タイトル>",      // ブックマークのタイトル / Bookmark title
    url: "<URL>",            // ブックマークのURL / Bookmark URL
    index: 0                 // [オプション] 追加位置のインデックス / [Optional] Index position
})
```

#### 指定したIDのブックマークを取得 / Get Bookmark by ID
```typescript
mcp_bookmark_get({
    id: "<ブックマークID>"  // 取得するブックマークのID / ID of the bookmark to get
})
```

#### ブックマークの更新 / Update Bookmark
```typescript
mcp_bookmark_update({
    id: "<ブックマークID>",  // 更新するブックマークのID / ID of the bookmark to update
    changes: {
        title: "<新しいタイトル>",  // [オプション] 新しいタイトル / [Optional] New title
        url: "<新しいURL>"        // [オプション] 新しいURL / [Optional] New URL
    }
})
```

#### ブックマークの削除 / Remove Bookmark
```typescript
mcp_bookmark_remove({
    id: "<ブックマークID>"  // 削除するブックマークのID / ID of the bookmark to remove
})
```

#### ブックマークツリーの削除 / Remove Bookmark Tree
```typescript
mcp_bookmark_remove_tree({
    id: "<ブックマークID>"  // 削除するブックマークツリーのID / ID of the bookmark tree to remove
})
```

#### 新しいフォルダを作成 / Create New Folder
```typescript
mcp_bookmark_create_folder({
    parentId: "<親フォルダID>",  // 作成位置の親フォルダID / Parent folder ID
    title: "<フォルダ名>",      // フォルダ名 / Folder name
    index: 0                   // [オプション] 作成位置のインデックス / [Optional] Index position
})
```

#### ブックマークの移動 / Move Bookmark
```typescript
mcp_bookmark_move({
    id: "<ブックマークID>",      // 移動するブックマークのID / ID of the bookmark to move
    parentId: "<移動先フォルダID>", // 移動先の親フォルダID / Destination parent folder ID
    index: 0                    // [オプション] 移動先のインデックス / [Optional] Destination index
})
```

#### 複数ブックマークの移動 / Move Multiple Bookmarks
```typescript
mcp_bookmark_move_multiple({
    items: [
        { 
            id: "<ブックマークID1>",  // 移動するブックマークのID / ID of the bookmark to move
            index: 0                 // [オプション] 移動先のインデックス / [Optional] Destination index
        },
        { id: "<ブックマークID2>" }
    ],
    parentId: "<移動先フォルダID>"    // 移動先の親フォルダID / Destination parent folder ID
})
```

#### トップ階層のフォルダ一覧を取得 / Get Root Folders
```typescript
mcp_bookmark_get_root_folders()
```

#### フォルダ内の子アイテムを取得 / Get Children Items
```typescript
mcp_bookmark_get_children({
    id: "<フォルダID>"  // 親フォルダのID / Parent folder ID
})
```

## 注意事項 / Notes

- Chrome拡張機能のインストールが必要です。  
  Chrome extension installation is required.

- ブックマークの変更は即座にChromeに反映されます。  
  Bookmark changes are immediately reflected in Chrome.

- 大量のブックマークを一度に操作する場合は、`move_multiple`コマンドの使用を推奨します。  
  When manipulating multiple bookmarks at once, it is recommended to use the `move_multiple` command.

## トラブルシューティング / Troubleshooting

### MCPツールが応答しない場合 / If MCP Tool is Not Responding
- Chrome拡張機能が有効になっていることを確認  
  Verify that the Chrome extension is enabled
- MCPツールの登録パスが正しいことを確認  
  Verify that the MCP tool registration path is correct

### 拡張機能が動作しない場合 / If Extension is Not Working
- Chrome拡張機能が有効になっていることを確認  
  Verify that the Chrome extension is enabled
- デベロッパーツールでエラーメッセージを確認  
  Check error messages in Developer Tools 