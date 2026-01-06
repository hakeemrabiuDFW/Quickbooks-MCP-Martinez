/**
 * Invoice-related MCP tools
 */

import { z } from "zod";
import type { QuickBooksClient } from "../auth/oauth.js";

const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(1000).default(100).describe("Maximum results to return"),
  offset: z.number().int().min(0).default(0).describe("Number of results to skip")
}).strict();

const ResponseFormatSchema = z.enum(["json", "markdown"]).default("markdown")
  .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

const ListInvoicesInputSchema = z.object({
  ...PaginationSchema.shape,
  response_format: ResponseFormatSchema,
  customer_id: z.string().optional().describe("Filter by customer ID"),
  status: z.enum(["all", "open", "paid", "overdue"]).default("all").describe("Invoice status filter"),
  start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().optional().describe("End date (YYYY-MM-DD)")
}).strict();

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

export const listInvoices = {
  name: "qbo_list_invoices",
  description: {
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
  handler: async (params: z.infer<typeof ListInvoicesInputSchema>, client: QuickBooksClient) => {
    try {
      const invoices = await client.queryInvoices({
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
};

export const createInvoice = {
  name: "qbo_create_invoice",
  description: {
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
  handler: async (params: z.infer<typeof CreateInvoiceInputSchema>, client: QuickBooksClient) => {
    try {
      const invoice = await client.createInvoice({
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
};
