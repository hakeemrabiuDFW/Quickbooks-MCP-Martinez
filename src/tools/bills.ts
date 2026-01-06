/**
 * Bill-related MCP tools
 */

import { z } from "zod";
import type { QuickBooksClient } from "../auth/oauth.js";

const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(1000).default(100).describe("Maximum results to return"),
  offset: z.number().int().min(0).default(0).describe("Number of results to skip")
}).strict();

const ResponseFormatSchema = z.enum(["json", "markdown"]).default("markdown")
  .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

const ListBillsInputSchema = z.object({
  ...PaginationSchema.shape,
  response_format: ResponseFormatSchema,
  vendor_id: z.string().optional().describe("Filter by vendor ID"),
  status: z.enum(["all", "unpaid", "paid"]).default("all").describe("Payment status filter")
}).strict();

export const listBills = {
  name: "qbo_list_bills",
  description: {
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
  handler: async (params: z.infer<typeof ListBillsInputSchema>, client: QuickBooksClient) => {
    try {
      const bills = await client.queryBills({
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
};
