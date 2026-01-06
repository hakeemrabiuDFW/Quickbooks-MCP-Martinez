/**
 * Account-related MCP tools
 */

import { z } from "zod";
import type { QuickBooksClient } from "../auth/oauth.js";

const ResponseFormatSchema = z.enum(["json", "markdown"]).default("markdown")
  .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

const GetAccountsInputSchema = z.object({
  account_type: z.enum(["all", "Bank", "Accounts Receivable", "Accounts Payable", "Income", "Expense"])
    .default("all").describe("Filter by account type"),
  response_format: ResponseFormatSchema
}).strict();

export const listAccounts = {
  name: "qbo_list_accounts",
  description: {
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
  handler: async (params: z.infer<typeof GetAccountsInputSchema>, client: QuickBooksClient) => {
    try {
      const accounts = await client.queryAccounts({
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
};
