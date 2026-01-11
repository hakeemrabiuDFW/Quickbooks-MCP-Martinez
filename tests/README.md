# QuickBooks MCP Server - Test Suite

This directory contains comprehensive tests for the QuickBooks MCP Server.

## Test Structure

```
tests/
├── unit/                          # Unit tests (fast, no API calls)
│   └── tools.test.ts             # Schema validation & mock handlers
├── integration/
│   ├── mcp-protocol.test.ts      # MCP protocol tests (mocked)
│   └── api-real.test.ts          # Real QuickBooks API tests
└── demo.test.ts                   # Demo showing test data
```

## Test Types

### 1. Unit Tests (`tests/unit/`)
**What they test:**
- Zod schema validation
- Input parameter validation
- Default values
- Error rejection (invalid inputs)
- Mock handler responses

**Run with:**
```bash
npm run test:unit
```

**No credentials needed** ✓ Fast (< 5 seconds)

---

### 2. Integration Tests - Mocked (`tests/integration/mcp-protocol.test.ts`)
**What they test:**
- MCP tool registration
- Tool invocation with mock data
- Response format handling (JSON/Markdown)
- Error handling patterns

**Run with:**
```bash
npm run test:integration
```

**No credentials needed** ✓ Fast (< 5 seconds)

---

### 3. Integration Tests - Real API (`tests/integration/api-real.test.ts`)
**What they test:**
- **ACTUAL QuickBooks API calls**
- Real customer data retrieval
- Real invoice queries
- Real account listings
- Real vendor/bill operations
- Real P&L report generation
- Live error handling

**Run with:**
```bash
npm run test:api
```

**⚠️ Requires QuickBooks credentials**
- Needs valid `.env` file
- Uses QuickBooks Sandbox by default
- Slower (API rate limits apply)
- **This is what tests real functionality**

---

## Quick Start

### Run all mock tests (no credentials needed):
```bash
npm test
```

### Run real API tests (requires credentials):
```bash
# 1. Set up your .env file first
cp .env.example .env
# Edit .env with your QuickBooks Sandbox credentials

# 2. Run the API tests
npm run test:api
```

## Environment Setup

For real API testing, create a `.env` file:

```bash
QUICKBOOKS_CLIENT_ID=your_sandbox_client_id
QUICKBOOKS_CLIENT_SECRET=your_sandbox_client_secret
QUICKBOOKS_REFRESH_TOKEN=your_sandbox_refresh_token
QUICKBOOKS_COMPANY_ID=your_sandbox_company_id
QUICKBOOKS_ENVIRONMENT=sandbox
```

**Get sandbox credentials from:** https://developer.intuit.com

## Test Output Examples

### Mock Tests (default):
```
✓ should validate with default values (6 ms)
✓ should handle qbo_list_customers invocation (1 ms)
✓ should handle qbo_create_invoice invocation (2 ms)

Tests: 37 passed, 37 total
```

### Real API Tests:
```
🔧 Testing against QuickBooks: sandbox
📊 Company ID: 1234567890

✓ should list customers from real QuickBooks API (1234 ms)
  ✅ API Response received
  📋 Found 15 customers
  📄 Sample customer: {
    Id: '1',
    DisplayName: 'Acme Corp',
    Balance: 1250.50
  }

✓ should get profit & loss report from real QuickBooks API (2156 ms)
  📊 Profit & Loss Report:
    Total Income: $45000.00
    Total Expenses: $32000.00
    Net Income: $13000.00
```

## CI/CD Usage

### In GitHub Actions / CI:
```yaml
# Run fast tests only (no API credentials)
- name: Run Unit Tests
  run: npm run test:unit

- name: Run Integration Tests (Mocked)
  run: npm run test:integration

# Optional: Run API tests if credentials are available
- name: Run API Tests
  if: ${{ env.QUICKBOOKS_REFRESH_TOKEN }}
  run: npm run test:api
```

## Test Coverage

Run with coverage report:
```bash
npm run test:coverage
```

Generates HTML report in `coverage/` directory.

## Debugging Tests

### Watch mode:
```bash
npm run test:watch
```

### Run specific test:
```bash
npm test -- --testNamePattern="should list customers"
```

### Verbose output:
```bash
npm test -- --verbose
```

### Show console.log output:
```bash
npm test -- --silent=false
```

## Best Practices

1. **Development:** Use mock tests for fast feedback
2. **Pre-commit:** Run `npm test` (all mocked tests)
3. **Before PR:** Run `npm run test:api` (if you have credentials)
4. **CI/CD:** Run mocked tests in pipeline
5. **Nightly/Weekly:** Run API tests against sandbox

## Troubleshooting

### "Tests skipped" message:
Real API tests are skipped by default. Use `npm run test:api` to run them.

### "QuickBooks API error: Invalid credentials":
- Check your `.env` file
- Verify credentials at https://developer.intuit.com
- Ensure `QUICKBOOKS_ENVIRONMENT=sandbox`
- Refresh token may be expired

### Timeout errors:
API tests have 30-second timeouts. QuickBooks API can be slow sometimes. This is normal.

## Summary

| Test Type | Speed | Credentials | Real API | Use Case |
|-----------|-------|-------------|----------|----------|
| Unit | ⚡ Fast | ❌ No | ❌ No | Development |
| Integration (Mock) | ⚡ Fast | ❌ No | ❌ No | CI/CD |
| Integration (Real) | 🐌 Slow | ✅ Yes | ✅ Yes | **Verify actual functionality** |

**The real API tests (`npm run test:api`) are what validate your QuickBooks integration actually works!**
