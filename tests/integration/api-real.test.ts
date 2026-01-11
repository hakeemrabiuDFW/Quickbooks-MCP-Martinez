/**
 * Real QuickBooks API Integration Tests
 *
 * These tests make actual API calls to QuickBooks Sandbox/Production.
 *
 * REQUIREMENTS:
 * - Valid .env file with QuickBooks credentials
 * - QUICKBOOKS_ENVIRONMENT should be set to "sandbox" for safety
 *
 * To run these tests:
 * npm test -- tests/integration/api-real.test.ts
 *
 * To skip these tests (default):
 * These are skipped by default unless RUN_API_TESTS=true
 */

import dotenv from "dotenv";
import { QuickBooksClient } from "../../src/auth/oauth.js";
import { listCustomers } from "../../src/tools/customers.js";
import { listInvoices, createInvoice } from "../../src/tools/invoices.js";
import { listVendors } from "../../src/tools/vendors.js";
import { listBills } from "../../src/tools/bills.js";
import { listAccounts } from "../../src/tools/accounts.js";
import { getProfitLoss } from "../../src/tools/reports.js";

dotenv.config();

// Skip these tests unless explicitly enabled
const runTests = process.env.RUN_API_TESTS === "true";
const describeIf = runTests ? describe : describe.skip;

// Validate environment
const hasCredentials = !!(
  process.env.QUICKBOOKS_CLIENT_ID &&
  process.env.QUICKBOOKS_CLIENT_SECRET &&
  process.env.QUICKBOOKS_REFRESH_TOKEN &&
  process.env.QUICKBOOKS_COMPANY_ID
);

if (runTests && !hasCredentials) {
  console.warn("\n⚠️  RUN_API_TESTS=true but credentials are missing!");
  console.warn("Please set up your .env file with QuickBooks credentials.\n");
}

describeIf("Real QuickBooks API Integration", () => {
  let qbClient: QuickBooksClient;

  beforeAll(() => {
    // Initialize QuickBooks client with real credentials
    qbClient = new QuickBooksClient({
      clientId: process.env.QUICKBOOKS_CLIENT_ID || "",
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || "",
      refreshToken: process.env.QUICKBOOKS_REFRESH_TOKEN || "",
      companyId: process.env.QUICKBOOKS_COMPANY_ID || "",
      environment: (process.env.QUICKBOOKS_ENVIRONMENT as "sandbox" | "production") || "sandbox"
    });

    console.log("\n🔧 Testing against QuickBooks:", process.env.QUICKBOOKS_ENVIRONMENT || "sandbox");
    console.log("📊 Company ID:", process.env.QUICKBOOKS_COMPANY_ID);
  });

  describe("Customer Tools", () => {
    it("should list customers from real QuickBooks API", async () => {
      const result = await listCustomers.handler(
        {
          limit: 5,
          offset: 0,
          response_format: "json",
          active_only: true
        },
        qbClient
      );

      console.log("\n✅ API Response received");

      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const customers = JSON.parse(result.content[0].text);
      console.log(`📋 Found ${customers.length} customers`);

      if (customers.length > 0) {
        console.log("📄 Sample customer:", {
          Id: customers[0].Id,
          DisplayName: customers[0].DisplayName,
          Balance: customers[0].Balance
        });

        // Verify structure
        expect(customers[0]).toHaveProperty("Id");
        expect(customers[0]).toHaveProperty("DisplayName");
        expect(customers[0]).toHaveProperty("Active");
      }
    }, 30000); // 30 second timeout for API call

    it("should get customers in markdown format", async () => {
      const result = await listCustomers.handler(
        {
          limit: 3,
          offset: 0,
          response_format: "markdown",
          active_only: true
        },
        qbClient
      );

      expect(result.content[0].text).toContain("# QuickBooks Customers");
      expect(result.content[0].text).toContain("Found");
      console.log("\n📝 Markdown output sample:");
      console.log(result.content[0].text.substring(0, 300) + "...");
    }, 30000);

    it("should search for customers by name", async () => {
      // First get all customers to know what to search for
      const allResult = await listCustomers.handler(
        { limit: 1, offset: 0, response_format: "json", active_only: true },
        qbClient
      );

      const allCustomers = JSON.parse(allResult.content[0].text);

      if (allCustomers.length > 0) {
        const searchTerm = allCustomers[0].DisplayName.substring(0, 3);

        const searchResult = await listCustomers.handler(
          {
            limit: 10,
            offset: 0,
            response_format: "json",
            active_only: true,
            search: searchTerm
          },
          qbClient
        );

        const foundCustomers = JSON.parse(searchResult.content[0].text);
        console.log(`\n🔍 Searched for "${searchTerm}", found ${foundCustomers.length} customers`);

        expect(foundCustomers.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe("Invoice Tools", () => {
    it("should list invoices from real QuickBooks API", async () => {
      const result = await listInvoices.handler(
        {
          limit: 5,
          offset: 0,
          response_format: "json",
          status: "all"
        },
        qbClient
      );

      expect(result).toBeDefined();
      const invoices = JSON.parse(result.content[0].text);
      console.log(`\n📄 Found ${invoices.length} invoices`);

      if (invoices.length > 0) {
        console.log("💰 Sample invoice:", {
          Id: invoices[0].Id,
          DocNumber: invoices[0].DocNumber,
          TotalAmt: invoices[0].TotalAmt,
          Balance: invoices[0].Balance
        });

        expect(invoices[0]).toHaveProperty("Id");
        expect(invoices[0]).toHaveProperty("TotalAmt");
      }
    }, 30000);

    it("should filter invoices by status", async () => {
      const openResult = await listInvoices.handler(
        {
          limit: 10,
          offset: 0,
          response_format: "json",
          status: "open"
        },
        qbClient
      );

      const openInvoices = JSON.parse(openResult.content[0].text);
      console.log(`\n💵 Found ${openInvoices.length} open invoices`);

      // All open invoices should have Balance > 0
      openInvoices.forEach((inv: any) => {
        expect(inv.Balance).toBeGreaterThan(0);
      });
    }, 30000);
  });

  describe("Account Tools", () => {
    it("should list accounts from real QuickBooks API", async () => {
      const result = await listAccounts.handler(
        {
          account_type: "all",
          response_format: "json"
        },
        qbClient
      );

      const accounts = JSON.parse(result.content[0].text);
      console.log(`\n🏦 Found ${accounts.length} accounts`);

      if (accounts.length > 0) {
        console.log("💳 Sample account:", {
          Id: accounts[0].Id,
          Name: accounts[0].Name,
          AccountType: accounts[0].AccountType,
          CurrentBalance: accounts[0].CurrentBalance
        });

        expect(accounts[0]).toHaveProperty("Id");
        expect(accounts[0]).toHaveProperty("Name");
        expect(accounts[0]).toHaveProperty("AccountType");
      }
    }, 30000);

    it("should filter accounts by type", async () => {
      const result = await listAccounts.handler(
        {
          account_type: "Bank",
          response_format: "json"
        },
        qbClient
      );

      const accounts = JSON.parse(result.content[0].text);
      console.log(`\n🏦 Found ${accounts.length} Bank accounts`);

      // All should be Bank type
      accounts.forEach((acc: any) => {
        expect(acc.AccountType).toBe("Bank");
      });
    }, 30000);
  });

  describe("Vendor Tools", () => {
    it("should list vendors from real QuickBooks API", async () => {
      const result = await listVendors.handler(
        {
          limit: 5,
          offset: 0,
          response_format: "json",
          active_only: true
        },
        qbClient
      );

      const vendors = JSON.parse(result.content[0].text);
      console.log(`\n👥 Found ${vendors.length} vendors`);

      if (vendors.length > 0) {
        console.log("🏢 Sample vendor:", {
          Id: vendors[0].Id,
          DisplayName: vendors[0].DisplayName,
          Balance: vendors[0].Balance
        });

        expect(vendors[0]).toHaveProperty("Id");
        expect(vendors[0]).toHaveProperty("DisplayName");
      }
    }, 30000);
  });

  describe("Bill Tools", () => {
    it("should list bills from real QuickBooks API", async () => {
      const result = await listBills.handler(
        {
          limit: 5,
          offset: 0,
          response_format: "json",
          status: "all"
        },
        qbClient
      );

      const bills = JSON.parse(result.content[0].text);
      console.log(`\n📑 Found ${bills.length} bills`);

      if (bills.length > 0) {
        console.log("💸 Sample bill:", {
          Id: bills[0].Id,
          TotalAmt: bills[0].TotalAmt,
          Balance: bills[0].Balance
        });
      }
    }, 30000);
  });

  describe("Report Tools", () => {
    it("should get profit & loss report from real QuickBooks API", async () => {
      const startDate = "2024-01-01";
      const endDate = "2024-12-31";

      const result = await getProfitLoss.handler(
        {
          start_date: startDate,
          end_date: endDate,
          response_format: "json"
        },
        qbClient
      );

      const report = JSON.parse(result.content[0].text);
      console.log("\n📊 Profit & Loss Report:");
      console.log(`  Total Income: $${report.totalIncome?.toFixed(2) || 0}`);
      console.log(`  Total Expenses: $${report.totalExpenses?.toFixed(2) || 0}`);
      console.log(`  Net Income: $${report.netIncome?.toFixed(2) || 0}`);

      expect(report).toHaveProperty("totalIncome");
      expect(report).toHaveProperty("totalExpenses");
      expect(report).toHaveProperty("netIncome");
    }, 30000);
  });

  describe("Error Handling", () => {
    it("should handle invalid date ranges gracefully", async () => {
      const result = await getProfitLoss.handler(
        {
          start_date: "2024-12-31",
          end_date: "2024-01-01", // End before start
          response_format: "json"
        },
        qbClient
      );

      // Should either return error or empty report
      expect(result).toBeDefined();
      console.log("\n⚠️  Invalid date range handled:", result.isError ? "Error" : "Success");
    }, 30000);
  });
});

// Always show this message when tests are skipped
if (!runTests) {
  describe.skip("QuickBooks API Tests (Skipped)", () => {
    it("To run real API tests, set RUN_API_TESTS=true", () => {
      console.log("\n💡 To run real QuickBooks API integration tests:");
      console.log("   RUN_API_TESTS=true npm test -- tests/integration/api-real.test.ts\n");
    });
  });
}
