/**
 * Simple Direct Test - QuickBooks MCP Tools
 * Tests actual API calls without complex test framework
 */

import { QuickBooksClient } from '../../src/auth/oauth.js';
import type { QBConfig } from '../../src/types.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new QuickBooksClient({
  clientId: process.env.QUICKBOOKS_CLIENT_ID || "",
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || "",
  refreshToken: process.env.QUICKBOOKS_REFRESH_TOKEN || "",
  companyId: process.env.QUICKBOOKS_COMPANY_ID || "",
  environment: (process.env.QUICKBOOKS_ENVIRONMENT as "sandbox" | "production") || "sandbox"
} as QBConfig);

async function runTests() {
  console.log('\n🧪 QuickBooks MCP - Direct API Tests\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  // Test 1: List Customers
  try {
    console.log('\n✅ Test 1: List Customers');
    const customers = await client.queryCustomers({ limit: 5 });
    console.log(`   Found ${customers.length} customers`);
    if (customers.length > 0) {
      console.log(`   Sample: ${customers[0].DisplayName}`);
    }
    passed++;
  } catch (error: any) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    failed++;
  }

  // Test 2: List Invoices
  try {
    console.log('\n✅ Test 2: List Invoices');
    const invoices = await client.queryInvoices({ limit: 5, status: 'all' });
    console.log(`   Found ${invoices.length} invoices`);
    if (invoices.length > 0) {
      console.log(`   Sample: Invoice #${invoices[0].DocNumber} - $${invoices[0].TotalAmt}`);
    }
    passed++;
  } catch (error: any) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    failed++;
  }

  // Test 3: List Accounts
  try {
    console.log('\n✅ Test 3: List Accounts');
    const accounts = await client.queryAccounts({ accountType: 'Bank' });
    console.log(`   Found ${accounts.length} bank accounts`);
    if (accounts.length > 0) {
      console.log(`   Sample: ${accounts[0].Name} - $${accounts[0].CurrentBalance?.toFixed(2)}`);
    }
    passed++;
  } catch (error: any) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    failed++;
  }

  // Test 4: List Vendors
  try {
    console.log('\n✅ Test 4: List Vendors');
    const vendors = await client.queryVendors({ limit: 5 });
    console.log(`   Found ${vendors.length} vendors`);
    if (vendors.length > 0) {
      console.log(`   Sample: ${vendors[0].DisplayName}`);
    }
    passed++;
  } catch (error: any) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    failed++;
  }

  // Test 5: List Bills
  try {
    console.log('\n✅ Test 5: List Bills');
    const bills = await client.queryBills({ limit: 5, status: 'all' });
    console.log(`   Found ${bills.length} bills`);
    if (bills.length > 0) {
      console.log(`   Sample: Bill #${bills[0].DocNumber || bills[0].Id} - $${bills[0].TotalAmt}`);
    }
    passed++;
  } catch (error: any) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    failed++;
  }

  // Test 6: P&L Report
  try {
    console.log('\n✅ Test 6: Profit & Loss Report');
    const report = await client.getProfitAndLossReport('2026-01-01', '2026-01-31');
    console.log(`   Total Income: $${report.totalIncome.toFixed(2)}`);
    console.log(`   Total Expenses: $${report.totalExpenses.toFixed(2)}`);
    console.log(`   Net Income: $${report.netIncome.toFixed(2)}`);
    passed++;
  } catch (error: any) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passed}/${passed + failed} tests passed`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
