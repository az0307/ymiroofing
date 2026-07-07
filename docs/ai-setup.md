# AI Integration Setup — n8n Credentials & Workflows

This guide explains how to configure the three AI providers used by YMI Roofing n8n workflows.

---

## 1. Google Gemini Flash (Primary — Free Tier)

Gemini Flash is the default AI for lead qualification and review message generation.

**Free tier limits (as of 2025):** 15 requests/min, 1 million tokens/day, 1,500 requests/day.

### Get an API Key

1. Go to [aistudio.google.com](https://aistudio.google.com) and sign in with a Google account.
2. Click **Get API key** → **Create API key in new project**.
3. Copy the key (starts with `AIzaSy...`).

### Configure in n8n

You have two options:

**Option A — HTTP Header Auth credential (recommended for direct API calls):**
1. In n8n: **Credentials → New → HTTP Header Auth**.
2. Name: `Gemini API Key`
3. Header Name: `x-goog-api-key`
4. Header Value: `<your-api-key>`

**Option B — Langchain Google Gemini Chat Model (for AI Agent nodes):**
1. In n8n: **Credentials → New → Google Gemini(PaLM) API**.
2. Name: `Google Gemini`
3. API Key: `<your-api-key>`
4. Use model: `gemini-2.0-flash` in node settings.

### Gemini API Endpoint

```http
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
Header: x-goog-api-key: <YOUR_KEY>
```

Request body:
```json
{
  "system_instruction": { "parts": [{ "text": "<system prompt>" }] },
  "contents": [{ "parts": [{ "text": "<user message>" }] }],
  "generationConfig": {
    "responseMimeType": "application/json",
    "temperature": 0.2,
    "maxOutputTokens": 512
  }
}
```

---

## 2. xAI Grok (Fallback — Free Tier via xAI API)

Use Grok as a fallback if Gemini rate limits are hit.

**Free tier (2025):** 25 requests/hour on grok-3-mini.

### Get an API Key

1. Go to [console.x.ai](https://console.x.ai) and sign in.
2. Create an API key (starts with `xai-...`).

### Configure in n8n

1. **Credentials → New → HTTP Header Auth**.
2. Name: `xAI Grok`
3. Header Name: `Authorization`
4. Header Value: `Bearer xai-<your-key>`

### Grok API Call

```http
POST https://api.x.ai/v1/chat/completions
Header: Authorization: Bearer xai-<YOUR_KEY>
Header: Content-Type: application/json
```

Request body:
```json
{
  "model": "grok-3-mini",
  "messages": [
    { "role": "system", "content": "<system prompt>" },
    { "role": "user", "content": "<user message>" }
  ],
  "temperature": 0.2,
  "response_format": { "type": "json_object" }
}
```

Extract response from: `response.choices[0].message.content`

---

## 3. Anthropic Claude (Complex Reasoning — Pay-as-You-Go)

Use Claude for tasks requiring deep reasoning: contract review, complex scheduling logic.

**Model recommendation:** `claude-haiku-4-5-20251001` (lowest cost, fast).

### Get an API Key

1. Go to [console.anthropic.com](https://console.anthropic.com).
2. Create an API key under **API Keys**.
3. Fund the account (minimum $5 credit).

### Configure in n8n

**Option A — Native Anthropic node (n8n 1.50+):**
1. **Credentials → New → Anthropic**.
2. Name: `Anthropic`
3. API Key: `sk-ant-...`
4. In node settings: Model = `claude-haiku-4-5-20251001`.

**Option B — HTTP Header Auth:**
1. **Credentials → New → HTTP Header Auth**.
2. Header Name: `x-api-key`
3. Header Value: `sk-ant-<your-key>`
4. Also add header: `anthropic-version: 2023-06-01`

### Claude API Call

```http
POST https://api.anthropic.com/v1/messages
Header: x-api-key: sk-ant-<YOUR_KEY>
Header: anthropic-version: 2023-06-01
```

Request body:
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 512,
  "system": "<system prompt>",
  "messages": [{ "role": "user", "content": "<message>" }]
}
```

Extract response from: `response.content[0].text`

---

## 4. n8n Variables Setup

Set these in **n8n Settings → Variables** (encrypted, not in workflow JSON):

| Variable | Value |
|----------|-------|
| `GOOGLE_SHEET_ID` | ID from your Google Sheets URL |
| `BEN_PHONE_NUMBER` | Ben's mobile in E.164 format, e.g. `+61412345678` |
| `BEN_EMAIL` | Ben's email address |
| `TWILIO_FROM_NUMBER` | Your Twilio number, e.g. `+61391234567` |
| `GOOGLE_REVIEW_LINK` | Full Google Maps review URL |

---

## 5. Google Sheets CRM Structure

The workflows expect these sheet tabs in the Google Sheets CRM:

**Leads tab columns (in order):**
`Name | Phone | Suburb | Service | Message | Score | Urgency | Summary | Timestamp`

**Jobs tab columns (in order):**
`Job ID | Customer Name | Customer Phone | Suburb | Service | Status | Review Requested | Review Date | Notes`

To set up: See `Aurora-AI-Agency/ymi-roofing/ops/GOOGLE-SHEETS-SETUP.md`.
