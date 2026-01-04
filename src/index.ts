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
import { z } from "zod";
import dotenv from "dotenv";
import crypto from "crypto";
import { QuickBooksClient } from "./services/quickbooks-client.js";

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
});

// ==================== SCHEMAS ====================

const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(1000).default(100).describe("Maximum results to return"),
  offset: z.number().int().min(0).default(0).describe("Number of results to skip")
}).strict();

const ResponseFormatSchema = z.enum(["json", "markdown"]).default("markdown")
  .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

// ==================== CUSTOMER TOOLS ====================

const ListCustomersInputSchema = z.object({
  ...PaginationSchema.shape,
  response_format: ResponseFormatSchema,
  active_only: z.boolean().default(true).describe("Only return active customers"),
  search: z.string().optional().describe("Search term to filter by name or company")
}).strict();

server.registerTool(
  "qbo_list_customers",
  {
    title: "List QuickBooks Customers",
    description: `List all customers from QuickBooks Online.

Returns customer details including name, email, phone, balance, and status.

Args:
  - limit (number): Maximum results (default: 100, max: 1000)
  - offset (number): Skip results for pagination
  - active_only (boolean): Only active customers (default: true)
  - search (string): Filter by name/company
  - response_format: 'markdown' or 'json'

Returns:
  List of customers with: Id, DisplayName, PrimaryEmailAddr, PrimaryPhone, Balance, Active`,
    inputSchema: ListCustomersInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params) => {
    try {
      const customers = await qbClient.queryCustomers({
        limit: params.limit,
        offset: params.offset,
        activeOnly: params.active_only,
        search: params.search
      });

      if (params.response_format === "json") {
        return {
          content: [{ type: "text", text: JSON.stringify(customers, null, 2) }]
        };
      }

      // Markdown format
      const lines = ["# QuickBooks Customers\n"];
      lines.push(`Found ${customers.length} customers\n`);
      
      for (const c of customers) {
        lines.push(`## ${c.DisplayName}`);
        lines.push(`- **ID:** ${c.Id}`);
        if (c.PrimaryEmailAddr?.Address) lines.push(`- **Email:** ${c.PrimaryEmailAddr.Address}`);
        if (c.PrimaryPhone?.FreeFormNumber) lines.push(`- **Phone:** ${c.PrimaryPhone.FreeFormNumber}`);
        lines.push(`- **Balance:** $${(c.Balance || 0).toFixed(2)}`);
        lines.push(`- **Active:** ${c.Active ? "Yes" : "No"}\n`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// ==================== INVOICE TOOLS ====================

const ListInvoicesInputSchema = z.object({
  ...PaginationSchema.shape,
  response_format: ResponseFormatSchema,
  customer_id: z.string().optional().describe("Filter by customer ID"),
  status: z.enum(["all", "open", "paid", "overdue"]).default("all").describe("Invoice status filter"),
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)")
}).strict();

server.registerTool(
  "qbo_list_invoices",
  {
    title: "List QuickBooks Invoices",
    description: `List invoices from QuickBooks Online with filtering options.

Args:
  - limit/offset: Pagination
  - customer_id: Filter by specific customer
  - status: 'all', 'open', 'paid', or 'overdue'
  - start_date/end_date: Date range filter (YYYY-MM-DD)
  - response_format: 'markdown' or 'json'

Returns:
  Invoice list with: Id, DocNumber, CustomerRef, TxnDate, DueDate, TotalAmt, Balance`,
    inputSchema: ListInvoicesInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params) => {
    try {
      const invoices = await qbClient.queryInvoices({
        limit: params.limit,
        offset: params.offset,
        customerId: params.customer_id,
        status: params.status,
        startDate: params.start_date,
        endDate: params.end_date
      });

      if (params.response_format === "json") {
        return {
          content: [{ type: "text", text: JSON.stringify(invoices, null, 2) }]
        };
      }

      const lines = ["# QuickBooks Invoices\n"];
      lines.push(`Found ${invoices.length} invoices\n`);

      for (const inv of invoices) {
        lines.push(`## Invoice #${inv.DocNumber || inv.Id}`);
        lines.push(`- **Customer:** ${inv.CustomerRef?.name || "N/A"}`);
        lines.push(`- **Date:** ${inv.TxnDate}`);
        lines.push(`- **Due:** ${inv.DueDate}`);
        lines.push(`- **Total:** $${(inv.TotalAmt || 0).toFixed(2)}`);
        lines.push(`- **Balance:** $${(inv.Balance || 0).toFixed(2)}`);
        lines.push(`- **Status:** ${inv.Balance === 0 ? "Paid" : inv.Balance === inv.TotalAmt ? "Open" : "Partial"}\n`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

const CreateInvoiceInputSchema = z.object({
  customer_id: z.string().describe("QuickBooks Customer ID"),
  line_items: z.array(z.object({
    description: z.string().describe("Line item description"),
    amount: z.number().describe("Amount for this line"),
    quantity: z.number().default(1).describe("Quantity (default: 1)")
  })).min(1).describe("Invoice line items"),
  due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
  memo: z.string().optional().describe("Customer memo/notes")
}).strict();

server.registerTool(
  "qbo_create_invoice",
  {
    title: "Create QuickBooks Invoice",
    description: `Create a new invoice in QuickBooks Online.

Args:
  - customer_id (required): The QuickBooks customer ID
  - line_items (required): Array of {description, amount, quantity}
  - due_date: Invoice due date (YYYY-MM-DD)
  - memo: Notes visible to customer

Returns:
  Created invoice details including Id, DocNumber, and TotalAmt`,
    inputSchema: CreateInvoiceInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params) => {
    try {
      const invoice = await qbClient.createInvoice({
        customerId: params.customer_id,
        lineItems: params.line_items,
        dueDate: params.due_date,
        memo: params.memo
      });

      return {
        content: [{
          type: "text",
          text: `✅ Invoice created successfully!\n\n` +
            `- **Invoice #:** ${invoice.DocNumber || invoice.Id}\n` +
            `- **Total:** $${(invoice.TotalAmt || 0).toFixed(2)}\n` +
            `- **Due Date:** ${invoice.DueDate}\n` +
            `- **Customer:** ${invoice.CustomerRef?.name}`
        }]
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { content: [{ type: "text", text: `Error creating invoice: ${message}` }], isError: true };
    }
  }
);

// ==================== ACCOUNT/REPORT TOOLS ====================

const GetAccountsInputSchema = z.object({
  account_type: z.enum(["all", "Bank", "Accounts Receivable", "Accounts Payable", "Income", "Expense"])
    .default("all").describe("Filter by account type"),
  response_format: ResponseFormatSchema
}).strict();

server.registerTool(
  "qbo_list_accounts",
  {
    title: "List QuickBooks Accounts",
    description: `List chart of accounts from QuickBooks Online.

Args:
  - account_type: Filter by type ('all', 'Bank', 'Accounts Receivable', etc.)
  - response_format: 'markdown' or 'json'

Returns:
  Account list with: Id, Name, AccountType, CurrentBalance`,
    inputSchema: GetAccountsInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params) => {
    try {
      const accounts = await qbClient.queryAccounts({
        accountType: params.account_type === "all" ? undefined : params.account_type
      });

      if (params.response_format === "json") {
        return { content: [{ type: "text", text: JSON.stringify(accounts, null, 2) }] };
      }

      const lines = ["# QuickBooks Chart of Accounts\n"];
      
      // Group by type
      const grouped = accounts.reduce((acc: Record<string, typeof accounts>, a) => {
        const type = a.AccountType || "Other";
        if (!acc[type]) acc[type] = [];
        acc[type].push(a);
        return acc;
      }, {});

      for (const [type, accts] of Object.entries(grouped)) {
        lines.push(`## ${type}\n`);
        for (const a of accts) {
          lines.push(`- **${a.Name}** (ID: ${a.Id}): $${(a.CurrentBalance || 0).toFixed(2)}`);
        }
        lines.push("");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

const GetProfitLossInputSchema = z.object({
  start_date: z.string().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().describe("End date (YYYY-MM-DD)"),
  response_format: ResponseFormatSchema
}).strict();

server.registerTool(
  "qbo_profit_loss_report",
  {
    title: "Get Profit & Loss Report",
    description: `Generate a Profit & Loss (Income Statement) report.

Args:
  - start_date: Report start date (YYYY-MM-DD)
  - end_date: Report end date (YYYY-MM-DD)
  - response_format: 'markdown' or 'json'

Returns:
  P&L report with Income, Cost of Goods Sold, Expenses, and Net Income`,
    inputSchema: GetProfitLossInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params) => {
    try {
      const report = await qbClient.getProfitAndLossReport(params.start_date, params.end_date);

      if (params.response_format === "json") {
        return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
      }

      return {
        content: [{
          type: "text",
          text: `# Profit & Loss Report\n**Period:** ${params.start_date} to ${params.end_date}\n\n` +
            `## Summary\n` +
            `- **Total Income:** $${(report.totalIncome || 0).toFixed(2)}\n` +
            `- **Total COGS:** $${(report.totalCOGS || 0).toFixed(2)}\n` +
            `- **Gross Profit:** $${(report.grossProfit || 0).toFixed(2)}\n` +
            `- **Total Expenses:** $${(report.totalExpenses || 0).toFixed(2)}\n` +
            `- **Net Income:** $${(report.netIncome || 0).toFixed(2)}\n`
        }]
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// ==================== VENDOR TOOLS ====================

const ListVendorsInputSchema = z.object({
  ...PaginationSchema.shape,
  response_format: ResponseFormatSchema,
  active_only: z.boolean().default(true).describe("Only return active vendors")
}).strict();

server.registerTool(
  "qbo_list_vendors",
  {
    title: "List QuickBooks Vendors",
    description: `List vendors/suppliers from QuickBooks Online.

Args:
  - limit/offset: Pagination
  - active_only: Only active vendors (default: true)
  - response_format: 'markdown' or 'json'

Returns:
  Vendor list with: Id, DisplayName, Email, Phone, Balance`,
    inputSchema: ListVendorsInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params) => {
    try {
      const vendors = await qbClient.queryVendors({
        limit: params.limit,
        offset: params.offset,
        activeOnly: params.active_only
      });

      if (params.response_format === "json") {
        return { content: [{ type: "text", text: JSON.stringify(vendors, null, 2) }] };
      }

      const lines = ["# QuickBooks Vendors\n"];
      lines.push(`Found ${vendors.length} vendors\n`);

      for (const v of vendors) {
        lines.push(`## ${v.DisplayName}`);
        lines.push(`- **ID:** ${v.Id}`);
        if (v.PrimaryEmailAddr?.Address) lines.push(`- **Email:** ${v.PrimaryEmailAddr.Address}`);
        if (v.PrimaryPhone?.FreeFormNumber) lines.push(`- **Phone:** ${v.PrimaryPhone.FreeFormNumber}`);
        lines.push(`- **Balance:** $${(v.Balance || 0).toFixed(2)}\n`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// ==================== BILLS TOOLS ====================

const ListBillsInputSchema = z.object({
  ...PaginationSchema.shape,
  response_format: ResponseFormatSchema,
  vendor_id: z.string().optional().describe("Filter by vendor ID"),
  status: z.enum(["all", "unpaid", "paid"]).default("all").describe("Payment status filter")
}).strict();

server.registerTool(
  "qbo_list_bills",
  {
    title: "List QuickBooks Bills",
    description: `List bills/payables from QuickBooks Online.

Args:
  - limit/offset: Pagination
  - vendor_id: Filter by vendor
  - status: 'all', 'unpaid', or 'paid'
  - response_format: 'markdown' or 'json'

Returns:
  Bill list with: Id, VendorRef, TxnDate, DueDate, TotalAmt, Balance`,
    inputSchema: ListBillsInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params) => {
    try {
      const bills = await qbClient.queryBills({
        limit: params.limit,
        offset: params.offset,
        vendorId: params.vendor_id,
        status: params.status
      });

      if (params.response_format === "json") {
        return { content: [{ type: "text", text: JSON.stringify(bills, null, 2) }] };
      }

      const lines = ["# QuickBooks Bills\n"];
      lines.push(`Found ${bills.length} bills\n`);

      for (const b of bills) {
        lines.push(`## Bill #${b.DocNumber || b.Id}`);
        lines.push(`- **Vendor:** ${b.VendorRef?.name || "N/A"}`);
        lines.push(`- **Date:** ${b.TxnDate}`);
        lines.push(`- **Due:** ${b.DueDate}`);
        lines.push(`- **Total:** $${(b.TotalAmt || 0).toFixed(2)}`);
        lines.push(`- **Balance:** $${(b.Balance || 0).toFixed(2)}\n`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

// ==================== TRANSPORT SETUP ====================

async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QuickBooks MCP Server running on stdio");
}

async function runHTTP(): Promise<void> {
  const app = express();

  // CORS middleware for Claude Desktop
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Accept, mcp-session-id");
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

  // Handle MCP requests
  app.post("/mcp", async (req, res) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        enableJsonResponse: true
      });

      res.on("close", () => {
        transport.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP request error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        });
      }
    }
  });

  // Handle DELETE for session cleanup
  app.delete("/mcp", async (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  const port = parseInt(process.env.PORT || "3000");
  const host = "0.0.0.0";
  app.listen(port, host, () => {
    console.error(`QuickBooks MCP Server running on port ${port}`);
    console.error(`Health: /health | MCP: /mcp`);
  });
}

// Main entry point
const transport = process.env.TRANSPORT || "stdio";
if (transport === "http") {
  runHTTP().catch(console.error);
} else {
  runStdio().catch(console.error);
}
