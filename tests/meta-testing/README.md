# Meta Testing Framework

## Overview
Meta testing simulates 3 different chat scenarios to comprehensively test the QuickBooks MCP server from different user perspectives and use cases.

## Test Scenarios

### Chat 1: Accountant Workflow
**Persona**: Martinez Cleaning LLC accountant preparing month-end reports
**Focus**: Financial reporting, reconciliation, data accuracy
**Tools Used**: All query tools, P&L reports, account balances

### Chat 2: Operations Manager Workflow
**Persona**: Operations manager handling billing and vendor payments
**Focus**: Invoice creation, customer management, bill tracking
**Tools Used**: Invoice creation, customer queries, bill management

### Chat 3: Business Owner Workflow
**Persona**: Business owner reviewing business health and outstanding items
**Focus**: High-level overview, cash flow, AR/AP aging
**Tools Used**: All tools with filters, status queries, summary reports

## Test Structure

```
tests/meta-testing/
├── README.md                    # This file
├── scenarios/
│   ├── chat1-accountant.json    # Accountant test conversation
│   ├── chat2-operations.json    # Operations manager conversation
│   └── chat3-owner.json         # Business owner conversation
├── expected-results/
│   ├── chat1-expected.json
│   ├── chat2-expected.json
│   └── chat3-expected.json
├── run-meta-tests.ts            # Test runner
└── test-reporter.ts             # Results aggregation

```

## Running Meta Tests

```bash
# Run all 3 chat scenarios
npm run test:meta

# Run specific scenario
npm run test:meta:chat1
npm run test:meta:chat2
npm run test:meta:chat3

# Run in parallel (stress test)
npm run test:meta:parallel
```

## Success Criteria

Each chat scenario must:
1. ✅ Complete all tool calls without errors
2. ✅ Return valid JSON responses
3. ✅ Match expected data structure
4. ✅ Complete within performance thresholds
5. ✅ Handle edge cases gracefully

## Metrics Tracked

- Response time per tool
- Success/failure rate
- Data accuracy validation
- Concurrent request handling
- Memory usage
- Token/session management
