# QuickBooks OAuth - Getting a Fresh Refresh Token

## 🔑 Your Token Has Expired

QuickBooks refresh tokens expire after **100 days of inactivity** or when revoked.

**Error you're seeing:**
```
{"error":"invalid_grant","error_description":"Token invalid"}
```

---

## ✅ Method 1: Automated Script (Recommended)

I've created an automated OAuth helper script for you.

### Quick Steps:

1. **Make sure your .env has Client ID and Secret:**
   ```bash
   cat .env | grep CLIENT
   ```

   Should show:
   ```
   QUICKBOOKS_CLIENT_ID="ABgTuSF9RXVMhYLyzUBzbKgpBdVLlRtgLmPnBfnfzw"
   QUICKBOOKS_CLIENT_SECRET="VlqYyWkiyZbyetTkRFOuD2eJlMN3FalB8imPxVJc"
   ```

2. **Run the OAuth helper:**
   ```bash
   npm run auth
   ```

3. **What happens:**
   - ✅ Local server starts on http://localhost:3000
   - 🌐 Browser opens automatically
   - 🔐 You sign in to QuickBooks
   - ✅ Authorize the app
   - 📋 New tokens displayed in terminal

4. **Copy the new tokens:**
   - The script will show you the exact lines to copy to `.env`
   - Update your `.env` file with the new `QUICKBOOKS_REFRESH_TOKEN`

5. **Test it:**
   ```bash
   npm run test:simple
   ```

---

## 🌐 Method 2: QuickBooks OAuth Playground (Manual)

If the automated script doesn't work, use the official playground:

### Step-by-Step:

1. **Go to OAuth Playground:**
   ```
   https://developer.intuit.com/app/developer/playground
   ```

2. **Sign in:**
   - Use your Intuit Developer account
   - (Same account you used to create the app)

3. **Select Your App:**
   - Find your app in the dropdown
   - Client ID: `ABgTuSF9RXVMhYLyzUBzbKgpBdVLlRtgLmPnBfnfzw`

4. **Configure Scopes:**
   - Select: `com.intuit.quickbooks.accounting`
   - (This is the main scope for accounting data)

5. **Get Authorization Code:**
   - Click "Get authorization code"
   - Sign in to QuickBooks
   - Select your company
   - Click "Authorize"

6. **Exchange for Tokens:**
   - Click "Get OAuth 2.0 tokens"
   - You'll see:
     - ✅ Access Token (expires in 1 hour)
     - ✅ **Refresh Token** (this is what you need!)
     - ✅ Realm ID (Company ID)

7. **Copy to .env:**
   ```bash
   QUICKBOOKS_REFRESH_TOKEN="the_new_refresh_token_here"
   QUICKBOOKS_COMPANY_ID="the_realm_id_here"
   ```

---

## 🔧 Method 3: Update Redirect URI (If Needed)

If you see a redirect URI error, update your app settings:

1. **Go to Developer Dashboard:**
   ```
   https://developer.intuit.com/app/developer/myapps
   ```

2. **Select your app**

3. **Go to Keys & OAuth:**
   - Click "Keys & credentials"

4. **Add Redirect URI:**
   ```
   http://localhost:3000/callback
   ```

5. **Save and try again**

---

## 📋 What You Need

Current credentials (don't change these):
```bash
QUICKBOOKS_CLIENT_ID="ABgTuSF9RXVMhYLyzUBzbKgpBdVLlRtgLmPnBfnfzw"
QUICKBOOKS_CLIENT_SECRET="VlqYyWkiyZbyetTkRFOuD2eJlMN3FalB8imPxVJc"
QUICKBOOKS_COMPANY_ID="9341456029013929"
QUICKBOOKS_ENVIRONMENT="production"
```

What you need to get:
```bash
QUICKBOOKS_REFRESH_TOKEN="<NEW_TOKEN_HERE>"
```

---

## 🧪 Testing After Update

Once you have the new refresh token:

```bash
# Update .env file
nano .env
# Or: code .env

# Test the connection
npm run test:simple
```

Expected output:
```
✅ Test 1: List Customers
   Found X customers
   Sample: Customer Name

✅ Test 2: List Invoices
   Found X invoices
   ...
```

---

## 🆘 Troubleshooting

### "Could not read Username for github" error
This is a git credential issue, not QuickBooks. Already fixed by setting up `gh auth`.

### "Token invalid" error
Your refresh token is expired. Follow the steps above to get a new one.

### "Client ID not found" error
Check that your app still exists in the Intuit Developer portal.

### "Unauthorized redirect_uri" error
Add `http://localhost:3000/callback` to your app's redirect URIs.

### "Company not found" error
Verify the `QUICKBOOKS_COMPANY_ID` matches your QuickBooks company.

---

## 📚 Resources

- [QuickBooks API Docs](https://developer.intuit.com/app/developer/qbo/docs/develop)
- [OAuth 2.0 Guide](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)
- [Developer Dashboard](https://developer.intuit.com/app/developer/myapps)
- [OAuth Playground](https://developer.intuit.com/app/developer/playground)

---

## 🎯 Quick Start (TL;DR)

```bash
# Run the OAuth helper
npm run auth

# Browser opens → Sign in → Authorize → Copy new token

# Update .env with new QUICKBOOKS_REFRESH_TOKEN

# Test it
npm run test:simple
```

That's it! 🎉
