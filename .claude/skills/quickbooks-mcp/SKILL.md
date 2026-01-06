---
name: quickbooks-mcp
description: Build and extend QuickBooks Online MCP server tools. Use when adding QBO tools, fixing OAuth issues, or deploying to Railway.
---

# QuickBooks MCP Development

## When to Use This Skill
Use this skill when:
- Adding new QuickBooks API tools
- Modifying existing tool schemas or handlers
- Debugging OAuth authentication issues
- Deploying to Railway or configuring Docker
- Understanding QuickBooks entity relationships

## Tool Development Pattern

All tools follow this structure in `src/tools/*.ts`:

```typescript
import { z } from "zod";
import type { QuickBooksClient } from "../auth/oauth.js";

// Define input schema with Zod
const InputSchema = z.object({
  param_name: z.string().describe("Clear description for Claude"),
  limit: z.number().int().min(1).max(1000).default(100)
}).strict();

// Export tool object
export const toolName = {
  name: 'qbo_tool_name',
  description: {
    title: 'Human-Readable Tool Title',
    description: `Detailed description explaining:
- What the tool does
- Available parameters
- Return value structure
- Example use cases`,
    inputSchema: InputSchema,
    annotations: {
      readOnlyHint: true,        // true if no data modification
      destructiveHint: false,     // true if deletes/destroys data
      idempotentHint: true,       // true if same input = same output
      openWorldHint: true         // true if accesses external systems
    }
  },
  handler: async (params: z.infer<typeof InputSchema>, client: QuickBooksClient) => {
    try {
      // Call QuickBooks API via client
      const result = await client.queryCustomers({
        limit: params.limit
      });

      // Return MCP-compliant response
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true
      };
    }
  }
};
```

## Adding a New Tool

### Step 1: Create Tool File
Create `src/tools/your-tool.ts` with the pattern above.

### Step 2: Register in Index
Add to `src/index.ts`:
```typescript
import { yourTool } from "./tools/your-tool.js";

const tools = [
  // ... existing tools
  yourTool
];
```

### Step 3: Add Types (if needed)
If introducing new QuickBooks entities, add interfaces to `src/types.ts`:
```typescript
export interface QBNewEntity {
  Id: string;
  DisplayName: string;
  // ... other fields
}
```

### Step 4: Extend OAuth Client (if needed)
Add methods to `src/auth/oauth.ts`:
```typescript
async queryNewEntity(options: { limit?: number }): Promise<QBNewEntity[]> {
  return this.query<QBNewEntity>("NewEntity", undefined, options.limit || 100);
}
```

## QuickBooks API Query Patterns

### Basic Query
```typescript
const customers = await client.query<QBCustomer>(
  "Customer",           // Entity type
  "Active = true",      // WHERE clause
  100,                  // Limit
  0                     // Offset
);
```

### Common WHERE Clauses
```typescript
// Active entities
"Active = true"

// Search by name
"DisplayName LIKE '%search%'"

// Date range
"TxnDate >= '2025-01-01' AND TxnDate <= '2025-12-31'"

// Status filters
"Balance > '0'"  // Unpaid
"Balance = '0'"  // Paid

// Reference filter
"CustomerRef = '123'"
```

### Entity Types
- `Customer` - Customers
- `Invoice` - Sales invoices
- `Bill` - Purchase bills
- `Vendor` - Suppliers
- `Account` - Chart of accounts
- `Payment` - Customer payments
- `BillPayment` - Vendor payments
- `Item` - Products/services
- `Estimate` - Sales quotes
- `SalesReceipt` - Direct sales

## OAuth Client Methods

The `QuickBooksClient` provides these methods:

### Customers
- `queryCustomers(options)` - List customers with filters
- `getCustomer(id)` - Get single customer

### Invoices
- `queryInvoices(options)` - List invoices with filters
- `createInvoice(data)` - Create new invoice

### Vendors
- `queryVendors(options)` - List vendors

### Bills
- `queryBills(options)` - List bills

### Accounts
- `queryAccounts(options)` - List chart of accounts

### Reports
- `getProfitAndLossReport(startDate, endDate)` - P&L report

## Response Formatting

Tools support two output formats via `response_format` parameter:

### JSON Format
```typescript
if (params.response_format === "json") {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
  };
}
```

### Markdown Format
```typescript
const lines = ["# QuickBooks Customers\n"];
lines.push(`Found ${customers.length} customers\n`);

for (const c of customers) {
  lines.push(`## ${c.DisplayName}`);
  lines.push(`- **ID:** ${c.Id}`);
  lines.push(`- **Balance:** $${(c.Balance || 0).toFixed(2)}\n`);
}

return { content: [{ type: "text", text: lines.join("\n") }] };
```

## Testing Locally

### Stdio Mode (Claude Desktop)
```bash
npm run build
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```

### HTTP Mode (Railway/Web)
```bash
TRANSPORT=http PORT=3000 npm start

# Test health endpoint
curl http://localhost:3000/health

# Test MCP endpoint
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Common Issues

### Token Refresh Failures
- Check `QUICKBOOKS_CLIENT_ID` and `QUICKBOOKS_CLIENT_SECRET`
- Verify refresh token is valid (tokens expire after 100 days of inactivity)
- Check network connectivity to `oauth.platform.intuit.com`

### Rate Limiting
- QuickBooks allows 500 requests/minute
- Implement exponential backoff in `oauth.ts`
- Cache frequently accessed data

### Query Syntax Errors
- Use single quotes for values: `DisplayName = 'ABC Corp'`
- Date format: `YYYY-MM-DD`
- Boolean values: `true` or `false` (lowercase)

## Railway Deployment

### Environment Variables
Set in Railway dashboard:
- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`
- `QUICKBOOKS_REFRESH_TOKEN`
- `QUICKBOOKS_COMPANY_ID`
- `QUICKBOOKS_ENVIRONMENT` (production)
- `TRANSPORT` (http)

### Deploy Commands
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy to staging
railway up --environment staging

# Deploy to production
git push origin main  # Auto-deploys via railway.toml
```

## File Organization

```
src/
├── tools/              # One file per tool or related group
│   ├── customers.ts    # Customer tools
│   ├── invoices.ts     # Invoice tools (list + create)
│   ├── vendors.ts      # Vendor tools
│   ├── bills.ts        # Bill tools
│   ├── accounts.ts     # Account tools
│   └── reports.ts      # Report tools
├── auth/
│   └── oauth.ts        # QuickBooks API client
├── types.ts            # Shared TypeScript interfaces
└── index.ts            # Server setup, tool registration
```

## Best Practices

1. **Error Handling**: Always wrap QuickBooks API calls in try/catch
2. **Type Safety**: Use TypeScript interfaces from `types.ts`
3. **Input Validation**: Use Zod schemas for all parameters
4. **Response Format**: Support both JSON and markdown outputs
5. **Documentation**: Clear descriptions in tool definitions
6. **Idempotency**: Mark tools correctly (read-only vs. write)
7. **Rate Limits**: Respect QuickBooks API limits
8. **Security**: Never log tokens or secrets

## Reference Documentation

- QuickBooks API Explorer: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer
- MCP Protocol Spec: https://modelcontextprotocol.io
- QBO Entity Reference: See `.claude/skills/quickbooks-mcp/references/qbo-entities.md`

## Examples

### Read-Only Query Tool
See: `src/tools/customers.ts` for list pattern

### Create/Write Tool
See: `src/tools/invoices.ts` for create pattern

### Report Tool
See: `src/tools/reports.ts` for report parsing pattern
