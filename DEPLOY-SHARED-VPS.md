# Deploying onto a VPS that already hosts a live client site

## Read this first

I can't run this deployment for you — I have no SSH access to your server from
here. You'll be running the commands. What I can do is make the procedure so
narrow that it has almost nothing to break.

The principle throughout: **we only ADD. We never edit a file the existing site
depends on.** Every step below either creates a new file or starts a new
process. Nothing rewrites nginx.conf, nothing touches the existing site's
config, nothing changes the existing site's certificate.

**Do step 0 before anything else.** `audit-vps.sh` is read-only — it prints and
exits. Send me the output and I'll write the exact config for your server
instead of a generic one.

---

## ⚠️ Correction to the earlier guide

The VPS section in `README.md` says to use:

```nginx
listen 80 default_server;
server_name _;
```

**Do not use that on this server.** It's correct for an empty VPS and wrong —
dangerously wrong — for yours. `default_server` claims every request that
doesn't match another block, and `server_name _` matches anything. Depending on
which config nginx loads first, that either steals your client's traffic or
makes nginx refuse to start because two blocks both claim `default_server`.

On a shared VPS the new block must name its domain explicitly and claim nothing
else. That's what's below.

---

## The six things that could actually break the client site

Each one has a specific avoidance. This is the whole safety argument.

| # | Risk | How we avoid it |
|---|------|-----------------|
| 1 | **`default_server` collision** — nginx won't start, or our block swallows the client's traffic | Our block names only our domain. No `default_server`, no `server_name _`. |
| 2 | **Port collision** — we grab a port another service wanted | The audit lists every listening port. We pick a free one and bind it to `127.0.0.1` only, so it isn't even reachable from outside. |
| 3 | **certbot rewriting the existing site's config** — `certbot --nginx` edits server blocks in place | We use `certonly --webroot`. It writes certificate files and touches no nginx config at all. |
| 4 | **Node version change** — installing Node 22 breaks a site running on Node 16 | The audit reports the installed version. If another app depends on Node, we install ours through `nvm` under your user, leaving the system Node untouched. |
| 5 | **Reloading a broken config** — one typo takes both sites down | `nginx -t` before every reload, always. If it doesn't say `ok`, we stop and change nothing. |
| 6 | **A control panel overwriting our work** — cPanel, CyberPanel, Plesk and similar regenerate nginx configs and will delete a hand-written block | The audit detects these. **If one is found, stop.** Adding the site through the panel's own UI is the only safe route, and I'll write those steps instead. |

---

## Step 0 — Audit (read-only, changes nothing)

```bash
# on the VPS
bash audit-vps.sh > audit.txt 2>&1
cat audit.txt
```

Read it, then send it to me. I'll confirm the port, the exact nginx block, and
whether a control panel changes the plan.

**Stop here if the audit shows:**
- a control panel (cPanel / CyberPanel / Plesk / HestiaCP / DirectAdmin)
- `nginx -t` reporting anything other than `ok` — the config is already broken and must be fixed before we add to it
- under ~700 MB of free RAM and no swap — `next build` will get OOM-killed, and on a small VPS the OOM killer may take the client's site down with it

---

## Step 1 — Back up what we could conceivably affect

Two minutes, and it makes every later step reversible.

```bash
sudo mkdir -p /root/backups
sudo tar czf /root/backups/nginx-$(date +%F-%H%M).tar.gz /etc/nginx
pm2 save 2>/dev/null || true            # snapshot of current pm2 processes
crontab -l > /root/backups/crontab.txt 2>/dev/null || true
ls -la /root/backups/
```

---

## Step 2 — Node, without disturbing anything

Skip if the audit shows Node 20+ already installed and no other app depends on it.

If another app relies on a specific Node version, install ours in user space:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 22
node -v
```

`nvm` installs under `~/.nvm` and changes nothing system-wide.

```bash
npm install -g pm2      # skip if the audit already found pm2
```

---

## Step 3 — Put the app somewhere new

```bash
sudo mkdir -p /var/www/vcard
sudo chown -R $USER:$USER /var/www/vcard
cd /var/www/vcard

# upload the project here (git clone, scp, or rsync)

npm ci
cp .env.local.example .env.local
nano .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://fgfjjlvcxlwneggfrwvk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_DOMAIN=cards.yourdomain.com
ADMIN_PASSWORD=<something long, not the default>
```

`NEXT_PUBLIC_APP_DOMAIN` is baked in at build time. Set it before building or
you'll be rebuilding.

```bash
npm run build
```

If the build is killed for memory, add temporary swap rather than fighting it:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

---

## Step 4 — Run it on a private port

Use a free port from the audit — 3000 is often taken, so this example uses 3210.

```bash
cd /var/www/vcard
pm2 start npm --name vcard -- start -- -p 3210 -H 127.0.0.1
pm2 save
```

`-H 127.0.0.1` binds to loopback only. Until nginx proxies to it, this port is
not reachable from the internet at all.

```bash
curl -I http://127.0.0.1:3210      # expect 200
```

If that doesn't return 200, **stop** — nothing has been exposed and the client's
site is still untouched.

Only run `pm2 startup` if the audit showed pm2 was *not* already installed. If
it was, it already has a startup hook and re-running it is unnecessary churn.

---

## Step 5 — A new nginx block, on its own domain

Point `cards.yourdomain.com` (an A record to this VPS IP) before this step.

```bash
sudo nano /etc/nginx/sites-available/vcard
```

```nginx
# vCard Studio — additive. Claims only the names listed below.
# No default_server: the existing site keeps every request we don't name.
server {
    listen 80;
    listen [::]:80;
    server_name cards.yourdomain.com;

    # Lets certbot answer the ACME challenge without touching nginx config.
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass         http://127.0.0.1:3210;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        'upgrade';
        proxy_set_header   Host              $host;   # ← custom domains need this
        proxy_set_header   X-Forwarded-Host  $host;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 20M;                     # cover video uploads
    }
}
```

`proxy_set_header Host $host` is not optional. Without it nginx forwards
`Host: 127.0.0.1` and every client custom domain silently falls back to your
platform domain — no error, it just quietly stops working.

```bash
sudo mkdir -p /var/www/certbot
sudo ln -s /etc/nginx/sites-available/vcard /etc/nginx/sites-enabled/vcard

sudo nginx -t          # MUST say "syntax is ok" and "test is successful"
```

**If `nginx -t` fails, do not reload.** Remove the symlink and you're exactly
where you started:

```bash
sudo rm /etc/nginx/sites-enabled/vcard
```

Only when it passes:

```bash
sudo systemctl reload nginx      # reload, not restart — no dropped connections
```

Check the client's site right now, in a browser. It should be untouched.

---

## Step 6 — SSL without editing any existing config

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d cards.yourdomain.com
```

`certonly` writes certificate files and nothing else. It will not open, parse
or rewrite the client's server block — which `certbot --nginx` might.

Then add the TLS block yourself, again only to *our* file:

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name cards.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/cards.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cards.yourdomain.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3210;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        'upgrade';
        proxy_set_header   Host              $host;
        proxy_set_header   X-Forwarded-Host  $host;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Real-IP         $remote_addr;
        client_max_body_size 20M;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Adding a client's own domain later

Per client, and still additive:

1. Client points an A record at this VPS IP.
2. Set **Custom domain** on their card in `/admin` → Settings.
3. Copy the `vcard` nginx file, change `server_name` to their domain, symlink it.
4. `sudo certbot certonly --webroot -w /var/www/certbot -d theirdomain.com -d www.theirdomain.com`
5. `sudo nginx -t && sudo systemctl reload nginx`

The app needs no redeploy — middleware resolves the card from the `Host` header.

---

## Rollback — under a minute

```bash
sudo rm -f /etc/nginx/sites-enabled/vcard
sudo nginx -t && sudo systemctl reload nginx
pm2 delete vcard && pm2 save
```

The client's site is back to exactly its previous state. Nothing of theirs was
ever modified, so there is nothing of theirs to restore.

Full nginx restore, if you ever need it:

```bash
sudo tar xzf /root/backups/nginx-<timestamp>.tar.gz -C /
sudo nginx -t && sudo systemctl reload nginx
```

---

## Moving to a dedicated VPS later

Nothing here is host-specific. To move:

1. Stand up Node + nginx on the new box, repeat steps 3–6.
2. Point DNS at the new IP.
3. For a new Supabase account: create the project, run `supabase/schema.sql`,
   export/import the tables, copy the Storage bucket, swap the two keys in
   `.env.local`, rebuild.

The only build-time value is `NEXT_PUBLIC_APP_DOMAIN`, so a host change means
one env edit and one `npm run build`.
