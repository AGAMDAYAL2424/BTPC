# Deploying the BRICS help desk

Six days, 24 hours a day, ~1000 visitors a day, ~60 concurrent. One AWS
Lightsail instance in Mumbai, Caddy for TLS, SQLite on local disk, no API key.

Measured on the production build before writing this: server-side latency **p50
3ms, p95 12ms, p99 19ms**, and a burst test sustained **74.8 req/s**, about 25x
the projected peak of ~3 req/s. Capacity is not the risk here. The risks are
the process dying unattended and the proxy misreporting client addresses, and
both are handled below.

---

## What this app needs, and why it is not serverless

- `better-sqlite3` is a native module, so the Node runtime, never the edge.
- The SQLite file is **written on every request** (analytics, the flagged queue,
  quota) and by the admin portal.
- The search index, the visitor session LRU and the rate-limit counters all live
  in **process memory**.

That last point is why this runs as **exactly one Node process**. A second
instance would hold its own counters and its own sessions, and each would allow
the full budget. If it ever needs to scale horizontally, the limiters move to
Redis first; the interface in `lib/server/guard/ratelimit.ts` does not change.

---

## 1. Instance

Lightsail, **ap-south-1 (Mumbai)**, Ubuntu 24.04.

The **$7 / 1GB** plan. `next build` is the only memory-hungry step and 512MB is
tight for it; if you take the $5 plan, add swap before the first build:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Attach a static IP.** It is free while attached to a running instance; AWS
bills only unattached ones, so detach it when you decommission.

**Firewall** (Lightsail → Networking): allow 80 and 443, restrict 22 to your own
address, and leave **3000 closed**. This is not just hygiene — the application
is configured for exactly one trusted proxy hop, and that is only true if
nothing can reach Node directly.

---

## 2. Node and the build

```bash
sudo apt update && sudo apt install -y nodejs npm sqlite3 git
sudo useradd -r -m -d /srv/brics -s /bin/bash brics
sudo -u brics -i
git clone <your repo> /srv/brics && cd /srv/brics
```

Install **with scripts disabled**:

```bash
npm ci --ignore-scripts
```

`better-sqlite3` ships prebuilt binaries for all eight platforms, including
`linux-x64` and `linux-arm64`, and needs no compiler. But it also ships a
`binding.gyp` and declares no install script, so npm applies its documented
default of compiling with node-gyp — which then fails, or drags in a whole
build toolchain to produce a binary the package already contains.
`--ignore-scripts` skips that. Only `esbuild` (vitest) and `fsevents` (macOS)
have install scripts in this tree, and neither is needed to build or run.

Verify before going further:

```bash
node -e "const D=require('better-sqlite3');new D(':memory:');console.log('sqlite ok')"
```

Then:

```bash
npm run build
npm run db:init          # creates the database, loads the 60 rows
npm run admin:create -- <username> '<a-strong-passphrase-12+>'
```

---

## 3. Environment

Root-owned, outside the repo, because it holds the session secret:

```bash
sudo tee /etc/brics-faq.env >/dev/null <<'EOF'
NODE_ENV=production
PORT=3000
AI_PROVIDER=none
SESSION_SECRET=REPLACE_ME
NEXT_PUBLIC_SITE_URL=https://brics-helpdesk.duckdns.org
DATABASE_URL=/srv/brics/data/brics-faq.db
TRUSTED_PROXY_HOPS=1
SESSION_FLOOD_MAX=60
ADDRESS_DEGRADE_MAX=2000
ADDRESS_THROTTLE_MAX=6000
EOF
sudo chmod 600 /etc/brics-faq.env
```

Generate the secret and paste it in — the app **throws on the first request**
without it in production, by design:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Hostname, TLS, service

Point a free **DuckDNS** subdomain at the static IP. DuckDNS is on the Public
Suffix List, so Let's Encrypt rate limits apply per-subdomain rather than being
shared with everyone else using the service.

```bash
sudo cp deploy/brics-faq.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now brics-faq

sudo apt install -y caddy
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
# edit the hostname and the /admin allowlist address first
sudo systemctl reload caddy
```

Caddy obtains and renews the certificate on its own. The unit restarts the app
on any exit, with no attempt limit — six unattended days.

```bash
(crontab -l 2>/dev/null; echo "0 * * * * /srv/brics/deploy/backup-db.sh >> /var/log/brics-backup.log 2>&1") | crontab -
```

---

## 5. Before you give anyone the URL

```bash
curl -sI https://<host>/hi | grep -i "content-security-policy\|strict-transport"
curl -s  https://<host>/api/health           # {"status":"ok","rows":60}
```

**The check that matters most.** The rate limiter reads the client address from
`x-forwarded-for`, counting `TRUSTED_PROXY_HOPS` from the right. If the number
is wrong, or a proxy in front does not forward the header, every visitor
collapses onto one bucket and the site starts refusing everybody at once. From
two different machines:

```bash
curl -s -D- -o/dev/null -X POST https://<host>/api/chat \
  -H 'content-type: application/json' \
  -d '{"message":"kya metro chalegi","lang":"en"}' | grep -i x-ratelimit-remaining
```

Two different clients must show **independent** counters. Repeated calls from
one client must **count down**. Then confirm forging is ignored — this must not
give you a fresh counter:

```bash
curl -s -D- -o/dev/null -X POST https://<host>/api/chat \
  -H 'content-type: application/json' -H 'x-forwarded-for: 1.2.3.4' \
  -d '{"message":"kya metro chalegi","lang":"en"}' | grep -i x-ratelimit-remaining
```

And watch for the misconfiguration warning, which fires at most once a minute:

```bash
sudo journalctl -u brics-faq | grep ratelimit
```

Then the rest:

```bash
sudo systemctl kill -s SIGKILL brics-faq && sleep 5 && systemctl is-active brics-faq
/srv/brics/deploy/backup-db.sh          # produces a .db.gz
curl -s -o/dev/null -w '%{http_code}\n' https://<host>/admin   # 404 from off-allowlist
```

---

## 6. During the event

```bash
sudo journalctl -u brics-faq -f
```

Triage the flagged queue at `/admin` daily — that is what the deployment is for.
`/admin/analytics` shows the tier split; a rising `throttled` count means either
one abusive source or a proxy problem, and the `[tiers] throttled on ...` log
line tells you which.

To raise a ceiling mid-event, edit `/etc/brics-faq.env` and
`sudo systemctl restart brics-faq`. The counters are in memory and reset anyway.

**Decommission:** stop the units, take a final backup, then **detach the static
IP** or AWS starts charging for it.

---

## If the traffic police site integrates later

Nothing here blocks it, and only one setting changes.

- **Redirect or plain link** — works today, nothing to change.
- **Reverse proxy from their Apache** — set `TRUSTED_PROXY_HOPS=2` (their proxy,
  then our Caddy) and re-run the address checks in section 5. Confirm their
  Apache forwards the client address; if it does not, that is the sitewide-429
  condition and the journal will say so. A **subdomain** mount needs no code
  change; a **subpath** mount needs `basePath` in `next.config.ts`, which is
  baked in at build time and so must be decided before the final build.
- **iframe overlay** — needs `X-Frame-Options: DENY` removed from
  `next.config.ts`, `frame-ancestors 'none'` in `middleware.ts` changed to an
  allowlist of their origins, and an `?embed=1` chrome-less mode on the locale
  page.
