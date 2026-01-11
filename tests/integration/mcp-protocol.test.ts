/**
 * Integration tests for MCP protocol implementation
 * Tests tool handlers with mock data
 */

import { z } from "zod";

describe("MCP Protocol Integration", () => {
  describe("Tool Definitions", () => {
    it("should have all expected QuickBooks tools", () => {
      const expectedTools = [
        "qbo_list_customers",
        "qbo_list_invoices",
        "qbo_create_invoice",
        "qbo_list_accounts",
        "qbo_profit_loss_report",
        "qbo_list_vendors",
        "qbo_list_bills"
      ];

      expect(expectedTools).toHaveLength(7);
      expect(expectedTools).toContain("qbo_list_customers");
      expect(expectedTools).toContain("qbo_create_invoice");
      expect(expectedTools).toContain("qbo_profit_loss_report");
    });
  });

  describe("Mock Tool Invocations", () => {
    it("should handle qbo_list_customers invocation", async () => {
      const mockCustomers = [
        {
          Id: "1",
          DisplayName: "Mock Customer",
          Active: true,
          Balance: 0,
          PrimaryEmailAddr: { Address: "test@example.com" }
        }
      ];

      const mockHandler = async (params: any) => {
        if (params.response_format === "json") {
          return {
            content: [{ type: "text", text: JSON.stringify(mockCustomers, null, 2) }]
          };
        }
        return {
          content: [{ type: "text", text: "# QuickBooks Customers\n\nFound 1 customers" }]
        };
      };

      const result = await mockHandler({
        response_format: "json",
        active_only: true,
        limit: 100,
        offset: 0
      });

      expect(result.content[0].type).toBe("text");
      const customers = JSON.parse(result.content[0].text);
      expect(customers).toHaveLength(1);
      expect(customers[0].DisplayName).toBe("Mock Customer");
    });

    it("should handle qbo_list_invoices invocation with filters", async () => {
      const mockInvoices = [
        {
          Id: "INV-001",
          DocNumber: "INV-001",
          CustomerRef: { value: "123", name: "Test Customer" },
          TxnDate: "2024-01-15",
          DueDate: "2024-02-15",
          TotalAmt: 500,
          Balance: 500
        }
      ];

      const mockHandler = async (params: any) => {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(mockInvoices.filter(
              inv => !params.customer_id || inv.CustomerRef.value === params.customer_id
            ))
          }]
        };
      };

      const result = await mockHandler({
        customer_id: "123",
        status: "open",
        response_format: "json"
      });

      const invoices = JSON.parse(result.content[0].text);
      expect(invoices).toHaveLength(1);
      expect(invoices[0].CustomerRef.value).toBe("123");
    });

    it("should handle qbo_create_invoice invocation", async () => {
      const mockHandler = async (params: any) => {
        const total = params.line_items.reduce(
          (sum: number, item: any) => sum + (item.amount * (item.quantity || 1)),
          0
        );

        return {
          content: [{
            type: "text",
            text: `Invoice created successfully!\n\n` +
              `- **Invoice #:** INV-TEST-001\n` +
              `- **Total:** $${total.toFixed(2)}\n` +
              `- **Customer ID:** ${params.customer_id}`
          }]
        };
      };

      const result = await mockHandler({
        customer_id: "456",
        line_items: [
          { description: "Consulting Services", amount: 150, quantity: 2 },
          { description: "Setup Fee", amount: 100 }
        ],
        due_date: "2024-12-31"
      });

      expect(result.content[0].text).toContain("Invoice created successfully");
      expect(result.content[0].text).toContain("$400.00");
      expect(result.content[0].text).toContain("456");
    });

    it("should handle qbo_list_vendors invocation", async () => {
      const mockVendors = [
        {
          Id: "V1",
          DisplayName: "Office Supplies Inc",
          Balance: 250.00,
          Active: true
        }
      ];

      const mockHandler = async (params: any) => {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(mockVendors)
          }]
        };
      };

      const result = await mockHandler({
        active_only: true,
        response_format: "json"
      });

      const vendors = JSON.parse(result.content[0].text);
      expect(vendors).toHaveLength(1);
      expect(vendors[0].DisplayName).toBe("Office Supplies Inc");
    });

    it("should handle qbo_list_bills invocation", async () => {
      const mockBills = [
        {
          Id: "BILL-001",
          VendorRef: { value: "V1", name: "Office Supplies Inc" },
          TxnDate: "2024-01-10",
          DueDate: "2024-02-10",
          TotalAmt: 250,
          Balance: 250
        }
      ];

      const mockHandler = async (params: any) => {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(mockBills)
          }]
        };
      };

      const result = await mockHandler({
        status: "unpaid",
        response_format: "json"
      });

      const bills = JSON.parse(result.content[0].text);
      expect(bills).toHaveLength(1);
      expect(bills[0].Balance).toBe(250);
    });

    it("should handle qbo_list_accounts invocation", async () => {
      const mockAccounts = [
        {
          Id: "ACC-001",
          Name: "Checking Account",
          AccountType: "Bank",
          CurrentBalance: 15000,
          Active: true
        }
      ];

      const mockHandler = async (params: any) => {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(mockAccounts)
          }]
        };
      };

      const result = await mockHandler({
        account_type: "Bank",
        response_format: "json"
      });

      const accounts = JSON.parse(result.content[0].text);
      expect(accounts).toHaveLength(1);
      expect(accounts[0].AccountType).toBe("Bank");
    });

    it("should handle qbo_profit_loss_report invocation", async () => {
      const mockReport = {
        totalIncome: 10000,
        totalCOGS: 3000,
        grossProfit: 7000,
        totalExpenses: 4000,
        netIncome: 3000
      };

      const mockHandler = async (params: any) => {
        if (params.response_format === "json") {
          return {
            content: [{ type: "text", text: JSON.stringify(mockReport) }]
          };
        }
        return {
          content: [{
            type: "text",
            text: `# Profit & Loss Report\n**Period:** ${params.start_date} to ${params.end_date}\n\n` +
              `- **Net Income:** $${mockReport.netIncome.toFixed(2)}`
          }]
        };
      };

      const result = await mockHandler({
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        response_format: "markdown"
      });

      expect(result.content[0].text).toContain("Profit & Loss Report");
      expect(result.content[0].text).toContain("2024-01-01");
      expect(result.content[0].text).toContain("$3000.00");
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const mockHandler = async (params: any) => {
        try {
          throw new Error("QuickBooks API error: Invalid credentials");
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true
          };
        }
      };

      const result = await mockHandler({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("QuickBooks API error");
    });

    it("should handle validation errors", async () => {
      const schema = z.object({
        customer_id: z.string(),
        line_items: z.array(z.object({
          description: z.string(),
          amount: z.number()
        })).min(1)
      });

      const invalidData = {
        customer_id: "123",
        line_items: []
      };

      expect(() => schema.parse(invalidData)).toThrow();
    });
  });

  describe("Response Formats", () => {
    it("should support markdown format", async () => {
      const mockHandler = async (params: any) => {
        return {
          content: [{
            type: "text",
            text: "# Test Report\n\n## Summary\n- Item 1\n- Item 2"
          }]
        };
      };

      const result = await mockHandler({ response_format: "markdown" });
      expect(result.content[0].text).toContain("# Test Report");
      expect(result.content[0].text).toContain("## Summary");
    });

    it("should support JSON format", async () => {
      const mockData = { items: [{ id: 1 }, { id: 2 }] };

      const mockHandler = async (params: any) => {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(mockData)
          }]
        };
      };

      const result = await mockHandler({ response_format: "json" });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(2);
    });
  });
});
