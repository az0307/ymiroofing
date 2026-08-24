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

Do not skip the compliance checklist below before toggling anything on.

- [ ] The **Opt-Outs** tab exists on the spreadsheet, with the header row
      `Phone | Opted Out | Message`. Every sending workflow reads it on each run
      and will stop with an error if it is missing — deliberately, so that a
      misconfigured sheet cannot result in texting someone who opted out.
- [ ] `sms-optout.json` is activated **first**, and the Twilio Messaging webhook
      (Step 6) points at it. Nothing else should be live before the handler that
      records opt-outs is.
- [ ] Send a test STOP from a phone you control and confirm a row lands in the
      Opt-Outs tab and a confirmation SMS comes back.
- [ ] Add that same number to a test row in Leads *and* Jobs, then run **each**
      sending workflow manually — `lead-capture`, `review-machine`,
      `maintenance-reminder`, `missed-call` and `ymi-review-machine` — and
      confirm no message is sent to it in any of them. Running only one is not
      enough: this is the step that catches a workflow pointed at the wrong
      spreadsheet, and it has to be proven per workflow.
- [ ] For `ymi-review-machine.json` specifically, put the opted-out number
      **first** in the Jobs sheet with at least one other completed job after it,
      and confirm the later job still gets its text. That proves the batch loop
      keeps running past a suppressed recipient.

Then toggle **Active** (top-right) on the remaining workflows.

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

Every send to a customer — not to Ben — passes through a **Suppress Opted-Out**
node first. See below.

---

## SMS compliance

Australian marketing SMS is governed by the *Spam Act 2003* (Cth). Three
obligations matter here, and each is enforced by a specific node rather than by
remembering to do it:

| Obligation | Where it is enforced |
|---|---|
| s16 — do not message someone who has withdrawn consent | `Suppress Opted-Out` sits immediately before every customer-facing Twilio node |
| s17 — identify the sender | Every message names YMI Roofing in its body |
| s18 — provide a working unsubscribe | Every customer-facing message ends `Reply STOP to opt out.` |

### How the suppression gate works

Each sending workflow reads the **Opt-Outs** tab into a node called
`Read Opt-Out List`, then filters the recipients before they reach Twilio.
Numbers are compared on their **last 9 digits**, so `0423 858 503`,
`+61423858503` and `61 423 858 503` are recognised as the same person
regardless of how each was recorded.

The gate takes two shapes, because the workflows have two shapes:

| Workflow | Gate |
|---|---|
| `lead-capture.json`, `review-machine.json`, `maintenance-reminder.json`, `missed-call.json` | A single Code node, `Suppress Opted-Out`, which simply drops suppressed items |
| `ymi-review-machine.json` | A pair — `Match Against Opt-Out List` (Code) flags the item, then `On Opt-Out List?` (IF) routes it |

The pair exists because `ymi-review-machine.json` walks its jobs with a
SplitInBatches loop. In a loop, a dropped item is not harmless: an item that
goes nowhere never returns to `Process Each Job`, so the loop stalls and every
remaining job is silently skipped. The flag-and-route pair always sends the item
somewhere — either to Twilio, or straight back into the loop.

> **Both spreadsheets must be the same spreadsheet.** `sms-optout.json` *writes*
> opt-outs, and every sending workflow *reads* them, but they do not all name the
> spreadsheet the same way — the `ymi-` prefixed workflows use
> `{{ $vars.GOOGLE_SHEET_ID }}` while the others use a literal
> `REPLACE_WITH_SPREADSHEET_ID`. Point them at different sheets and the gate
> reads an Opt-Outs tab nobody writes to, finds it empty, and **fails open** —
> texting the very people who opted out, with no error to tell you. The
> Step 7 checklist below is what catches this; do not skip it.

Two failure modes are handled deliberately:

- **Empty Opt-Outs tab.** `Read Opt-Out List` has `alwaysOutputData` set, so an
  empty list emits one blank item and messages still go out. Without it, an
  empty list would silently halt every workflow.
- **Missing or unreadable Opt-Outs tab.** The node errors and the workflow
  stops. This fails *closed*: no list means no send. Do not "fix" this by
  setting the node to continue on error.

### The AI-composed review message

`ymi-review-machine.json` writes its message with Gemini. A language model
cannot be relied on to include an unsubscribe line, or to phrase it in a way the
opt-out handler recognises. `Build SMS Text` therefore strips whatever trailing
opt-out wording the model produced and appends the exact sentence
`Reply STOP to opt out.`, reserving room for it inside the character limit so it
is never truncated away.

### What counts as STOP

`sms-optout.json` normalises the inbound message (uppercase, punctuation
stripped, whitespace collapsed) and matches it against the whole set of common
opt-out keywords — `STOP`, `STOP ALL`, `UNSUBSCRIBE`, `END`, `QUIT`, `CANCEL`,
`OPT OUT`, `REMOVE`, `NO MORE`, `DELETE` — optionally wrapped in "please".

The match is against the **entire** message, not a substring. A reply of
"Stop by tomorrow at 9" is a customer asking Ben to visit, and does not
unsubscribe them.

### Two things to check before the first real send

- Twilio must not also be auto-replying to STOP with its own Advanced Opt-Out,
  or the customer gets two confirmations.
- The Opt-Outs tab is the single source of truth. If opt-outs are ever recorded
  anywhere else, they are not being honoured.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Webhook returns 404 | Confirm the workflow is **Active** in n8n |
| SMS not sending | Check Twilio credential + account balance; verify E.164 format |
| Sheets not updating | Re-authorise Google credential; confirm spreadsheet ID + tab name |
| n8n unreachable | Check `docker compose logs -f n8n`; verify SSL cert is valid |
