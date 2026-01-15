# Tooltrace API Documentation

Welcome to the Tooltrace API. Our API allows you to programmatically manage your SaaS tools, track renewals, and integrate with automation platforms like Zapier, Make, and Pabbly.

## Authentication

All API requests require an API key. You can generate one from the **API Keys** page in your dashboard.

The API key follows the format `tt_abcdef123456.secret_token`.

### Authorization Header (Recommended)
Include your API key in the `Authorization` header as a Bearer token:
```bash
Authorization: Bearer tt_your_key.your_secret
```

### Query Parameter (Webhooks)
For simple webhooks, you can pass the API key as a query parameter:
```bash
https://app.tooltrace.io/api/v1/tools?apiKey=tt_your_key.your_secret
```

---

## API Base URL
The base URL for all v1 API calls is:
`https://app.tooltrace.io/api/v1`

---

## Endpoints

### 1. List All Tools
Get a list of all your managed SaaS tools.
- **URL**: `/tools`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "tools": [...],
    "count": 12
  }
  ```

### 2. Create a Tool
Add a new SaaS tool to your Tooltrace account.
- **URL**: `/tools`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "name": "Sentry",
    "websiteUrl": "https://sentry.io",
    "isPaid": true,
    "billingAmount": "2900", // in cents
    "billingCycle": "monthly",
    "nextRenewalDate": "2024-12-25"
  }
  ```

### 3. Spending Analytics
Get detailed insights into your SaaS spending.
- **URL**: `/analytics/spending`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "monthlyTotal": "450.00",
    "yearlyTotal": "5400.00",
    "byCategory": {
      "Engineering": 250.00,
      "Marketing": 200.00
    },
    "budgetStatus": {
      "threshold": 500,
      "isOverBudget": false,
      "percentageUsed": 90
    }
  }
  ```

### 4. Renewal Triggers (For Webhooks)
Get tools that are renewing within the next X days. Perfect for daily automation triggers.
- **URL**: `/webhooks/renewal-triggers?days=7`
- **Method**: `GET`

---

## Integration Guides

### Zapier / Make / Pabbly
1. Create a "Webhooks" or "API" trigger in your automation tool.
2. Use the **POST /tools** endpoint to automatically add tools when you receive a purchase receipt.
3. Use the **GET /renewals** endpoint to send daily summaries to Slack or Email.

### Browser Extension
Download the official ToolTrace extension from the Integrations Hub to auto-detect and save tools while you browse.
