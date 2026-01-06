/**
 * Report-related MCP tools
 */

import { z } from "zod";
import type { QuickBooksClient } from "../auth/oauth.js";

const ResponseFormatSchema = z.enum(["json", "markdown"]).default("markdown")
  .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

const GetProfitLossInputSchema = z.object({
  start_date: z.string().describe("Start date (YYYY-MM-DD)"),
  end_date: z.string().describe("End date (YYYY-MM-DD)"),
  response_format: ResponseFormatSchema
}).strict();

export const getProfitLoss = {
  name: "qbo_profit_loss_report",
  description: {
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
  handler: async (params: z.infer<typeof GetProfitLossInputSchema>, client: QuickBooksClient) => {
    try {
      const report = await client.getProfitAndLossReport(params.start_date, params.end_date);

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
};
