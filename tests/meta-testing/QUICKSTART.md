# Meta Testing - Quick Start Guide

## What is Meta Testing?

Meta testing simulates **3 different chat conversations** to comprehensively test the QuickBooks MCP server from different user perspectives:

1. **Chat 1 - Accountant**: Month-end financial reporting workflow
2. **Chat 2 - Operations Manager**: Daily billing and vendor management
3. **Chat 3 - Business Owner**: Executive overview and business health metrics

## Prerequisites

```bash
# 1. Build the project
npm run build

# 2. Ensure you have QuickBooks credentials in .env
cp .env.example .env
# Edit .env with your credentials
```

## Running Tests

### Run All 3 Chat Scenarios (Sequential)
```bash
npm run test:meta
```

This will:
- ✅ Start the MCP server
- ✅ Execute Chat 1 (Accountant workflow)
- ✅ Execute Chat 2 (Operations workflow)
- ✅ Execute Chat 3 (Owner workflow)
- ✅ Generate comprehensive report
- ✅ Stop the server

### Run Individual Scenarios

```bash
# Test accountant workflow only
npm run test:meta:chat1

# Test operations workflow only
npm run test:meta:chat2

# Test business owner workflow only
npm run test:meta:chat3
```

### Run All in Parallel (Stress Test)
```bash
npm run test:meta:parallel
```

This tests concurrent request handling.

## Understanding the Output

### During Execution
```
🚀 Starting QuickBooks MCP Server...
✅ Server started successfully

============================================================
📋 Running: chat1-accountant
👤 Persona: Martinez Cleaning LLC Accountant
📝 Month-end closing workflow
============================================================

🔹 Step 1: Show me the profit and loss statement
   🔧 Calling: qbo_profit_loss_report
   📥 Params: { start_date: "2025-12-01", end_date: "2025-12-31" }
   ✅ Success (1234ms)

🔹 Step 2: What's the current balance in bank accounts?
   🔧 Calling: qbo_list_accounts
   📥 Params: { account_type: "Bank" }
   ✅ Success (567ms)
```

### Final Summary
```
============================================================
📊 META TESTING SUMMARY
============================================================

✅ PASS - chat1-accountant
   Duration: 8234ms
   Steps: 5/5
   Tools: 5/5 successful
   Avg Response: 1646ms

✅ PASS - chat2-operations
   Duration: 12456ms
   Steps: 6/6
   Tools: 6/6 successful
   Avg Response: 2076ms

✅ PASS - chat3-owner
   Duration: 15234ms
   Steps: 7/7
   Tools: 7/7 successful
   Avg Response: 2176ms

============================================================
Total: 3/3 scenarios passed
============================================================

📄 Detailed report saved: tests/meta-testing/results/meta-test-1234567890.json
```

## Scenario Details

### Chat 1: Accountant (5 steps)
1. Generate P&L report for December 2025
2. Check bank account balances
3. List all unpaid invoices (AR)
4. List all unpaid bills (AP)
5. View full chart of accounts

**Focus**: Financial accuracy, reporting, reconciliation

### Chat 2: Operations Manager (6 steps)
1. Search for a customer
2. Create an invoice for services
3. Review invoices created this month
4. List active vendors
5. Check bills due in 30 days
6. Find customers with outstanding balances

**Focus**: Daily operations, invoice creation, vendor management

### Chat 3: Business Owner (7 steps)
1. Q4 2025 P&L report
2. Total cash in bank
3. Top customers by balance
4. Total accounts receivable
5. Total accounts payable
6. Expense account breakdown
7. Year-to-date P&L for 2026

**Focus**: High-level metrics, cash flow, business health

## Success Criteria

Each scenario passes if:
- ✅ All tool calls succeed
- ✅ Responses contain expected data
- ✅ Response times are under thresholds
- ✅ Data validation passes
- ✅ No errors or exceptions

## Troubleshooting

### Server won't start
```bash
# Make sure dist/ is built
npm run build

# Check if port 3000 is available
lsof -ti:3000

# Verify .env has correct credentials
cat .env
```

### Tool calls failing
```bash
# Check QuickBooks API credentials
# Verify sandbox/production environment setting
# Check internet connectivity
# Review QuickBooks API rate limits
```

### Tests timing out
```bash
# Increase timeout in run-meta-tests.ts
# Check QuickBooks API response times
# Verify network latency
```

## Customizing Scenarios

Edit scenario files in `tests/meta-testing/scenarios/`:

```json
{
  "step": 1,
  "user_message": "Your question here",
  "tool_calls": [{
    "tool": "qbo_list_customers",
    "params": {
      "limit": 100,
      "active_only": true
    }
  }],
  "validation": {
    "should_contain": ["DisplayName", "Balance"],
    "response_type": "json"
  }
}
```

## Viewing Detailed Results

Results are saved in JSON format:

```bash
# View latest results
cat tests/meta-testing/results/meta-test-*.json | jq .

# See summary only
cat tests/meta-testing/results/meta-test-*.json | jq '.summary'

# See specific scenario results
cat tests/meta-testing/results/meta-test-*.json | jq '.results[] | select(.scenario == "chat1-accountant")'
```

## Next Steps

After meta testing passes:
1. ✅ All 7 tools work correctly
2. ✅ Server handles different workflows
3. ✅ Response times are acceptable
4. ✅ Data validation works

Ready for:
- Production deployment
- User acceptance testing
- Performance optimization
- Adding more tools

## Questions?

See:
- [CLAUDE.md](../../CLAUDE.md) - Project overview
- [SKILL.md](../../.claude/skills/quickbooks-mcp/SKILL.md) - Development guide
- [README.md](../../README.md) - Setup instructions
