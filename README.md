# vCard Studio

Digital business cards that go live the second you save them. Fill one form —
the card page, QR code, `.vcf` contact download, share links and SEO tags all
generate themselves.

---

## How it actually works

The thing that makes a card appear "in one second" is that **no page is ever
generated**. There is one template engine. Adding a business inserts one
database row, and the template renders that row on demand.

```
Admin form  ──insert──▶  Supabase (businesses + child tables)
                              │
                              ▼
   /[slug]  ──reads the row──▶ renders the card
                              ├─▶ /api/qr/[slug]   QR code (SVG, themed)
                              └─▶ /api/vcf/[slug]  .vcf contact file
```

Custom domains work through `src/middleware.ts`. A request arriving on
`theirdomain.com` doesn't match your app domain, so it's rewritten to
`/d/theirdomain.com`, which looks the card up by its `custom_domain` column and
serves it at `/`. The visitor only ever sees their own domain.

---

## Industry templates

A template is **pure configuration** (`src/lib/templates.ts`). It decides the
palette, the font, the order sections appear in, and what each section is
*called* — "Services" on a generic card becomes "Specializations" on a doctor's
card and "Menu" on a restaurant's.

Sections render only when they have data. So a doctor who happens to upload a
gallery still gets a gallery: the template controls **order and language, not
availability**. Adding a new industry is a config edit, not a new page.

| Template | Leads with | Extra fields collected |
|---|---|---|
| Classic | Generic order | — |
| Doctor / Clinic | Specializations, then hours | Qualifications, experience, registration no., languages |
| Photography / Wedding | Portfolio gallery | Years shooting, coverage area |
| Restaurant / Cafe | Menu and food photos | Cuisine, seating, delivery links |
| Real Estate | Listings, then map | RERA id, areas served |
| Salon / Spa | Treatments and price list | Specialities |

To add one, append an object to `TEMPLATES`. Nothing else needs to change.

---

## Sections available

Hero cover (**image or autoplaying muted video**), logo, name, tagline,
brand-coloured social icons, about (with template-specific credential chips),
contact rows, embedded Google map, services grid, packages with
strikethrough pricing and per-item WhatsApp enquiry buttons, filterable photo
gallery with lightbox, **YouTube + Instagram embeds**, testimonials with star
ratings, business hours with a live **Open now / Closed now** badge, themed QR
code, one-tap `.vcf` download, share sheet, floating WhatsApp button.

YouTube and Instagram are plain iframes — no third-party SDK, so nothing breaks
behind ad blockers.

---

## Setup

Everything in `.env.local` is already filled in.

```bash
npm install
npm run dev
```

Open <http://localhost:3000/admin>, sign in with `ADMIN_PASSWORD`, create a card.

**Storage policy (one-time):** uploads go to a public `card-media` bucket that
already exists. Dashboard → Storage → `card-media` → Policies → if there's no
`SELECT` policy for `public`, add one using the "Allow public read access"
template.

---

## Deploying on your VPS

### 1. Install the runtime

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

### 2. Ship the app

```bash
cd /var/www && git clone <your-repo> vcard && cd vcard
npm ci
cp .env.local.example .env.local   # fill in the real values
npm run build
pm2 start npm --name vcard -- start
pm2 save && pm2 startup            # survives reboots
```

Set `NEXT_PUBLIC_APP_DOMAIN` to your own domain before building — it's baked in
at build time, so changing it later means rebuilding.

### 3. Nginx — one server block for everything

The key detail: **do not** hardcode `server_name` to a single domain. A
catch-all block means any client domain pointed at this VPS is served
automatically, and your only remaining step per client is the SSL certificate.

```nginx
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        'upgrade';
        proxy_set_header   Host              $host;   # ← middleware reads this
        proxy_set_header   X-Forwarded-Host  $host;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 20M;                     # cover video uploads
    }
}
```

`proxy_set_header Host $host` is not optional. Without it Nginx forwards
`Host: 127.0.0.1` and every custom domain silently falls back to your platform
domain.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 4. SSL

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Onboarding a client's own domain

1. In the admin form → **Settings** → set **Custom domain** to `theirdomain.com`.
2. Client points DNS at your VPS:

   | Record | Name | Value |
   |--------|------|-------|
   | `A` | `@` | your VPS IP |
   | `A` | `www` | your VPS IP |

3. Once DNS resolves, issue the certificate:

   ```bash
   sudo certbot --nginx -d theirdomain.com -d www.theirdomain.com
   ```

Done. The card is live at `https://theirdomain.com`, and its QR code
automatically retargets to the custom domain instead of your platform URL.
Both `theirdomain.com` and `www.theirdomain.com` resolve to the same card.

---

## Growing this into a SaaS

The schema is already multi-tenant. `businesses.owner_id` exists and is `NULL`
for cards you create as an agency. The RLS policies that scope every table to
its owner are already written and dormant — they activate the moment a real
`auth.uid()` exists. To flip the switch:

1. Turn on Supabase Auth (email or Google).
2. Set `owner_id` when a signed-in user creates a card.
3. Swap the shared `ADMIN_PASSWORD` gate for a Supabase session check.
4. Add a `plans` table and gate features on it.

No data migration required.

---

## Project layout

```
src/middleware.ts              custom-domain routing  (must live in src/)
supabase/schema.sql            full schema, re-runnable
src/lib/templates.ts           ← add industries here
src/app/[slug]/page.tsx        the public card
src/app/d/[host]/page.tsx      same card, served on a custom domain
src/app/api/vcf/[slug]/        .vcf contact download
src/app/api/qr/[slug]/         themed QR code
src/app/admin/                 password-gated admin
src/components/CardView.tsx    section orchestrator
src/components/sections/       one file per section
src/components/admin/          reusable form widgets
```

To change how every card looks, edit `src/components/CardView.tsx` and
`src/components/sections/`. To add an industry, edit `src/lib/templates.ts`.
