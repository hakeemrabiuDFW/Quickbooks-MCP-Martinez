/**
 * Vendor-related MCP tools
 */

import { z } from "zod";
import type { QuickBooksClient } from "../auth/oauth.js";

const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(1000).default(100).describe("Maximum results to return"),
  offset: z.number().int().min(0).default(0).describe("Number of results to skip")
}).strict();

const ResponseFormatSchema = z.enum(["json", "markdown"]).default("markdown")
  .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

const ListVendorsInputSchema = z.object({
  ...PaginationSchema.shape,
  response_format: ResponseFormatSchema,
  active_only: z.boolean().default(true).describe("Only return active vendors")
}).strict();

export const listVendors = {
  name: "qbo_list_vendors",
  description: {
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
  handler: async (params: z.infer<typeof ListVendorsInputSchema>, client: QuickBooksClient) => {
    try {
      const vendors = await client.queryVendors({
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
};
