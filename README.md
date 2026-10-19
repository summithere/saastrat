# SaaStrat website — Azure Static Web Apps (Free plan)

    public/index.html                 the website
    public/staticwebapp.config.json   sets the API's Node.js version
    api/                              Azure Function: POST /api/contact -> emails you

The form posts to /api/contact. The function validates it and sends the
message to your inbox through Azure Communication Services (ACS) Email.
Replies go straight to the visitor (Reply-To is set to their address).

## 1. Email service (ACS) — pay-as-you-go, fractions of a cent per email
1. Azure portal > create "Communication Services" resource.
2. Create "Email Communication Services" resource > add a domain:
   - quickest: "Azure managed domain" (sender looks like DoNotReply@xxxx.azurecomm.net)
   - nicer: your own domain (needs DNS records to verify)
3. In the Communication Services resource > Email > Domains > connect that domain.
4. Copy: Keys > Connection string, and the MailFrom sender address.

## 2. Static Web App (Free plan)
1. Push this folder to a GitHub repo.
2. Azure portal > create "Static Web App" > Plan: Free > Source: GitHub > pick the repo.
   Build details: Preset "Custom", App location "public", Api location "api",
   Output location empty. Azure adds a GitHub Actions workflow that deploys on every push.
3. Static Web App > Settings > Environment variables, add:
   ACS_CONNECTION_STRING = connection string from 1.4
   SENDER_ADDRESS        = sender address from 1.4
   RECIPIENT_ADDRESS     = your inbox
4. Custom domain: Static Web App > Custom domains > add.

## 3. Test
Submit the form on the live site. If nothing arrives, check spam, then the
function logs (Application Insights, if enabled).
