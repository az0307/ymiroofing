# n8n Setup — YMI Roofing

Guide for connecting `ymiroofing.com.au` to self-hosted n8n.

## Prerequisites

- n8n running with SSL (e.g. `https://n8n.yourdomain.com`) — use the `meta-automation-hub` VPS stack
- Google account with access to the YMI Roofing Google Sheet
- Twilio account with an Australian mobile number

---

## Step 1 — Add credentials in n8n

### Google Sheets OAuth2

1. n8n → Settings → Credentials → **New** → Google Sheets OAuth2 API
2. Complete the OAuth2 flow
3. Name it exactly: `Google Sheets — YMI Roofing`
4. Note the credential ID shown after save

### Twilio

1. Settings → Credentials → **New** → Twilio API
2. Enter Account SID + Auth Token from [console.twilio.com](https://console.twilio.com)
3. Name it exactly: `Twilio — YMI Roofing`
4. Note the credential ID after save

---

## Step 2 — Import workflows

1. n8n → Workflows → **Import from file**
2. Import each file from `n8n-workflows/`:
   - `lead-capture.json`
   - `review-machine.json`
   - `missed-call.json`
   - `sms-optout.json`
   - `maintenance-reminder.json`

---

## Step 3 — Replace placeholders

In each imported workflow, find and replace:

| Placeholder | Replace with |
|---|---|
| `REPLACE_WITH_SPREADSHEET_ID` | Google Sheet ID from the URL: `docs.google.com/spreadsheets/d/`**`ID_HERE`**`/edit` |
| `REPLACE_WITH_GOOGLE_CREDENTIAL_ID` | Credential ID from Step 1 |
| `REPLACE_WITH_TWILIO_CREDENTIAL_ID` | Credential ID from Step 1 |
| `REPLACE_WITH_TWILIO_FROM_NUMBER` | Your Twilio AU number in E.164, e.g. `+61700000000` |
| `REPLACE_WITH_GOOGLE_PLACE_ID` | From [Place ID Finder](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder) — search "YMI Roofing" |

Ben's alert number (`+61422093241`) is pre-filled in `lead-capture.json`.

---

## Step 4 — Google Sheets structure

Ensure the spreadsheet has these tabs with matching column headers (case-sensitive):

**Leads** tab:
```
Timestamp | Name | Phone | Suburb | Service | Message | Source | Status | Notes | Maintenance Reminder Sent
```

**Jobs** tab:
```
Job ID | Name | Phone | Service | Status | Completed Date | Review Requested | Notes
```

**Opt-Outs** tab:
```
Phone | Opted Out | Message
```

---

## Step 5 — Wire the website

In `ymi-roofing/site/index.html`, find:

```js
const WEBHOOK_URL = 'https://YOUR-N8N-DOMAIN/webhook/ymi-roofing-lead';
```

Replace with your actual n8n domain:

```js
const WEBHOOK_URL = 'https://n8n.yourdomain.com/webhook/ymi-roofing-lead';
```

---

## Step 6 — Configure Twilio webhooks

In Twilio Console → Phone Numbers → your AU number:

**Voice tab** (for missed call):
- A call comes in: `Webhook` → `https://n8n.yourdomain.com/webhook/ymi-missed-call` — POST

**Messaging tab** (for SMS opt-out):
- A message comes in: `Webhook` → `https://n8n.yourdomain.com/webhook/ymi-sms-inbound` — POST

---

## Step 7 — Activate workflows

Open each workflow and toggle **Active** (top-right). Do this for all 5.

---

## Step 8 — End-to-end test

1. Submit the contact form on `ymiroofing.com.au` with test details
2. Verify:
   - [ ] New row appears in Google Sheets Leads tab
   - [ ] SMS alert received on Ben's phone (+61422093241)
   - [ ] Confirmation SMS received on the test number
3. Check n8n → Executions for any errors

---

## Workflow reference

| File | Trigger | What it does |
|---|---|---|
| `lead-capture.json` | POST `/webhook/ymi-roofing-lead` | Logs to Sheets → SMS Ben + confirmation to lead |
| `review-machine.json` | Weekdays 10am AEST | Reads completed jobs → sends Google Review SMS |
| `missed-call.json` | Twilio voice webhook | Sends SMS callback promise to missed caller |
| `sms-optout.json` | Twilio inbound SMS | Logs STOP requests → confirms opt-out |
| `maintenance-reminder.json` | 1 Sep annually 9am | Sends pre-summer reminder to past customers |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Webhook returns 404 | Confirm the workflow is **Active** in n8n |
| SMS not sending | Check Twilio credential + account balance; verify E.164 format |
| Sheets not updating | Re-authorise Google credential; confirm spreadsheet ID + tab name |
| n8n unreachable | Check `docker compose logs -f n8n`; verify SSL cert is valid |
