# QuickBooks MCP Server - Martinez Cleaning LLC

## Purpose
MCP server connecting Claude to QuickBooks Online for Martinez Cleaning LLC financial operations. Enables natural language queries for invoices, bills, customers, vendors, and P&L reports.

## Architecture
```
src/
├── tools/          # Individual tool modules (customers, invoices, bills, vendors, accounts, reports)
├── auth/           # OAuth client and QuickBooks API wrapper
├── types.ts        # Shared TypeScript interfaces
└── index.ts        # MCP server setup and tool registration
```

## Bash Commands
- `npm install` - Install dependencies
- `npm run build` - Compile TypeScript to dist/
- `npm run dev` - Run locally in stdio mode with hot reload
- `npm start` - Run compiled server (stdio mode)
- `TRANSPORT=http npm start` - Run as HTTP server
- `railway up` - Deploy to Railway staging

## Code Conventions
- TypeScript strict mode, ES modules
- Each tool in separate file under src/tools/
- All tools export: `{ name, description, handler }`
- Async/await for all QBO API calls
- Errors: throw new QuickBooksError(message, code)
- Use zod for input validation schemas

## Tool Pattern
Each tool exports: name, description (with inputSchema), handler
```typescript
import { z } from "zod";
import type { QuickBooksClient } from "../auth/oauth.js";

const InputSchema = z.object({
  param: z.string().describe("Description")
}).strict();

export const toolName = {
  name: 'tool_name',
  description: {
    title: 'Tool Title',
    description: 'Clear description for Claude',
    inputSchema: InputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  handler: async (params: z.infer<typeof InputSchema>, client: QuickBooksClient) => {
    const result = await client.queryCustomers({ limit: 100 });
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }]
    };
  }
};
```

## Environment Variables
Required:
- `QUICKBOOKS_CLIENT_ID` - From Intuit Developer Portal
- `QUICKBOOKS_CLIENT_SECRET` - From Intuit Developer Portal
- `QUICKBOOKS_REFRESH_TOKEN` - OAuth refresh token
- `QUICKBOOKS_COMPANY_ID` - QuickBooks realm ID
- `QUICKBOOKS_ENVIRONMENT` - "sandbox" or "production"

Optional:
- `TRANSPORT` - "stdio" (default) or "http"
- `PORT` - HTTP server port (default: 3000)

## Available Tools
### Customers
- `qbo_list_customers` - List customers with search, pagination, active filter

### Invoices
- `qbo_list_invoices` - List invoices by customer, status, date range
- `qbo_create_invoice` - Create new invoice with line items

### Vendors
- `qbo_list_vendors` - List vendors/suppliers

### Bills
- `qbo_list_bills` - List bills by vendor, payment status

### Accounts
- `qbo_list_accounts` - Chart of accounts, filter by account type

### Reports
- `qbo_profit_loss_report` - P&L report for date range

## Integration Points
- **Tanda MCP**: Labor costs feed into expense tracking
- **n8n**: Webhook triggers for invoice automation
- **Claude Desktop**: Stdio transport for local usage
- **Railway**: HTTP transport for cloud deployment

## QuickBooks API Patterns
- Query syntax: `SELECT * FROM Customer WHERE Active = true`
- Rate limit: 500 requests/minute
- Authentication: OAuth 2.0 with refresh token rotation
- Base URLs:
  - Sandbox: `https://sandbox-quickbooks.api.intuit.com`
  - Production: `https://quickbooks.api.intuit.com`

## Development Workflow
1. Make changes to tool files in `src/tools/`
2. Run `npm run dev` to test with hot reload
3. Test with: `echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js`
4. Build: `npm run build`
5. Deploy: `railway up` or push to main branch

## Testing
- Unit tests in `tests/unit/` (Jest)
- Integration tests in `tests/integration/` (require sandbox credentials)
- Test command: `npm test`
- Coverage: `npm run test:coverage`

## Current Sprint
- [ ] Batch invoice creation tool
- [ ] AR aging report
- [ ] Railway production deployment with OAuth callback
- [ ] Add payment tracking tools
- [ ] Expense categorization automation

## Troubleshooting
- **Token expired**: Refresh token automatically rotates, check logs
- **Rate limit**: Implement exponential backoff in oauth.ts
- **Connection refused**: Verify environment variables are set
- **Invalid company ID**: Check realm ID in QuickBooks URL

## Files Structure
```
quickbooks-mcp-martinez/
├── CLAUDE.md                    # This file
├── .claude/
│   └── skills/quickbooks-mcp/
│       ├── SKILL.md             # Skill definition
│       └── references/
│           └── qbo-entities.md  # QBO entity reference
├── src/
│   ├── tools/
│   │   ├── customers.ts
│   │   ├── invoices.ts
│   │   ├── bills.ts
│   │   ├── vendors.ts
│   │   ├── accounts.ts
│   │   └── reports.ts
│   ├── auth/
│   │   └── oauth.ts
│   ├── types.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   └── integration/
├── .env.example
├── Dockerfile
├── railway.toml
├── package.json
└── README.md
```

## Deployment
### Railway
- Auto-deploys from main branch
- Environment variables configured in Railway dashboard
- Health check endpoint: `/health`
- MCP endpoint: `/mcp`

### Docker
- `docker build -t quickbooks-mcp .`
- `docker run -p 3000:3000 --env-file .env quickbooks-mcp`

## Links
- [QuickBooks API Docs](https://developer.intuit.com/app/developer/qbo/docs/develop)
- [MCP Protocol](https://modelcontextprotocol.io)
- [GitHub Repo](https://github.com/hakeemrabiuDFW/quickbooks-mcp-server)
