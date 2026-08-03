# Deploying the AI Chatbot Backend

The chatbot on the website is a **real AI assistant**. The widget in the browser
(`assets/js/chatbot.js`) sends the conversation to a small Cloudflare Worker
(`worker.js` in this folder), which holds your Anthropic API key as a secret,
adds your CV/site content as context, calls the Claude API, and returns the
answer. GitHub Pages can't keep secrets, which is why this tiny backend exists.

Everything below is doable from the browser — no command line needed.
Total time: ~10 minutes. Cost: Cloudflare Workers free tier (100,000
requests/day) + Claude API usage (pennies at portfolio traffic levels).

## Step 1 — Get an Anthropic API key

1. Go to https://platform.claude.com/ and sign in / create an account.
2. Add a small amount of credit (e.g. $5) under **Billing**.
3. Under **API Keys**, create a key. Copy it (starts with `sk-ant-...`).
   You'll paste it into Cloudflare in Step 3 — never into the website code.

## Step 2 — Create the Worker

1. Go to https://dash.cloudflare.com/ and create a free account.
2. In the left sidebar: **Compute (Workers)** → **Create** → **Create Worker**.
3. Give it a name, e.g. `portfolio-chatbot`, and click **Deploy**
   (it deploys a "Hello World" first — that's fine).
4. Click **Edit code**, delete everything in the editor, and paste the full
   contents of `worker.js` from this folder.
5. Click **Deploy** (top right).

## Step 3 — Add your API key as a secret

1. Back on the worker's page: **Settings** → **Variables and Secrets**.
2. Click **Add**, choose type **Secret**:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-...` key from Step 1
3. Save (and redeploy if prompted).

## Step 4 — Connect the widget

1. Copy the worker URL shown on its overview page, e.g.
   `https://portfolio-chatbot.your-name.workers.dev`
2. Open `assets/js/chatbot.js` and replace the placeholder:

   ```js
   const WORKER_URL = "https://portfolio-chatbot.your-name.workers.dev";
   ```

3. Commit and push the site. Done — the chat bubble in the bottom-right
   corner now answers with real AI.

## Testing locally

`ALLOWED_ORIGINS` in `worker.js` already allows `http://localhost:8000` and
`http://localhost:5500` (VS Code Live Server). Serve the site locally, e.g.:

```
python -m http.server 8000
```

then open http://localhost:8000. Opening `index.html` as a `file://` URL will
NOT work (no origin header) — use a local server.

## Customising

All in `worker.js`:

- **Bot knowledge** — edit `SYSTEM_PROMPT`. This is the only thing the bot
  knows about you; update it when your website/CV changes.
- **Model** — `MODEL` is `claude-opus-4-8` (highest quality). Change to
  `claude-haiku-4-5` for ~5x cheaper responses.
- **Reply length / abuse limits** — `MAX_TOKENS`, `MAX_MESSAGES`,
  `MAX_MESSAGE_CHARS`.
- **Allowed sites** — `ALLOWED_ORIGINS`. Add your custom domain if you ever
  move off `shengyangzhuang.github.io`. Requests from other origins are
  rejected, so strangers can't embed your worker on their own sites.

Widget text (welcome message, suggested questions) is at the top of
`assets/js/chatbot.js`; colours are in `assets/css/chatbot.css`.

## Cost & abuse control

- Each Q&A costs a fraction of a cent; typical portfolio traffic is a few
  dollars per month at most. Set a **spend limit** in the Anthropic console
  under Billing to cap the worst case.
- The worker already caps message count/length and reply length. For extra
  protection, Cloudflare dashboard → your worker → **Security** lets you add
  free rate-limiting rules (e.g. max 20 requests/minute per IP).
