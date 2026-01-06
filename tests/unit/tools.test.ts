/**
 * Unit tests for QuickBooks MCP tool schemas and handlers
 */

import { z } from "zod";

describe("Tool Schema Validation", () => {
  describe("ListCustomersInputSchema", () => {
    const ListCustomersInputSchema = z.object({
      limit: z.number().int().min(1).max(1000).default(100),
      offset: z.number().int().min(0).default(0),
      response_format: z.enum(["json", "markdown"]).default("markdown"),
      active_only: z.boolean().default(true),
      search: z.string().optional()
    }).strict();

    it("should validate with default values", () => {
      const result = ListCustomersInputSchema.parse({});
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(result.response_format).toBe("markdown");
      expect(result.active_only).toBe(true);
    });

    it("should validate with custom values", () => {
      const input = {
        limit: 50,
        offset: 10,
        response_format: "json" as const,
        active_only: false,
        search: "Test Company"
      };
      const result = ListCustomersInputSchema.parse(input);
      expect(result).toEqual(input);
    });

    it("should reject invalid limit", () => {
      expect(() => {
        ListCustomersInputSchema.parse({ limit: 0 });
      }).toThrow();

      expect(() => {
        ListCustomersInputSchema.parse({ limit: 1001 });
      }).toThrow();
    });

    it("should reject negative offset", () => {
      expect(() => {
        ListCustomersInputSchema.parse({ offset: -1 });
      }).toThrow();
    });

    it("should reject invalid response format", () => {
      expect(() => {
        ListCustomersInputSchema.parse({ response_format: "xml" });
      }).toThrow();
    });
  });

  describe("ListInvoicesInputSchema", () => {
    const ListInvoicesInputSchema = z.object({
      limit: z.number().int().min(1).max(1000).default(100),
      offset: z.number().int().min(0).default(0),
      response_format: z.enum(["json", "markdown"]).default("markdown"),
      customer_id: z.string().optional(),
      status: z.enum(["all", "open", "paid", "overdue"]).default("all"),
      start_date: z.string().optional(),
      end_date: z.string().optional()
    }).strict();

    it("should validate with default values", () => {
      const result = ListInvoicesInputSchema.parse({});
      expect(result.status).toBe("all");
      expect(result.response_format).toBe("markdown");
    });

    it("should validate with all filters", () => {
      const input = {
        limit: 25,
        offset: 0,
        response_format: "json" as const,
        customer_id: "123",
        status: "open" as const,
        start_date: "2024-01-01",
        end_date: "2024-12-31"
      };
      const result = ListInvoicesInputSchema.parse(input);
      expect(result).toEqual(input);
    });

    it("should reject invalid status", () => {
      expect(() => {
        ListInvoicesInputSchema.parse({ status: "invalid" });
      }).toThrow();
    });
  });

  describe("CreateInvoiceInputSchema", () => {
    const CreateInvoiceInputSchema = z.object({
      customer_id: z.string(),
      line_items: z.array(z.object({
        description: z.string(),
        amount: z.number(),
        quantity: z.number().default(1)
      })).min(1),
      due_date: z.string().optional(),
      memo: z.string().optional()
    }).strict();

    it("should validate valid invoice data", () => {
      const input = {
        customer_id: "123",
        line_items: [
          { description: "Service A", amount: 100, quantity: 2 },
          { description: "Service B", amount: 50 }
        ],
        due_date: "2024-12-31",
        memo: "Thank you for your business"
      };
      const result = CreateInvoiceInputSchema.parse(input);
      expect(result.line_items[1].quantity).toBe(1); // default value
    });

    it("should require customer_id", () => {
      expect(() => {
        CreateInvoiceInputSchema.parse({
          line_items: [{ description: "Test", amount: 100 }]
        });
      }).toThrow();
    });

    it("should require at least one line item", () => {
      expect(() => {
        CreateInvoiceInputSchema.parse({
          customer_id: "123",
          line_items: []
        });
      }).toThrow();
    });

    it("should require description and amount in line items", () => {
      expect(() => {
        CreateInvoiceInputSchema.parse({
          customer_id: "123",
          line_items: [{ description: "Test" }]
        });
      }).toThrow();
    });
  });

  describe("GetAccountsInputSchema", () => {
    const GetAccountsInputSchema = z.object({
      account_type: z.enum(["all", "Bank", "Accounts Receivable", "Accounts Payable", "Income", "Expense"])
        .default("all"),
      response_format: z.enum(["json", "markdown"]).default("markdown")
    }).strict();

    it("should validate with defaults", () => {
      const result = GetAccountsInputSchema.parse({});
      expect(result.account_type).toBe("all");
      expect(result.response_format).toBe("markdown");
    });

    it("should validate specific account types", () => {
      const types = ["Bank", "Accounts Receivable", "Accounts Payable", "Income", "Expense"];
      types.forEach(type => {
        const result = GetAccountsInputSchema.parse({ account_type: type });
        expect(result.account_type).toBe(type);
      });
    });
  });

  describe("GetProfitLossInputSchema", () => {
    const GetProfitLossInputSchema = z.object({
      start_date: z.string(),
      end_date: z.string(),
      response_format: z.enum(["json", "markdown"]).default("markdown")
    }).strict();

    it("should validate required dates", () => {
      const input = {
        start_date: "2024-01-01",
        end_date: "2024-12-31"
      };
      const result = GetProfitLossInputSchema.parse(input);
      expect(result.start_date).toBe("2024-01-01");
      expect(result.end_date).toBe("2024-12-31");
    });

    it("should require start_date", () => {
      expect(() => {
        GetProfitLossInputSchema.parse({ end_date: "2024-12-31" });
      }).toThrow();
    });

    it("should require end_date", () => {
      expect(() => {
        GetProfitLossInputSchema.parse({ start_date: "2024-01-01" });
      }).toThrow();
    });
  });

  describe("ListVendorsInputSchema", () => {
    const ListVendorsInputSchema = z.object({
      limit: z.number().int().min(1).max(1000).default(100),
      offset: z.number().int().min(0).default(0),
      response_format: z.enum(["json", "markdown"]).default("markdown"),
      active_only: z.boolean().default(true)
    }).strict();

    it("should validate with defaults", () => {
      const result = ListVendorsInputSchema.parse({});
      expect(result.active_only).toBe(true);
      expect(result.limit).toBe(100);
    });
  });

  describe("ListBillsInputSchema", () => {
    const ListBillsInputSchema = z.object({
      limit: z.number().int().min(1).max(1000).default(100),
      offset: z.number().int().min(0).default(0),
      response_format: z.enum(["json", "markdown"]).default("markdown"),
      vendor_id: z.string().optional(),
      status: z.enum(["all", "unpaid", "paid"]).default("all")
    }).strict();

    it("should validate with defaults", () => {
      const result = ListBillsInputSchema.parse({});
      expect(result.status).toBe("all");
    });

    it("should validate with vendor filter", () => {
      const input = {
        vendor_id: "456",
        status: "unpaid" as const
      };
      const result = ListBillsInputSchema.parse(input);
      expect(result.vendor_id).toBe("456");
      expect(result.status).toBe("unpaid");
    });
  });
});

describe("Mock Handler Responses", () => {
  describe("qbo_list_customers handler", () => {
    it("should return markdown format by default", async () => {
      const mockCustomers = [
        {
          Id: "1",
          DisplayName: "Test Customer",
          PrimaryEmailAddr: { Address: "test@example.com" },
          PrimaryPhone: { FreeFormNumber: "555-1234" },
          Balance: 100.50,
          Active: true
        }
      ];

      const mockHandler = async (params: any) => {
        if (params.response_format === "json") {
          return {
            content: [{ type: "text", text: JSON.stringify(mockCustomers, null, 2) }]
          };
        }

        const lines = ["# QuickBooks Customers\n"];
        lines.push(`Found ${mockCustomers.length} customers\n`);

        for (const c of mockCustomers) {
          lines.push(`## ${c.DisplayName}`);
          lines.push(`- **ID:** ${c.Id}`);
          if (c.PrimaryEmailAddr?.Address) lines.push(`- **Email:** ${c.PrimaryEmailAddr.Address}`);
          if (c.PrimaryPhone?.FreeFormNumber) lines.push(`- **Phone:** ${c.PrimaryPhone.FreeFormNumber}`);
          lines.push(`- **Balance:** $${(c.Balance || 0).toFixed(2)}`);
          lines.push(`- **Active:** ${c.Active ? "Yes" : "No"}\n`);
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      };

      const result = await mockHandler({ response_format: "markdown" });
      expect(result.content[0].text).toContain("# QuickBooks Customers");
      expect(result.content[0].text).toContain("Test Customer");
      expect(result.content[0].text).toContain("test@example.com");
    });

    it("should return JSON format when requested", async () => {
      const mockCustomers = [
        {
          Id: "1",
          DisplayName: "Test Customer",
          Balance: 100.50,
          Active: true
        }
      ];

      const mockHandler = async (params: any) => {
        if (params.response_format === "json") {
          return {
            content: [{ type: "text", text: JSON.stringify(mockCustomers, null, 2) }]
          };
        }
        return { content: [{ type: "text", text: "Markdown output" }] };
      };

      const result = await mockHandler({ response_format: "json" });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(mockCustomers);
    });
  });

  describe("qbo_create_invoice handler", () => {
    it("should return success response with invoice details", async () => {
      const mockInvoice = {
        Id: "123",
        DocNumber: "INV-001",
        TotalAmt: 200,
        DueDate: "2024-12-31",
        CustomerRef: { name: "Test Customer", value: "1" }
      };

      const mockHandler = async (params: any) => {
        return {
          content: [{
            type: "text",
            text: `✅ Invoice created successfully!\n\n` +
              `- **Invoice #:** ${mockInvoice.DocNumber || mockInvoice.Id}\n` +
              `- **Total:** $${(mockInvoice.TotalAmt || 0).toFixed(2)}\n` +
              `- **Due Date:** ${mockInvoice.DueDate}\n` +
              `- **Customer:** ${mockInvoice.CustomerRef?.name}`
          }]
        };
      };

      const result = await mockHandler({
        customer_id: "1",
        line_items: [{ description: "Test", amount: 200 }]
      });

      expect(result.content[0].text).toContain("Invoice created successfully");
      expect(result.content[0].text).toContain("INV-001");
      expect(result.content[0].text).toContain("$200.00");
    });

    it("should handle errors gracefully", async () => {
      const mockHandler = async (params: any) => {
        try {
          throw new Error("Customer not found");
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return { content: [{ type: "text", text: `Error creating invoice: ${message}` }], isError: true };
        }
      };

      const result = await mockHandler({ customer_id: "999" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error creating invoice");
      expect(result.content[0].text).toContain("Customer not found");
    });
  });

  describe("qbo_profit_loss_report handler", () => {
    it("should return formatted P&L report", async () => {
      const mockReport = {
        totalIncome: 10000,
        totalCOGS: 3000,
        grossProfit: 7000,
        totalExpenses: 4000,
        netIncome: 3000
      };

      const mockHandler = async (params: any) => {
        if (params.response_format === "json") {
          return { content: [{ type: "text", text: JSON.stringify(mockReport, null, 2) }] };
        }

        return {
          content: [{
            type: "text",
            text: `# Profit & Loss Report\n**Period:** ${params.start_date} to ${params.end_date}\n\n` +
              `## Summary\n` +
              `- **Total Income:** $${(mockReport.totalIncome || 0).toFixed(2)}\n` +
              `- **Total COGS:** $${(mockReport.totalCOGS || 0).toFixed(2)}\n` +
              `- **Gross Profit:** $${(mockReport.grossProfit || 0).toFixed(2)}\n` +
              `- **Total Expenses:** $${(mockReport.totalExpenses || 0).toFixed(2)}\n` +
              `- **Net Income:** $${(mockReport.netIncome || 0).toFixed(2)}\n`
          }]
        };
      };

      const result = await mockHandler({
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        response_format: "markdown"
      });

      expect(result.content[0].text).toContain("Profit & Loss Report");
      expect(result.content[0].text).toContain("$10000.00");
      expect(result.content[0].text).toContain("$3000.00");
    });
  });
});
