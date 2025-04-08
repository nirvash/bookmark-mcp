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
// Create an MCP server
const server = new mcp_js_1.McpServer({
    name: "StdioEchoServer",
    version: "1.0.0"
});
// Add an echo resource
server.resource("echo", new mcp_js_1.ResourceTemplate("echo://{message}", { list: undefined }), (uri_1, _a) => __awaiter(void 0, [uri_1, _a], void 0, function* (uri, { message }) {
    return ({
        contents: [{
                uri: uri.href,
                text: `Resource echo: ${message}`
            }]
    });
}));
// Add an echo tool
server.tool("echo", { message: zod_1.z.string() }, (_a) => __awaiter(void 0, [_a], void 0, function* ({ message }) {
    return ({
        content: [{ type: "text", text: `Tool echo: ${message}` }]
    });
}));
// Add an echo prompt
server.prompt("echo", { message: zod_1.z.string() }, ({ message }) => ({
    messages: [{
            role: "user",
            content: {
                type: "text",
                text: `Please process this message: ${message}`
            }
        }]
}));
// Start receiving messages on stdin and sending messages on stdout
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        const transport = new stdio_js_1.StdioServerTransport();
        yield server.connect(transport);
        console.log("Stdio Echo Server started and connected.");
    });
}
startServer();
