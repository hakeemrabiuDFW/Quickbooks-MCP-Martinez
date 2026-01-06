/**
 * QuickBooks Online MCP Server
 *
 * A Model Context Protocol server for QuickBooks Online integration.
 * Enables AI assistants to query and manage QuickBooks data.
 *
 * @author Hakeem Rabiu
 * @company Martinez Cleaning LLC
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import { QuickBooksClient } from "./auth/oauth.js";
import type { QBConfig } from "./types.js";

// Import tool modules
import { listCustomers } from "./tools/customers.js";
import { listInvoices, createInvoice } from "./tools/invoices.js";
import { listVendors } from "./tools/vendors.js";
import { listBills } from "./tools/bills.js";
import { listAccounts } from "./tools/accounts.js";
import { getProfitLoss } from "./tools/reports.js";

dotenv.config();

// Initialize server
const server = new McpServer({
  name: "quickbooks-mcp-server",
  version: "1.0.0"
});

// Initialize QuickBooks client
const qbClient = new QuickBooksClient({
  clientId: process.env.QUICKBOOKS_CLIENT_ID || "",
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || "",
  refreshToken: process.env.QUICKBOOKS_REFRESH_TOKEN || "",
  companyId: process.env.QUICKBOOKS_COMPANY_ID || "",
  environment: (process.env.QUICKBOOKS_ENVIRONMENT as "sandbox" | "production") || "sandbox"
} as QBConfig);

// Register all tools
server.registerTool(
  listCustomers.name,
  listCustomers.description,
  async (params) => listCustomers.handler(params, qbClient) as any
);

server.registerTool(
  listInvoices.name,
  listInvoices.description,
  async (params) => listInvoices.handler(params, qbClient) as any
);

server.registerTool(
  createInvoice.name,
  createInvoice.description,
  async (params) => createInvoice.handler(params, qbClient) as any
);

server.registerTool(
  listVendors.name,
  listVendors.description,
  async (params) => listVendors.handler(params, qbClient) as any
);

server.registerTool(
  listBills.name,
  listBills.description,
  async (params) => listBills.handler(params, qbClient) as any
);

server.registerTool(
  listAccounts.name,
  listAccounts.description,
  async (params) => listAccounts.handler(params, qbClient) as any
);

server.registerTool(
  getProfitLoss.name,
  getProfitLoss.description,
  async (params) => getProfitLoss.handler(params, qbClient) as any
);

// ==================== TRANSPORT SETUP ====================

async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QuickBooks MCP Server running on stdio");
}

// Session storage for HTTP transport
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: McpServer }>();

async function runHTTP(): Promise<void> {
  const app = express();

  // CORS middleware for Claude Desktop
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Accept, mcp-session-id, Authorization");
    res.header("Access-Control-Expose-Headers", "mcp-session-id");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "quickbooks-mcp-server" });
  });

  // Handle MCP requests with proper session management
  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    try {
      // Check for existing session
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!;
        await session.transport.handleRequest(req, res, req.body);
        return;
      }

      // New session - create transport and connect
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        enableJsonResponse: true
      });

      // For new sessions, we use the global server instance for the first connection
      // then store the transport for subsequent requests
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      // Store session after successful handling
      const newSessionId = transport.sessionId;
      if (newSessionId) {
        sessions.set(newSessionId, { transport, server });

        // Clean up on transport close
        res.on("close", () => {
          // Don't immediately delete - keep session alive for subsequent requests
        });
      }
    } catch (error) {
      console.error("MCP request error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: String(error) },
          id: null
        });
      }
    }
  });

  // Handle GET for SSE streams (required by MCP spec)
  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string;

    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }

    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res);
  });

  // Handle DELETE for session cleanup
  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string;

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      session.transport.close();
      sessions.delete(sessionId);
    }
    res.status(200).json({ status: "ok" });
  });

  const port = parseInt(process.env.PORT || "3000");
  const host = "0.0.0.0";
  app.listen(port, host, () => {
    console.error(`QuickBooks MCP Server running on port ${port}`);
    console.error(`Health: /health | MCP: /mcp`);
    console.error(`Environment: ${process.env.QUICKBOOKS_ENVIRONMENT || "sandbox"}`);
  });
}

// Main entry point
const transport = process.env.TRANSPORT || "stdio";
if (transport === "http") {
  runHTTP().catch(console.error);
} else {
  runStdio().catch(console.error);
}
