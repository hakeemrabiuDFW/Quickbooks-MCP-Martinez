/**
 * QuickBooks Online OAuth Client
 *
 * Handles authentication and API requests to QuickBooks Online.
 */

import axios, { AxiosInstance } from "axios";
import type {
  QBConfig,
  TokenResponse,
  QBCustomer,
  QBInvoice,
  QBAccount,
  QBVendor,
  QBBill,
  ProfitLossReport,
  QuickBooksError
} from "../types.js";

export class QuickBooksClient {
  private config: QBConfig;
  private accessToken: string = "";
  private tokenExpiry: Date = new Date(0);
  private api: AxiosInstance;

  constructor(config: QBConfig) {
    this.config = config;

    const baseURL = config.environment === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";

    this.api = axios.create({
      baseURL: `${baseURL}/v3/company/${config.companyId}`,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    // Add auth interceptor
    this.api.interceptors.request.use(async (config) => {
      const token = await this.getAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const tokenURL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");

    const response = await axios.post<TokenResponse>(
      tokenURL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.config.refreshToken
      }).toString(),
      {
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);

    // Update refresh token if new one provided
    if (response.data.refresh_token) {
      this.config.refreshToken = response.data.refresh_token;
    }

    return this.accessToken;
  }

  /**
   * Execute a QuickBooks query
   */
  private async query<T>(entityType: string, whereClause?: string, limit = 100, offset = 0): Promise<T[]> {
    let sql = `SELECT * FROM ${entityType}`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    sql += ` STARTPOSITION ${offset + 1} MAXRESULTS ${limit}`;

    const response = await this.api.get("/query", {
      params: { query: sql }
    });

    const data = response.data.QueryResponse;
    return data[entityType] || [];
  }

  // ==================== CUSTOMER METHODS ====================

  async queryCustomers(options: {
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
    search?: string;
  }): Promise<QBCustomer[]> {
    const conditions: string[] = [];

    if (options.activeOnly !== false) {
      conditions.push("Active = true");
    }

    if (options.search) {
      conditions.push(`DisplayName LIKE '%${options.search}%'`);
    }

    return this.query<QBCustomer>(
      "Customer",
      conditions.length ? conditions.join(" AND ") : undefined,
      options.limit || 100,
      options.offset || 0
    );
  }

  async getCustomer(id: string): Promise<QBCustomer | null> {
    try {
      const response = await this.api.get(`/customer/${id}`);
      return response.data.Customer;
    } catch {
      return null;
    }
  }

  // ==================== INVOICE METHODS ====================

  async queryInvoices(options: {
    limit?: number;
    offset?: number;
    customerId?: string;
    status?: "all" | "open" | "paid" | "overdue";
    startDate?: string;
    endDate?: string;
  }): Promise<QBInvoice[]> {
    const conditions: string[] = [];

    if (options.customerId) {
      conditions.push(`CustomerRef = '${options.customerId}'`);
    }

    if (options.status === "open") {
      conditions.push("Balance > '0'");
    } else if (options.status === "paid") {
      conditions.push("Balance = '0'");
    }

    if (options.startDate) {
      conditions.push(`TxnDate >= '${options.startDate}'`);
    }

    if (options.endDate) {
      conditions.push(`TxnDate <= '${options.endDate}'`);
    }

    return this.query<QBInvoice>(
      "Invoice",
      conditions.length ? conditions.join(" AND ") : undefined,
      options.limit || 100,
      options.offset || 0
    );
  }

  async createInvoice(data: {
    customerId: string;
    lineItems: Array<{ description: string; amount: number; quantity?: number }>;
    dueDate?: string;
    memo?: string;
  }): Promise<QBInvoice> {
    const invoiceData = {
      CustomerRef: { value: data.customerId },
      Line: data.lineItems.map((item, idx) => ({
        Id: String(idx + 1),
        Amount: item.amount * (item.quantity || 1),
        DetailType: "SalesItemLineDetail",
        Description: item.description,
        SalesItemLineDetail: {
          Qty: item.quantity || 1,
          UnitPrice: item.amount
        }
      })),
      ...(data.dueDate && { DueDate: data.dueDate }),
      ...(data.memo && { CustomerMemo: { value: data.memo } })
    };

    const response = await this.api.post("/invoice", invoiceData);
    return response.data.Invoice;
  }

  // ==================== ACCOUNT METHODS ====================

  async queryAccounts(options: {
    accountType?: string;
    limit?: number;
    offset?: number;
  }): Promise<QBAccount[]> {
    const conditions: string[] = ["Active = true"];

    if (options.accountType) {
      conditions.push(`AccountType = '${options.accountType}'`);
    }

    return this.query<QBAccount>(
      "Account",
      conditions.join(" AND "),
      options.limit || 1000,
      options.offset || 0
    );
  }

  // ==================== VENDOR METHODS ====================

  async queryVendors(options: {
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
  }): Promise<QBVendor[]> {
    const conditions: string[] = [];

    if (options.activeOnly !== false) {
      conditions.push("Active = true");
    }

    return this.query<QBVendor>(
      "Vendor",
      conditions.length ? conditions.join(" AND ") : undefined,
      options.limit || 100,
      options.offset || 0
    );
  }

  // ==================== BILL METHODS ====================

  async queryBills(options: {
    limit?: number;
    offset?: number;
    vendorId?: string;
    status?: "all" | "unpaid" | "paid";
  }): Promise<QBBill[]> {
    const conditions: string[] = [];

    if (options.vendorId) {
      conditions.push(`VendorRef = '${options.vendorId}'`);
    }

    if (options.status === "unpaid") {
      conditions.push("Balance > '0'");
    } else if (options.status === "paid") {
      conditions.push("Balance = '0'");
    }

    return this.query<QBBill>(
      "Bill",
      conditions.length ? conditions.join(" AND ") : undefined,
      options.limit || 100,
      options.offset || 0
    );
  }

  // ==================== REPORT METHODS ====================

  async getProfitAndLossReport(startDate: string, endDate: string): Promise<ProfitLossReport> {
    const response = await this.api.get("/reports/ProfitAndLoss", {
      params: {
        start_date: startDate,
        end_date: endDate
      }
    });

    const report = response.data;

    // Parse the report structure
    // QuickBooks reports have a complex nested structure
    const parseAmount = (rows: any[], type: string): number => {
      if (!rows) return 0;
      const row = rows.find((r: any) => r.type === type || r.group === type);
      if (row?.Summary?.ColData?.[1]?.value) {
        return parseFloat(row.Summary.ColData[1].value) || 0;
      }
      return 0;
    };

    const rows = report.Rows?.Row || [];

    return {
      totalIncome: parseAmount(rows, "Income"),
      totalCOGS: parseAmount(rows, "COGS"),
      grossProfit: parseAmount(rows, "GrossProfit"),
      totalExpenses: parseAmount(rows, "Expenses"),
      netIncome: parseAmount(rows, "NetIncome")
    };
  }
}

export type { QBConfig, QBCustomer, QBInvoice, QBAccount, QBVendor, QBBill, ProfitLossReport };
