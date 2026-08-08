# Deploy — written for THIS server

Audited 8 August 2026. Everything below is based on what the server actually
reported, not on a general pattern.

```
Traefik      docker, network_mode: host, owns :80 and :443
             --providers.file.directory=/dynamic  --providers.file.watch=true
             /docker/traefik-cdmh/dynamic  ->  /dynamic  (read-only)
             letsencrypt via HTTP challenge, http auto-redirects to https

volt-pine    pm2, cluster x2, /var/www/volt-and-pine, 127.0.0.1:3000   ← CLIENT. DO NOT TOUCH.
vcard        systemd, /var/www/vcard, 127.0.0.1:3210                   ← our old version
n8n / evolution-api / hermes   docker, ports 32768-32770

node v22.23.1   npm 10.9.8   no nvm
RAM 7.9 GB (5.5 free)   disk 75 GB free   no control panel   ufw inactive
port 3211 free
```

## Why this is safe

Traefik watches `/dynamic` and reloads by itself. **We add one new file there.**
We never edit `docker-compose.yml`, never restart Traefik, never touch
`volt-pine.yml`, never go near pm2. The client's site does not notice we exist.

The one thing that could go wrong is a routing rule that overlaps theirs. Ours
names our domain and nothing else — no wildcard, no catch-all, no `PathPrefix`
without a `Host`.

---

## Set this once

Chosen 8 Aug 2026: **`wizart.pdmmarketing.in`**, a subdomain of a domain already
owned and already on Hostinger DNS. `cards.pdmmarketing.in` is taken by the old
version, so this is a new name rather than a reuse.

Worth knowing before the first card goes out: **whatever this is, it gets printed
onto QR codes.** Moving to a different domain later breaks every QR made before
the move. Per-card custom domains already exist as a feature if a client wants
their own.

```bash
DOMAIN=wizart.pdmmarketing.in
export DOMAIN
```

DNS record to add in Hostinger first — name is just `wizart`, not the full host:

```
Type A    Name wizart    Points to 31.97.226.78
```

Everything below uses `$DOMAIN`. Point its A record at **31.97.226.78** and wait
for it to resolve before step 5 — Let's Encrypt uses an HTTP challenge, and it
fails if DNS has not propagated.

```bash
dig +short $DOMAIN              # must print 31.97.226.78
```

---

## 1 — Prove we changed nothing (do this first)

```bash
md5sum /docker/traefik-cdmh/docker-compose.yml \
       /docker/traefik-cdmh/dynamic/*.yml > /root/before-deploy.md5
cat /root/before-deploy.md5
```

At the end we run the same command and compare. If any existing file's hash
changed, something went wrong and we stop.

---

## 2 — Put the app in its own folder

```bash
mkdir -p /var/www/wizart
cd /var/www/wizart
# upload the project here — git clone, scp or rsync.
# do NOT copy node_modules or .next from your laptop; they are platform-specific.
```

Then:

```bash
npm install
```

**Not `--omit=dev`.** Tailwind, PostCSS and TypeScript live in devDependencies
and are all needed *at build time* — leaving them out makes `next build` fail
with a confusing PostCSS error. Once the build is done they can go:

```bash
# optional, after the build succeeds
npm prune --omit=dev
```

`node v22.23.1` is already system-wide and Next 14 is happy on it, so no nvm and
no change to the system Node. The client's app keeps using the same binary it
uses today.

---

## 3 — The environment file

```bash
nano /var/www/wizart/.env.local
```

Copy your local `.env.local`, then change these three:

```
NEXT_PUBLIC_APP_DOMAIN=your-domain.com     # no protocol, no port
ADMIN_PASSWORD=                            # unused now, can be removed
RAZORPAY_WEBHOOK_SECRET=                   # filled in at step 7
```

Everything else — Supabase URL and keys, R2 keys, Razorpay keys, `CRON_SECRET`,
`APP_SECRET` — carries over unchanged.

```bash
chmod 600 /var/www/wizart/.env.local
```

It holds the service_role key and the R2 secret. Anyone who reads it owns the
database.

---

## 4 — Build, then run it on its own port

```bash
cd /var/www/wizart
npm run build
```

The build needs ~1 GB. There is 5.5 GB free, so it will not be OOM-killed and
will not disturb anything else.

```bash
cat > /etc/systemd/system/wizart.service <<'EOF'
# /etc/systemd/system/wizart.service
[Unit]
Description=Wizart Studio
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/wizart
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /var/www/wizart/node_modules/next/dist/bin/next start -p 3211 -H 127.0.0.1
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now wizart
systemctl status wizart --no-pager
```

Same shape as the existing `vcard.service`, on port **3211** instead of 3210,
and bound to `127.0.0.1` so it is not reachable from outside except through
Traefik.

Check it before going further:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3211/
# expect 200
```

---

## 5 — Tell Traefik about it

This is the only step that touches Traefik's world, and it only **adds** a file.

```bash
cat > /docker/traefik-cdmh/dynamic/wizart.yml <<'EOF'
http:
  routers:
    wizart:
      rule: "Host(`wizart.pdmmarketing.in`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      service: wizart
  services:
    wizart:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:3211"
EOF

cat /docker/traefik-cdmh/dynamic/wizart.yml
```

Two deliberate choices here. The heredoc is quoted (`<<'EOF'`), so the shell
leaves the backticks alone instead of trying to run what is inside them — which
means the hostname is written out literally rather than through `$DOMAIN`.

And **no `www.` host.** Hostinger has no `www.wizart` record, so including it
would make Let's Encrypt ask for a certificate covering a name that does not
resolve, and the whole request fails — including the part that would have worked.

Read it back and check the backticks came out as plain backticks around a bare
hostname. **This is exactly where the existing `volt-pine.yml` looks wrong** —
its `www` host appears to contain a markdown link rather than a hostname, which
would mean `www.voltandpine.com` never routes.

Traefik picks the file up within a second or two. No restart:

```bash
docker logs --tail 30 traefik-cdmh-traefik-1 2>&1 | grep -i -E 'wizart|error'
```

---

## 6 — Check both sites

```bash
curl -sI https://$DOMAIN | head -3          # ours: expect 200
curl -sI https://voltandpine.com | head -3  # client: must still be 200
curl -sI https://cards.pdmmarketing.in | head -3   # old vcard: still 200
```

Then the proof that we changed nothing:

```bash
md5sum /docker/traefik-cdmh/docker-compose.yml \
       /docker/traefik-cdmh/dynamic/dashboard.yml \
       /docker/traefik-cdmh/dynamic/vcard.yml \
       /docker/traefik-cdmh/dynamic/volt-pine.yml \
       /docker/traefik-cdmh/dynamic/worker.yml
diff <(grep -v wizart /root/before-deploy.md5) - && echo "NOTHING EXISTING CHANGED"
```

**Also open voltandpine.com in a browser and put one test payment through it.**
A 200 on the homepage does not prove the payment path still works, and that is
the part that costs real money when it breaks.

---

## 7 — Razorpay webhook

Razorpay dashboard → Settings → Webhooks → Add:

```
URL     https://$DOMAIN/api/webhooks/razorpay
Event   payment.captured        (only this one)
Secret  <generate a long random string>
```

Put that secret into `.env.local` as `RAZORPAY_WEBHOOK_SECRET`, then:

```bash
systemctl restart wizart
```

Until this is done, payments will go through at Razorpay but **no account will
switch on and no wallet will be credited** — the webhook is what does that.

Test it with a real ₹1 payment and watch:

```bash
journalctl -u wizart -f | grep razorpay
```

---

## 8 — The nightly renewal job

```bash
crontab -e
```

Add:

```
0 2 * * * curl -s -H "x-cron-secret: PASTE_CRON_SECRET_HERE" https://your-domain.com/api/cron/renewals >> /var/log/wizart-cron.log 2>&1
```

`CRON_SECRET` is in `.env.local`. Without the header the endpoint answers 404,
so this is not something anyone else can trigger.

Test it once by hand first:

```bash
curl -s -H "x-cron-secret: $(grep CRON_SECRET /var/www/wizart/.env.local | cut -d= -f2)" \
     https://$DOMAIN/api/cron/renewals
# expect {"ok":true,"processed":0,...}
```

---

## Rollback — under a minute

```bash
rm /docker/traefik-cdmh/dynamic/wizart.yml    # routing gone, Traefik reloads itself
systemctl stop wizart && systemctl disable wizart
```

The client's site is untouched throughout, because nothing we did was ever part
of it.

---

## Afterwards

- `*** System restart required ***` is pending. Do it at a quiet hour, not now
  — a reboot takes the client's site down for a minute too.
- `ufw` is inactive and Docker publishes n8n (32770), hermes (32769) and
  evolution-api (32768) on 0.0.0.0. Those are reachable from the internet.
  n8n in particular can run arbitrary code from a workflow. Worth checking each
  has authentication, separately from this deploy.
- Only take the old `vcard` service down once every client has moved to the new
  one — and only delete the old Supabase project after that.
