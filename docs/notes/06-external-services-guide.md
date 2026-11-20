# 06 - External Services Setup & Environment Variables

This guide details how to create and link every external cloud service required for the production application.

---

## 1. Environment Variables Template (`.env.local`)

Create a `.env.local` file in `application/`:

```env
# Application Base URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 1. Neon Serverless PostgreSQL Database
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/cashbook?sslmode=require"

# 2. Better Auth Secret
BETTER_AUTH_SECRET="generate-a-random-32-byte-hex-string-using-openssl-rand-hex-32"

# 3. Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# 4. Cloudflare R2 Object Storage (Zero Egress Receipts)
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-api-token-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-api-token-secret-access-key"
R2_BUCKET_NAME="cashbook-receipts"
R2_PUBLIC_DOMAIN="https://media.yourcashbook.com" # Optional custom domain or r2.dev

# 5. Resend (Transactional Email)
RESEND_API_KEY="re_123456789_abcdefg"
EMAIL_FROM="CashBook <notifications@yourdomain.com>"
```

---

## 2. Step-by-Step Setup Guides

### A. Neon PostgreSQL (Free Tier)
1. Go to [neon.tech](https://neon.tech) and sign up.
2. Click **Create Project**, name it `cashbook`, choose your nearest region.
3. In the dashboard, copy the **Connection String** (`postgresql://...`).
4. Paste it as `DATABASE_URL` in `.env.local`.

### B. Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `CashBook`.
3. Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
4. Application type: **Web application**.
5. Authorized redirect URIs:
   - For Local Dev: `http://localhost:3000/api/auth/callback/google`
   - For Production: `https://your-domain.com/api/auth/callback/google`
6. Copy `Client ID` and `Client Secret` into `.env.local`.

### C. Cloudflare R2 ($0 Egress Bucket)
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) and navigate to **R2**.
2. Click **Create Bucket**, name it `cashbook-receipts`.
3. Click **Manage R2 API Tokens > Create API Token**:
   - Permissions: **Object Read & Write**.
   - Apply to specific bucket: `cashbook-receipts`.
4. Copy the `Access Key ID`, `Secret Access Key`, and your Account ID into `.env.local`.
5. Under Bucket Settings, configure CORS:
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

### D. Resend (Email Verification)
1. Sign up at [resend.com](https://resend.com).
2. Go to **API Keys > Create API Key**.
3. Paste key as `RESEND_API_KEY`.
