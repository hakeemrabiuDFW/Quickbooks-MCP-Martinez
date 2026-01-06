# QuickBooks Online Entity Reference

Quick reference for common QuickBooks Online entities and their fields.

## Customer

**Entity Name**: `Customer`

**Common Fields**:
```typescript
{
  Id: string                    // Unique identifier
  DisplayName: string           // Customer name
  CompanyName?: string          // Company name (if business)
  GivenName?: string           // First name
  FamilyName?: string          // Last name
  PrimaryEmailAddr?: {
    Address: string
  }
  PrimaryPhone?: {
    FreeFormNumber: string
  }
  BillAddr?: {                 // Billing address
    Line1: string
    City: string
    CountrySubDivisionCode: string  // State
    PostalCode: string
  }
  Balance: number              // Current balance owed
  Active: boolean              // Active status
  Taxable: boolean             // Subject to sales tax
  Notes?: string               // Internal notes
}
```

**Query Examples**:
```sql
SELECT * FROM Customer WHERE Active = true
SELECT * FROM Customer WHERE DisplayName LIKE '%Martinez%'
SELECT * FROM Customer WHERE Balance > '0'
```

## Invoice

**Entity Name**: `Invoice`

**Common Fields**:
```typescript
{
  Id: string
  DocNumber: string            // Invoice number
  CustomerRef: {
    value: string              // Customer ID
    name: string               // Customer name
  }
  TxnDate: string              // Transaction date (YYYY-MM-DD)
  DueDate: string              // Due date (YYYY-MM-DD)
  TotalAmt: number             // Total amount
  Balance: number              // Unpaid balance
  Line: [{
    Id: string
    Amount: number
    Description?: string
    DetailType: string         // "SalesItemLineDetail"
    SalesItemLineDetail?: {
      ItemRef: { value: string, name: string }
      Qty: number
      UnitPrice: number
    }
  }]
  CustomerMemo?: {
    value: string              // Memo visible to customer
  }
  PrivateNote?: string         // Internal note
  EmailStatus?: string         // "NotSet", "NeedToSend", "EmailSent"
  PrintStatus?: string         // "NotSet", "NeedToPrint", "PrintComplete"
}
```

**Query Examples**:
```sql
SELECT * FROM Invoice WHERE Balance > '0'
SELECT * FROM Invoice WHERE CustomerRef = '123'
SELECT * FROM Invoice WHERE TxnDate >= '2025-01-01'
SELECT * FROM Invoice WHERE DueDate < '2025-01-01' AND Balance > '0'
```

## Bill

**Entity Name**: `Bill`

**Common Fields**:
```typescript
{
  Id: string
  DocNumber?: string           // Bill number
  VendorRef: {
    value: string              // Vendor ID
    name: string               // Vendor name
  }
  TxnDate: string              // Transaction date
  DueDate: string              // Due date
  TotalAmt: number             // Total amount
  Balance: number              // Unpaid balance
  Line: [{
    Id: string
    Amount: number
    Description?: string
    DetailType: string         // "AccountBasedExpenseLineDetail"
    AccountBasedExpenseLineDetail?: {
      AccountRef: { value: string, name: string }
    }
  }]
  PrivateNote?: string
}
```

**Query Examples**:
```sql
SELECT * FROM Bill WHERE Balance > '0'
SELECT * FROM Bill WHERE VendorRef = '456'
SELECT * FROM Bill WHERE DueDate < '2025-01-15' AND Balance > '0'
```

## Vendor

**Entity Name**: `Vendor`

**Common Fields**:
```typescript
{
  Id: string
  DisplayName: string
  CompanyName?: string
  GivenName?: string
  FamilyName?: string
  PrimaryEmailAddr?: {
    Address: string
  }
  PrimaryPhone?: {
    FreeFormNumber: string
  }
  BillAddr?: {                 // Address
    Line1: string
    City: string
    CountrySubDivisionCode: string
    PostalCode: string
  }
  Balance: number              // Amount owed to vendor
  Active: boolean
  Vendor1099: boolean          // 1099 contractor
  AcctNum?: string             // Account number
}
```

**Query Examples**:
```sql
SELECT * FROM Vendor WHERE Active = true
SELECT * FROM Vendor WHERE DisplayName LIKE '%Supply%'
SELECT * FROM Vendor WHERE Vendor1099 = true
```

## Account

**Entity Name**: `Account`

**Common Fields**:
```typescript
{
  Id: string
  Name: string                 // Account name
  AcctNum?: string             // Account number
  AccountType: string          // See types below
  AccountSubType: string       // More specific classification
  CurrentBalance: number       // Current balance
  Active: boolean
  Classification: string       // "Asset", "Liability", "Equity", "Revenue", "Expense"
  Description?: string
}
```

**Account Types**:
- `Bank`
- `Accounts Receivable`
- `Other Current Asset`
- `Fixed Asset`
- `Accounts Payable`
- `Credit Card`
- `Other Current Liability`
- `Long Term Liability`
- `Equity`
- `Income`
- `Cost of Goods Sold`
- `Expense`
- `Other Income`
- `Other Expense`

**Query Examples**:
```sql
SELECT * FROM Account WHERE Active = true
SELECT * FROM Account WHERE AccountType = 'Bank'
SELECT * FROM Account WHERE Classification = 'Expense'
```

## Payment

**Entity Name**: `Payment`

**Common Fields**:
```typescript
{
  Id: string
  CustomerRef: {
    value: string
    name: string
  }
  TxnDate: string              // Payment date
  TotalAmt: number             // Payment amount
  UnappliedAmt: number         // Unapplied amount
  Line: [{
    Amount: number
    LinkedTxn: [{              // Linked invoices
      TxnId: string
      TxnType: string          // "Invoice"
    }]
  }]
  PaymentMethodRef?: {
    value: string
    name: string               // "Cash", "Check", "Credit Card", etc.
  }
  DepositToAccountRef?: {
    value: string
    name: string
  }
}
```

## Item

**Entity Name**: `Item`

**Common Fields**:
```typescript
{
  Id: string
  Name: string                 // Item name
  Type: string                 // "Service", "Inventory", "NonInventory"
  Active: boolean
  Description?: string         // Sales description
  UnitPrice?: number           // Default price
  IncomeAccountRef?: {         // Revenue account
    value: string
    name: string
  }
  ExpenseAccountRef?: {        // Expense account (for inventory)
    value: string
    name: string
  }
  QtyOnHand?: number           // For inventory items
}
```

## Estimate

**Entity Name**: `Estimate`

**Common Fields**:
```typescript
{
  Id: string
  DocNumber: string
  CustomerRef: {
    value: string
    name: string
  }
  TxnDate: string
  ExpirationDate?: string
  TotalAmt: number
  Line: [{
    Id: string
    Amount: number
    Description?: string
    DetailType: string
    SalesItemLineDetail?: {
      ItemRef: { value: string, name: string }
      Qty: number
      UnitPrice: number
    }
  }]
  EmailStatus?: string
  PrintStatus?: string
  TxnStatus?: string           // "Accepted", "Closed", "Pending", "Rejected"
}
```

## Common Query Patterns

### Pagination
```sql
SELECT * FROM Customer STARTPOSITION 1 MAXRESULTS 100
SELECT * FROM Invoice STARTPOSITION 101 MAXRESULTS 100
```

### Date Filtering
```sql
SELECT * FROM Invoice WHERE TxnDate >= '2025-01-01' AND TxnDate <= '2025-12-31'
SELECT * FROM Bill WHERE DueDate < '2025-01-15'
```

### Status Filtering
```sql
-- Unpaid invoices
SELECT * FROM Invoice WHERE Balance > '0'

-- Paid invoices
SELECT * FROM Invoice WHERE Balance = '0'

-- Overdue invoices
SELECT * FROM Invoice WHERE DueDate < '2025-01-01' AND Balance > '0'
```

### Reference Filtering
```sql
SELECT * FROM Invoice WHERE CustomerRef = '123'
SELECT * FROM Bill WHERE VendorRef = '456'
```

### Search Patterns
```sql
SELECT * FROM Customer WHERE DisplayName LIKE '%Martinez%'
SELECT * FROM Vendor WHERE CompanyName LIKE '%Supply%'
```

### Active/Inactive
```sql
SELECT * FROM Customer WHERE Active = true
SELECT * FROM Account WHERE Active = false
```

## Reports

### Profit & Loss
**Endpoint**: `/reports/ProfitAndLoss`

**Parameters**:
- `start_date` (YYYY-MM-DD)
- `end_date` (YYYY-MM-DD)
- `accounting_method` (optional: "Cash" or "Accrual")

**Response Structure**:
```typescript
{
  Header: {
    ReportName: string
    StartPeriod: string
    EndPeriod: string
  }
  Rows: {
    Row: [{
      type: string              // "Section", "Data"
      group: string             // "Income", "COGS", "Expenses"
      Summary: {
        ColData: [{
          value: string         // Amount
        }]
      }
    }]
  }
}
```

### Balance Sheet
**Endpoint**: `/reports/BalanceSheet`

### AR Aging Summary
**Endpoint**: `/reports/AgedReceivables`

### AP Aging Summary
**Endpoint**: `/reports/AgedPayables`

## Rate Limits

- **Sandbox**: 100 requests/minute per company
- **Production**: 500 requests/minute per company
- **Daily**: No daily limit

## Best Practices

1. **Use STARTPOSITION/MAXRESULTS** for large datasets
2. **Filter at query level** instead of client-side
3. **Cache frequently accessed data** (customers, items, accounts)
4. **Use specific fields** when possible (reduce data transfer)
5. **Batch operations** when creating multiple entities
6. **Handle rate limits** with exponential backoff

## Error Codes

- `401` - Authentication failed (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `429` - Rate limit exceeded
- `500` - QuickBooks server error
- `3200` - Invalid query syntax
- `610` - Object not found
- `6000` - Stale object (version mismatch on update)
