/**
 * Demo test to show actual test data and validation
 */

import { z } from "zod";

describe("DEMO - Show Test Data", () => {
  it("should show schema validation with actual data", () => {
    // This is the actual schema from your tools
    const ListCustomersInputSchema = z.object({
      limit: z.number().int().min(1).max(1000).default(100),
      offset: z.number().int().min(0).default(0),
      response_format: z.enum(["json", "markdown"]).default("markdown"),
      active_only: z.boolean().default(true),
      search: z.string().optional()
    }).strict();

    // Test input
    const testInput = {
      limit: 50,
      offset: 10,
      response_format: "json" as const,
      active_only: false,
      search: "Test Company"
    };

    console.log("\n=== INPUT DATA ===");
    console.log(JSON.stringify(testInput, null, 2));

    // Validate
    const result = ListCustomersInputSchema.parse(testInput);

    console.log("\n=== VALIDATED OUTPUT ===");
    console.log(JSON.stringify(result, null, 2));

    // Verify the data
    expect(result.limit).toBe(50);
    expect(result.search).toBe("Test Company");
  });

  it("should show mock API response data", async () => {
    // Mock customer data (like what QuickBooks API would return)
    const mockCustomers = [
      {
        Id: "1",
        DisplayName: "Acme Corporation",
        PrimaryEmailAddr: { Address: "billing@acme.com" },
        PrimaryPhone: { FreeFormNumber: "555-0100" },
        Balance: 1250.50,
        Active: true
      },
      {
        Id: "2",
        DisplayName: "Widget Industries",
        PrimaryEmailAddr: { Address: "accounts@widget.com" },
        PrimaryPhone: { FreeFormNumber: "555-0200" },
        Balance: 0,
        Active: true
      }
    ];

    console.log("\n=== MOCK CUSTOMER DATA ===");
    console.log(JSON.stringify(mockCustomers, null, 2));

    // Mock handler that processes this data
    const mockHandler = async (params: any) => {
      const lines = ["# QuickBooks Customers\n"];
      lines.push(`Found ${mockCustomers.length} customers\n`);

      for (const c of mockCustomers) {
        lines.push(`## ${c.DisplayName}`);
        lines.push(`- **ID:** ${c.Id}`);
        lines.push(`- **Email:** ${c.PrimaryEmailAddr.Address}`);
        lines.push(`- **Balance:** $${c.Balance.toFixed(2)}\n`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    };

    const result = await mockHandler({});

    console.log("\n=== FORMATTED OUTPUT ===");
    console.log(result.content[0].text);

    expect(result.content[0].text).toContain("Acme Corporation");
    expect(result.content[0].text).toContain("$1250.50");
    expect(result.content[0].text).toContain("Widget Industries");
  });

  it("should show invoice creation with actual calculation", async () => {
    const invoiceInput = {
      customer_id: "123",
      line_items: [
        { description: "House Cleaning", amount: 150, quantity: 2 },
        { description: "Deep Carpet Clean", amount: 200, quantity: 1 },
        { description: "Window Washing", amount: 75, quantity: 4 }
      ],
      due_date: "2024-12-31",
      memo: "Monthly cleaning services"
    };

    console.log("\n=== INVOICE INPUT ===");
    console.log(JSON.stringify(invoiceInput, null, 2));

    // Calculate total
    const total = invoiceInput.line_items.reduce(
      (sum, item) => sum + (item.amount * item.quantity),
      0
    );

    console.log("\n=== CALCULATION ===");
    console.log(`Line 1: $150 × 2 = $${150 * 2}`);
    console.log(`Line 2: $200 × 1 = $${200 * 1}`);
    console.log(`Line 3: $75 × 4 = $${75 * 4}`);
    console.log(`TOTAL: $${total}`);

    expect(total).toBe(800); // 300 + 200 + 300
  });

  it("should show error validation rejecting bad data", () => {
    const CreateInvoiceInputSchema = z.object({
      customer_id: z.string(),
      line_items: z.array(z.object({
        description: z.string(),
        amount: z.number(),
        quantity: z.number().default(1)
      })).min(1)
    });

    // Invalid data - no line items
    const invalidData = {
      customer_id: "123",
      line_items: []
    };

    console.log("\n=== INVALID DATA (should fail) ===");
    console.log(JSON.stringify(invalidData, null, 2));

    try {
      CreateInvoiceInputSchema.parse(invalidData);
      console.log("❌ UNEXPECTED: Validation passed when it should have failed");
      fail("Should have thrown validation error");
    } catch (error) {
      console.log("✅ EXPECTED: Validation correctly rejected empty line_items");
      console.log(`Error: ${error}`);
      expect(error).toBeDefined();
    }
  });
});
