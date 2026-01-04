# QuickBooks Online MCP Server

A Model Context Protocol (MCP) server for QuickBooks Online integration, enabling AI assistants like Claude to query and manage QuickBooks data through natural language.

## Features

- **Customers**: List, search, and view customer details
- **Invoices**: Create and list invoices with filtering
- **Bills**: Track vendor bills and payables
- **Vendors**: Manage supplier information
- **Accounts**: View chart of accounts
- **Reports**: Generate Profit & Loss reports

## Prerequisites

- Node.js 18+
- QuickBooks Online account
- Intuit Developer account with OAuth app

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/hakeemrabiuDFW/quickbooks-mcp-server.git
cd quickbooks-mcp-server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your QuickBooks credentials:

```env
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REFRESH_TOKEN=your_refresh_token
QUICKBOOKS_COMPANY_ID=your_company_id
QUICKBOOKS_ENVIRONMENT=production
```

### 4. Build and run

```bash
npm run build
npm start
```

## Getting QuickBooks Credentials

### Step 1: Create Developer Account

1. Go to [developer.intuit.com](https://developer.intuit.com)
2. Sign in or create account
3. Create a new app (select QuickBooks Online API)

### Step 2: Get Client Credentials

1. In your app dashboard, find Client ID and Client Secret
2. Add OAuth redirect URI: `http://localhost:3000/callback`

### Step 3: Get Refresh Token

1. Use the OAuth Playground in Intuit Developer portal
2. Or use a tool like [qbo-oauth-tool](https://github.com/IntuitDeveloper/oauth2-csharp)
3. Complete OAuth flow to get refresh token

### Step 4: Find Company ID (Realm ID)

1. Log into QuickBooks Online
2. Company ID is in the URL: `https://qbo.intuit.com/app/...?realmId=COMPANY_ID`

## Claude Desktop Configuration

Add to your Claude Desktop config (`~/.config/claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "quickbooks": {
      "command": "node",
      "args": ["/path/to/quickbooks-mcp-server/dist/index.js"],
      "env": {
        "QUICKBOOKS_CLIENT_ID": "your_client_id",
        "QUICKBOOKS_CLIENT_SECRET": "your_client_secret",
        "QUICKBOOKS_REFRESH_TOKEN": "your_refresh_token",
        "QUICKBOOKS_COMPANY_ID": "your_company_id",
        "QUICKBOOKS_ENVIRONMENT": "production"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `qbo_list_customers` | List customers with optional filtering |
| `qbo_list_invoices` | List invoices by customer, status, or date |
| `qbo_create_invoice` | Create a new invoice |
| `qbo_list_accounts` | View chart of accounts |
| `qbo_profit_loss_report` | Generate P&L report |
| `qbo_list_vendors` | List vendor/suppliers |
| `qbo_list_bills` | List bills/payables |

## Example Usage

Once connected to Claude:

```
"Show me all open invoices"
"Create an invoice for customer ID 123 with a $500 cleaning service charge"
"Get the profit and loss report for Q4 2025"
"List all unpaid bills"
```

## HTTP Transport

To run as HTTP server instead of stdio:

```bash
TRANSPORT=http PORT=3000 npm start
```

## Railway Deployment

Deploy to Railway with one click or via CLI:

### Option 1: Railway Dashboard

1. Fork this repository
2. Go to [Railway](https://railway.app) and create a new project
3. Select "Deploy from GitHub repo"
4. Add environment variables in Railway dashboard:
   - `QUICKBOOKS_CLIENT_ID`
   - `QUICKBOOKS_CLIENT_SECRET`
   - `QUICKBOOKS_REFRESH_TOKEN`
   - `QUICKBOOKS_COMPANY_ID`
   - `QUICKBOOKS_ENVIRONMENT=production`
5. Railway will auto-deploy using the included Dockerfile

### Option 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### MCP Endpoint

Once deployed, your MCP endpoint will be:
```
https://your-app.railway.app/mcp
```

Health check available at:
```
https://your-app.railway.app/health
```

## Docker Deployment (Local)

```bash
docker build -t quickbooks-mcp .
docker run -p 3000:3000 --env-file .env quickbooks-mcp
```

## License

MIT

## Author

Hakeem Rabiu - Martinez Cleaning LLC

## Links

- [QuickBooks API Docs](https://developer.intuit.com/app/developer/qbo/docs/develop)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Tanda MCP Server](https://github.com/hakeemrabiuDFW/Tanda-Workforce-MCP-Server)
