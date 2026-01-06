/**
 * Customer-related MCP tools
 */

import { z } from "zod";
import type { QuickBooksClient } from "../auth/oauth.js";

const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(1000).default(100).describe("Maximum results to return"),
  offset: z.number().int().min(0).default(0).describe("Number of results to skip")
}).strict();

const ResponseFormatSchema = z.enum(["json", "markdown"]).default("markdown")
  .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

const ListCustomersInputSchema = z.object({
  ...PaginationSchema.shape,
  response_format: ResponseFormatSchema,
  active_only: z.boolean().default(true).describe("Only return active customers"),
  search: z.string().optional().describe("Search term to filter by name or company")
}).strict();

export const listCustomers = {
  name: "qbo_list_customers",
  description: {
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
  handler: async (params: z.infer<typeof ListCustomersInputSchema>, client: QuickBooksClient) => {
    try {
      const customers = await client.queryCustomers({
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
};
