/**
 * Shared type definitions for QuickBooks MCP Server
 */

export interface QBConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  companyId: string;
  environment: "sandbox" | "production";
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface QBRef {
  value: string;
  name?: string;
}

export interface QBEmailAddress {
  Address: string;
}

export interface QBPhoneNumber {
  FreeFormNumber: string;
}

export interface QBCustomer {
  Id: string;
  DisplayName: string;
  PrimaryEmailAddr?: QBEmailAddress;
  PrimaryPhone?: QBPhoneNumber;
  Balance?: number;
  Active: boolean;
}

export interface QBInvoice {
  Id: string;
  DocNumber?: string;
  CustomerRef?: QBRef;
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  Line?: Array<{
    Description?: string;
    Amount?: number;
    DetailType: string;
  }>;
}

export interface QBAccount {
  Id: string;
  Name: string;
  AccountType?: string;
  CurrentBalance?: number;
  Active: boolean;
}

export interface QBVendor {
  Id: string;
  DisplayName: string;
  PrimaryEmailAddr?: QBEmailAddress;
  PrimaryPhone?: QBPhoneNumber;
  Balance?: number;
  Active: boolean;
}

export interface QBBill {
  Id: string;
  DocNumber?: string;
  VendorRef?: QBRef;
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
}

export interface ProfitLossReport {
  totalIncome: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netIncome: number;
  details?: Record<string, number>;
}

export class QuickBooksError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'QuickBooksError';
  }
}
