/**
 * QuickBooks OAuth Helper
 *
 * Run this script to get a fresh refresh token
 *
 * Usage:
 *   npx tsx scripts/get-refresh-token.ts
 */

import express from 'express';
import open from 'open';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';
const PORT = 3000;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const app = express();

let serverInstance: any;

// Step 1: Generate authorization URL
const authorizationUrl =
  'https://appcenter.intuit.com/connect/oauth2' +
  '?client_id=' + CLIENT_ID +
  '&scope=com.intuit.quickbooks.accounting' +
  '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
  '&response_type=code' +
  '&state=' + Math.random().toString(36).substring(7);

// Step 2: Handle callback
app.get('/callback', async (req, res) => {
  const authCode = req.query.code as string;
  const realmId = req.query.realmId as string;

  if (!authCode) {
    res.send('❌ Error: No authorization code received');
    return;
  }

  try {
    // Exchange auth code for tokens
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: REDIRECT_URI
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS! QuickBooks OAuth tokens obtained');
    console.log('='.repeat(60));
    console.log('\n📋 Copy these values to your .env file:\n');
    console.log(`QUICKBOOKS_CLIENT_ID="${CLIENT_ID}"`);
    console.log(`QUICKBOOKS_CLIENT_SECRET="${CLIENT_SECRET}"`);
    console.log(`QUICKBOOKS_REFRESH_TOKEN="${refresh_token}"`);
    console.log(`QUICKBOOKS_COMPANY_ID="${realmId}"`);
    console.log(`QUICKBOOKS_ENVIRONMENT="production"`);
    console.log('\n' + '='.repeat(60));
    console.log('\n💡 Access Token (expires in 1 hour):');
    console.log(access_token);
    console.log('\n⏰ Token expires in:', expires_in, 'seconds');
    console.log('\n' + '='.repeat(60));

    res.send(`
      <html>
        <head>
          <style>
            body { font-family: monospace; padding: 40px; background: #0f0f23; color: #00ff00; }
            .success { color: #00ff00; }
            .token { background: #1a1a2e; padding: 20px; border-radius: 8px; margin: 20px 0; }
            code { color: #ffff00; }
            h1 { color: #00ff00; }
          </style>
        </head>
        <body>
          <h1>✅ SUCCESS!</h1>
          <p class="success">QuickBooks OAuth tokens obtained successfully!</p>

          <div class="token">
            <h3>📋 Copy these to your .env file:</h3>
            <pre><code>QUICKBOOKS_CLIENT_ID="${CLIENT_ID}"
QUICKBOOKS_CLIENT_SECRET="${CLIENT_SECRET}"
QUICKBOOKS_REFRESH_TOKEN="${refresh_token}"
QUICKBOOKS_COMPANY_ID="${realmId}"
QUICKBOOKS_ENVIRONMENT="production"</code></pre>
          </div>

          <p>Check your terminal for the full output.</p>
          <p>You can close this window now.</p>
        </body>
      </html>
    `);

    // Close server after 5 seconds
    setTimeout(() => {
      if (serverInstance) {
        serverInstance.close();
        console.log('\n✅ Server closed. You can now use the new refresh token!');
        process.exit(0);
      }
    }, 5000);

  } catch (error: any) {
    console.error('\n❌ Error exchanging code for tokens:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    res.send('❌ Error: Failed to exchange authorization code. Check console for details.');
  }
});

// Start server and open browser
serverInstance = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 QuickBooks OAuth - Refresh Token Generator');
  console.log('='.repeat(60));
  console.log(`\n🌐 Starting local server on http://localhost:${PORT}`);
  console.log('\n📋 Steps:');
  console.log('  1. Browser will open automatically');
  console.log('  2. Sign in to your QuickBooks account');
  console.log('  3. Authorize the application');
  console.log('  4. You\'ll be redirected back with tokens');
  console.log('\n⏳ Opening browser...\n');

  setTimeout(() => {
    open(authorizationUrl).catch(() => {
      console.log('\n⚠️  Could not open browser automatically.');
      console.log('\n📋 Please open this URL manually:');
      console.log('\n' + authorizationUrl + '\n');
    });
  }, 1000);
});

// Handle errors
app.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
