/**
 * Integration tests for MCP protocol implementation
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("MCP Protocol Integration", () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({
      name: "quickbooks-mcp-server-test",
      version: "1.0.0"
    });
  });

  describe("tools/list", () => {
    it("should return all registered tools", async () => {
      const expectedTools = [
        "qbo_list_customers",
        "qbo_list_invoices",
        "qbo_create_invoice",
        "qbo_list_accounts",
        "qbo_profit_loss_report",
        "qbo_list_vendors",
        "qbo_list_bills"
      ];

      // Register mock tools
      for (const toolName of expectedTools) {
        server.registerTool(
          toolName,
          {
            title: `${toolName} Test`,
            description: `Test tool for ${toolName}`,
            inputSchema: { type: "object", properties: {} }
          },
          async () => ({ content: [{ type: "text", text: "mock response" }] })
        );
      }

      const tools = server.listTools();
      expect(tools).toHaveLength(expectedTools.length);

      const toolNames = tools.map(t => t.name);
      expectedTools.forEach(expectedTool => {
        expect(toolNames).toContain(expectedTool);
      });
    });

    it("should include tool metadata", async () => {
      server.registerTool(
        "test_tool",
        {
          title: "Test Tool",
          description: "A test tool for validation",
          inputSchema: {
            type: "object",
            properties: {
              test_param: { type: "string" }
            },
            required: ["test_param"]
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true
          }
        },
        async () => ({ content: [{ type: "text", text: "test" }] })
      );

      const tools = server.listTools();
      const testTool = tools.find(t => t.name === "test_tool");

      expect(testTool).toBeDefined();
      expect(testTool?.description.title).toBe("Test Tool");
      expect(testTool?.description.description).toBe("A test tool for validation");
      expect(testTool?.inputSchema).toHaveProperty("properties");
      expect(testTool?.inputSchema.properties).toHaveProperty("test_param");
    });
  });

  describe("Tool Invocation", () => {
    it("should successfully invoke qbo_list_customers with mock data", async () => {
      const mockHandler = jest.fn(async (params: any) => {
        return {
          content: [{
            type: "text",
            text: JSON.stringify([
              {
                Id: "1",
                DisplayName: "Mock Customer",
                Active: true,
                Balance: 0
              }
            ])
          }]
        };
      });

      server.registerTool(
        "qbo_list_customers",
        {
          title: "List Customers",
          description: "List QuickBooks customers",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number", default: 100 },
              offset: { type: "number", default: 0 },
              response_format: { type: "string", enum: ["json", "markdown"], default: "markdown" },
              active_only: { type: "boolean", default: true }
            }
          }
        },
        mockHandler
      );

      const result = await server.callTool("qbo_list_customers", {
        response_format: "json",
        active_only: true
      });

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: "json",
          active_only: true
        })
      );
      expect(result.content[0].type).toBe("text");

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toHaveLength(1);
      expect(responseData[0].DisplayName).toBe("Mock Customer");
    });

    it("should successfully invoke qbo_list_invoices with filters", async () => {
      const mockHandler = jest.fn(async (params: any) => {
        const mockInvoices = [
          {
            Id: "1",
            DocNumber: "INV-001",
            CustomerRef: { value: params.customer_id, name: "Test Customer" },
            TxnDate: "2024-01-15",
            DueDate: "2024-02-15",
            TotalAmt: 500,
            Balance: 500
          }
        ];

        return {
          content: [{
            type: "text",
            text: JSON.stringify(mockInvoices)
          }]
        };
      });

      server.registerTool(
        "qbo_list_invoices",
        {
          title: "List Invoices",
          description: "List QuickBooks invoices",
          inputSchema: {
            type: "object",
            properties: {
              customer_id: { type: "string" },
              status: { type: "string", enum: ["all", "open", "paid", "overdue"] },
              response_format: { type: "string", enum: ["json", "markdown"] }
            }
          }
        },
        mockHandler
      );

      const result = await server.callTool("qbo_list_invoices", {
        customer_id: "123",
        status: "open",
        response_format: "json"
      });

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: "123",
          status: "open"
        })
      );

      const invoices = JSON.parse(result.content[0].text);
      expect(invoices[0].CustomerRef.value).toBe("123");
    });

    it("should successfully invoke qbo_create_invoice with mock data", async () => {
      const mockHandler = jest.fn(async (params: any) => {
        const totalAmount = params.line_items.reduce(
          (sum: number, item: any) => sum + (item.amount * (item.quantity || 1)),
          0
        );

        return {
          content: [{
            type: "text",
            text: `Invoice created successfully!\n\n` +
              `- **Invoice #:** INV-TEST-001\n` +
              `- **Total:** $${totalAmount.toFixed(2)}\n` +
              `- **Customer ID:** ${params.customer_id}`
          }]
        };
      });

      server.registerTool(
        "qbo_create_invoice",
        {
          title: "Create Invoice",
          description: "Create a new invoice",
          inputSchema: {
            type: "object",
            properties: {
              customer_id: { type: "string" },
              line_items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    amount: { type: "number" },
                    quantity: { type: "number", default: 1 }
                  },
                  required: ["description", "amount"]
                }
              }
            },
            required: ["customer_id", "line_items"]
          }
        },
        mockHandler
      );

      const result = await server.callTool("qbo_create_invoice", {
        customer_id: "456",
        line_items: [
          { description: "Consulting Services", amount: 150, quantity: 2 },
          { description: "Setup Fee", amount: 100 }
        ],
        due_date: "2024-12-31"
      });

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: "456",
          line_items: expect.arrayContaining([
            expect.objectContaining({ description: "Consulting Services" })
          ])
        })
      );

      expect(result.content[0].text).toContain("Invoice created successfully");
      expect(result.content[0].text).toContain("$400.00");
    });

    it("should handle tool errors gracefully", async () => {
      const mockHandler = jest.fn(async () => {
        throw new Error("QuickBooks API error: Invalid credentials");
      });

      server.registerTool(
        "qbo_test_error",
        {
          title: "Error Test",
          description: "Test error handling",
          inputSchema: { type: "object", properties: {} }
        },
        async (params) => {
          try {
            return await mockHandler(params);
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return {
              content: [{ type: "text", text: `Error: ${message}` }],
              isError: true
            };
          }
        }
      );

      const result = await server.callTool("qbo_test_error", {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("QuickBooks API error");
    });
  });

  describe("Tool Parameter Validation", () => {
    it("should accept valid parameters", async () => {
      const mockHandler = jest.fn(async (params: any) => ({
        content: [{ type: "text", text: "success" }]
      }));

      server.registerTool(
        "test_validation",
        {
          title: "Validation Test",
          description: "Test parameter validation",
          inputSchema: {
            type: "object",
            properties: {
              required_field: { type: "string" },
              optional_field: { type: "number" }
            },
            required: ["required_field"]
          }
        },
        mockHandler
      );

      await server.callTool("test_validation", {
        required_field: "test"
      });

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          required_field: "test"
        })
      );
    });
  });

  describe("Response Format Tests", () => {
    it("should support markdown response format", async () => {
      const mockHandler = jest.fn(async (params: any) => {
        const lines = [
          "# Test Report",
          "",
          "## Summary",
          "- Item 1: Value 1",
          "- Item 2: Value 2"
        ];
        return {
          content: [{ type: "text", text: lines.join("\n") }]
        };
      });

      server.registerTool(
        "test_markdown",
        {
          title: "Markdown Test",
          description: "Test markdown output",
          inputSchema: {
            type: "object",
            properties: {
              response_format: { type: "string", enum: ["json", "markdown"] }
            }
          }
        },
        mockHandler
      );

      const result = await server.callTool("test_markdown", {
        response_format: "markdown"
      });

      expect(result.content[0].text).toContain("# Test Report");
      expect(result.content[0].text).toContain("## Summary");
    });

    it("should support JSON response format", async () => {
      const mockData = {
        customers: [
          { id: "1", name: "Customer A" },
          { id: "2", name: "Customer B" }
        ]
      };

      const mockHandler = jest.fn(async (params: any) => ({
        content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }]
      }));

      server.registerTool(
        "test_json",
        {
          title: "JSON Test",
          description: "Test JSON output",
          inputSchema: {
            type: "object",
            properties: {
              response_format: { type: "string", enum: ["json", "markdown"] }
            }
          }
        },
        mockHandler
      );

      const result = await server.callTool("test_json", {
        response_format: "json"
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(mockData);
      expect(parsed.customers).toHaveLength(2);
    });
  });
});
