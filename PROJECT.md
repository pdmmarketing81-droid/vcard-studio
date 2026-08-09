# vCard Studio — project brief

**Isko sabse pehle padho.** Ye file isliye hai ki kisi ki yaaddasht pe bharosa na karna pade —
na aapki, na kisi assistant ki. Chat compile hoti rehti hai aur detail kho jaati hai; ye file
nahi khoti.

Aakhri update: **7 August 2026**

---

## 1. Goal — kya bana rahe hain

Ek **digital vCard / mini-website platform**. Har business ko ek link + QR milta hai jo ek
poora mobile card kholta hai: logo, cover photo ya video, about, services, packages,
gallery, testimonials, business hours, Instagram/YouTube embeds, "Add to contact" button,
aur social links.

Shuruat `profile.nextapsolutions.com` ko dekhkar hui thi — usse behtar banana hai.

Do cheezein saath chal rahi hain:

**A. Card platform** — business details bharo, ek second me card taiyaar. Har industry ke liye
alag template (doctor, restaurant, photography, real estate, salon, classic). Har card
poori tarah customizable — font, background, section order, animation, button style, ratio.

**B. Google review funnel** — har business ka apna QR + link. Customer star deta hai:
4+ → seedha Google review page pe (bina kisi beech ke screen ke), 3 ya kam → private form
jo photo/video ke saath business owner ko email hota hai.

### Aage ka lakshya — sellable SaaS

Ye ab internal agency tool hai. Isse bechne layak SaaS banana hai:

- **2 mega/main admin** — poora control, deep analytics, saare daam inke haath me
- **Unlimited sub-admin (reseller)** — capacity kharidte hain, aage bechte hain
- **End user** — sirf apna card aur review settings edit kar sakta hai

**Wallet model:** sub-admin pehle wallet top-up karta hai. Har card banate hi hamara
commission apne aap kat jaata hai. Uske baad sub-admin end user se poora paisa khud leta hai.

Tay ho chuke faisle (7 Aug 2026):

- **Wallet khali to card banega hi nahi.** Udhaar nahi, negative balance nahi.
- **Har reseller ki apni sharten.** Plan (none/monthly/yearly/lifetime) + flat per-card +
  per-card percentage — koi bhi combination, ya kuch bhi nahi (free deal).
- **Percentage hamesha hamare tay kiye "list price" ka.** Reseller ke bataye hue sale
  price ka nahi — kyunki wo paisa hum tak aata hi nahi aur jhoot pakda nahi ja sakta.
- **Resale price pe koi cap nahi.** Wo idea hata diya gaya: reseller customer se cash/UPI
  me seedha leta hai, to hamare database me likhi hui limit us len-den ko rok hi nahi
  sakti. Wo sirf ek jhootha dilasa hota.
- **Card reseller khud banayega**, apne dashboard se. Har card pe hamari manzoori maangna
  100 reseller pe chalega hi nahi.
- **Balance kahin store nahi hota.** `wallet_transactions` ek ledger hai; balance hamesha
  `sum(amount)` se nikalta hai. Stored balance dheere-dheere galat ho jaata hai (ek update
  chooka, ek retry do baar chala) aur pata bhi nahi chalta. Sum galat ho hi nahi sakta.
  Galti sudharne ke liye ulti `adjustment` line daali jaati hai, purani line kabhi
  badli nahi jaati.
- **Ek card ek hi baar charge hoga** — `wallet_one_charge_per_card` unique index. Form
  do baar submit hua ya request retry hui to bhi paisa do baar nahi katega.

**Sub-admin ka paisa ruk jaye to:** pehle grace period, phir suspend. Par suspended card pe
**hamara** contact detail wala page dikhega — taaki end user khoye nahi, seedha hum tak
pahunche. Uske baad sub-admin delete karke uske customers ke cards apne account me transfer
kar sakte hain.

### Non-negotiable

- **Free tier pe poori taakat se chalna chahiye** — bina paise ke maximum nikalna hai
- **Performance** — "agar optimized nahi hai to koi matlab nahi niklega iska"
- **Security har taraf se** — "i want the system to be secure from everything"
- Card data kabhi browser/localStorage me store nahi karna — leak hua to bada nuksan
  aur legal consequences
- Code aur UI **English** me. Hinglish comments hackers ko ishara dete hain ki
  vibe-coded hai.
- **Client (Volt & Pine) ka kuch bhi nahi chhedna** — na uska Supabase, na Cloudflare,
  na VPS pe uski service

---

## 2. Kaunsi ID pe kya hai — ye yaad rakhna zaroori hai

| Cheez | Kahan | Kis ID pe |
|---|---|---|
| `voltandpine.com` ka DNS | Cloudflare | **nextindm**@gmail.com |
| `volt-pine-dev` project | Supabase | **nextindm**@gmail.com |
| **Purana** vcard database (`fgfjjlvcxlwneggfrwvk`) | Supabase | **nextindm**@gmail.com |
| **Naya** vcard database (`lddahjazptgygzkzkdmi`, ap-south-1) | Supabase | **wizart035**@gmail.com |
| **R2 storage** (bucket `card-media`) | Cloudflare | **wizart035**@gmail.com |
| `pdmmarketing.in` ka DNS | Hostinger | — |
| VPS (client ki site bhi isi pe) | Hostinger | — |

**Client ka saara saamaan `nextindm` pe. Hamara apna naya saamaan `wizart035` pe.**
Ye alag rakhna jaan-boojh kar kiya gaya hai — Supabase ki free limits *per organization*
hoti hain, per project nahi. Ek hi org me dono rakhte to quota aapas me bat jaata.

Cloudflare account ID (wizart035): `5c1e777e59c871037f496cc4f9b8de6b`
R2 public URL: `https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev`

---

## 3. Abhi kahan khade hain

- ✅ Database naye Supabase account me shift — 4 cards, saara content
- ✅ Saari 41 media files Cloudflare R2 pe; database R2 pe point karta hai
- ✅ Naye uploads bhi R2 pe jaate hain (`src/lib/storage.ts`)
- ✅ Upload pe file ke asli bytes check hote hain, browser ke daave pe nahi
- 🚫 **PURANA SUPABASE PROJECT ABHI DELETE NAHI KARNA.**
  VPS pe is app ka **purana version chal raha hai aur wo purane project se juda hai**.
  Project delete karte hi live cards turant tूट jayenge. Sahi kram:
  1. naya version poora bane → 2. VPS pe deploy ho → 3. purana version hataao →
  4. **tab** purana Supabase project delete karo.

  Data ke hisaab se usme bachane layak kuch nahi hai — dono taraf ka table-dar-table
  comparison ho chuka, saara content migrate ho gaya tha. Sirf teen cheezein nahi aayi:
  testimonial avatars (baad me haath se theek kiye), 26 feedback rows, aur view counts.
  Feedback ek-ek karke padha gaya: "Htyh", "not good", "hi" — poora testing data.
  **Rok data ki wajah se nahi hai, live site ki wajah se hai.**

  Us purane version pe ab bhi naye card ban sakte hain. Deploy se pehle ek baar phir
  comparison chalana — jo card beech me bana ho use naye project me copy karna padega.
- ✅ **Accounts aur roles chaalu hain.** Supabase Auth (email + password),
  `profiles` table, teen role, aur RLS policies jo `can_manage_user()` se hokar jaati hain.
  `/login`, `/signup`, `/after-login`, `/suspended`, `/admin` (main_admin), `/my` (end user),
  `/reseller` (sub-admin).
  Purana shared-password wala admin login **hata diya gaya** — fallback nahi chhoda,
  kyunki jo pichla darwaza abhi bhi khulta hai wo band kiya hua darwaza nahi hai.
  Main admin: `wizart035@gmail.com`. Chaaron cards uske naam.
  10 security tests likhe aur chalaye gaye (nakli user bana ke asli hamla) — sab pass.
- ✅ **Wallet, pricing aur renewal chaalu hain.** `reseller_terms` (plan + flat per-card +
  % of list price + card period + renewal rate + limit + grace days),
  `wallet_transactions` ledger, `debit_for_card()`, `renew_card()`, `run_renewals()`.
  Reseller apne customers aur unke cards khud bana sakta hai; wallet khali ho to card
  banta hi nahi. Suspended card gayab nahi hota — `SuspendedCard` hamare contact
  details dikhata hai. Roz ka job `/api/cron/renewals` pe hai, `CRON_SECRET` se bandha.
  Money logic pe 7 + 7 test likhe aur chalaye gaye — sab pass.
- ✅ **Login-as aur audit log chaalu hain.** Main admin kisi bhi non-admin account me
  ghus ke dekh sakta hai (`/admin/users` → "Sign in as"), upar peela banner chalta rehta
  hai. Har paisa aur role wala kaam `audit_log` me likha jaata hai — aur **asli aadmi ka
  naam likha jaata hai**, chahe wo kisi aur ke roop me kaam kar raha ho. `/admin/audit`.
- ✅ **Razorpay ka code taiyaar aur test** — order banana, checkout, signed webhook,
  idempotent credit. Chalne ke liye webhook secret chahiye (webhook localhost pe
  nahi aata; deploy ke baad hi asli test hoga).
- ✅ **Legal pages** — `/terms`, `/privacy`, `/refunds`, `/contact`. Brand naam
  **Wizart Studio**; user ne saaf kaha tha ki koi personal naam ya pata na likha jaye.
  Refund policy: har maamla alag dekha jayega, 7 kaam ke din me jawab.
  **⚠️ Razorpay review me legal naam aur operational address maanga jayega** — wo abhi
  in pages pe nahi hai. `/contact` page ke upar comment me poori baat likhi hai.
- ⏳ Baaki: analytics, card transfer, backups + monitoring, deploy

### Login-as kaise surakshit hai

Cookie me user id + signature hoti hai. Par asli suraksha signature nahi hai — asli
suraksha ye hai ki **har request pe ye bhi check hota hai ki jo sach me logged in hai wo
abhi bhi main_admin hai.** Isliye chori ki hui cookie kisi aur ke browser me bekaar hai,
aur kisi admin ko demote karte hi uska impersonation agli hi request pe khatam ho jaata
hai — koi cookie clear karne की zarurat nahi. Ek main admin doosre main admin ke roop me
nahi ghus sakta.

### Live cards

| Slug | Business | Template |
|---|---|---|
| `elafranzbiz` | ElafranzBiz | classic |
| `pdm-marketing` | PDM Marketing | classic |
| `purandar-digital-marketing` | PDM MARKETING | restaurant |
| `vastu-energy` | Vastu Energy | photography |

Slugs **jaan-boojh kar wahi rakhe gaye hain** — QR chhap chuke hain. Slug badla to
chhape hue QR mar jayenge.

---

## 4. Baaki kaam (roadmap)

Pehle ye, kyunki baaki sab isi pe khada hoga:

1. **Roles, profiles aur login-as** — Supabase Auth, main admin / sub-admin / end user
2. **Sub-admin terms** — main admin daam aur limit set kare
3. **Wallet + Razorpay top-up** — commission auto-debit
4. **Card lifecycle** — expiry, grace period, suspended card pe hamara lead page
5. **Card transfer** — ek account se doosre me
6. **Audit log** — kisne kya kiya
7. **Main admin analytics dashboard**

Phir:

8. Plans table + limit enforcement
9. Razorpay checkout + signed webhooks
10. Legal pages (terms, privacy, refund)
11. Public endpoints pe rate limiting
12. Backups + error/uptime monitoring
13. **Security hardening pass** (neeche list hai)

### Self-serve SaaS — 8 Aug 2026 ka faisla

Ab tak reseller **haath se** banaya jaata tha. Aage aisa hoga ki bahar se aane wala khud
sign up kare, plan chune, pay kare, aur chalu ho jaye. Ad ya Razorpay ka link seedha
landing page pe girega, aur wahin footer me legal pages honge.

**Do tarah ke khareedar, dono khud khareed sakte hain:**

| | Reseller | Seedha dukaandar |
|---|---|---|
| Chahiye kya | aage bechne ki capacity | apne liye ek card |
| Paisa kaise | **wallet** — pehle bharo, har card us se kate | **seedha card ka paisa**, ek baar |
| Kiske neeche | koi nahi | koi nahi (`parent_id` null = hamara) |
| Role | `sub_admin` | `end_user` |

Wallet sirf reseller ke liye hai. Ek akele dukaandar ko wallet bharwana bekaar jhanjhat
hai — wo card ka paisa deta hai, card mil jaata hai. Renewal pe usse dobara maanga jayega
(suspended page pe "renew" button).

**Ye ban chuka hai:** `/` (landing), `/pricing`, `/admin/plans`, `/signup?plan=…`,
`/checkout`, aur `activate_plan()` jo webhook se account chalu karta hai.

**Ek cheez jo maine badal di:** pehle socha tha ki seedhe dukaandar ko wallet nahi
milega. Par asal me sabko wallet dena **kam** code hai, zyada nahi — renewal ka poora
tantra pehle se wallet pe chalta hai. To dukaandar ka ₹599 bhi uske wallet me jaata hai,
uska ek card wahi kha jaata hai, aur renewal pe wallet khali milta hai → grace → suspended
page pe "renew" button. Usse wallet ka naam kahin nahi dikhaya jaata; use bas apna card
dikhta hai. Ek hi tantra, do dikhawe.

⚠️ **`/pricing` pe abhi mere banaye hue example daam hain** (₹599, ₹2,000, ₹5,000…).
Deploy se pehle `/admin/plans` se badalne hain.

### Bechne ke do tarike — dono saath chalte hain

| | **Custom** | **Plan se** |
|---|---|---|
| Kaise | `/admin/users` → Add someone → Reseller | `/pricing` → plan → signup → Razorpay |
| Sharten | aap haath se, har cheez alag | plan se copy ho jaati hain |
| `plan_id` | **null** | plan ki id |
| Paisa | aap wallet me daalte ho | Razorpay se apne aap |

**Plan badalne se kisi purane par asar nahi hota.** Custom wale ka plan se rishta hi nahi;
plan wale ki sharten signup ke waqt copy ho chuki hoti hain. Isliye `/admin/plans` pe
daam badalna hamesha surakshit hai.

Kisi bhi reseller ki sharten baad me `/admin/users/[id]` se badli ja sakti hain, chahe wo
kaise bhi aaya ho.

**Ek chhed jo pakda aur band kiya (8 Aug):** custom reseller `/pricing` se plan khareed
kar apni khaas sharten mita sakta tha — `activate_plan()` unhe overwrite kar deta hai.
Ab `/api/checkout` kisi bhi `sub_admin` ko, aur jiske paas pehle se plan hai use, plan
khareedne se rokta hai.

**Legal pages har page ke footer me** — Razorpay ko domain bhejenge, wo landing page
kholega, footer se terms/privacy/refunds/contact mil jayenge.

### UI reorganise (baad me karna hai — user ne bola)

Abhi sab kuch "code jaisa" dikhta hai, saaf nahi. Jo pakka batana hua:

- **Main admin ke `/admin` pe sub-admin ke cards bhi mil jaate hain.** Aisa nahi hona
  chahiye. Sahi tarika: `/admin/users` (People) pe sirf log dikhein → kisi ek reseller pe
  click karo → uske customers aur uske banaye hue cards wahin dikhein.
- Baaki interface ke badlaav user baad me batayenge.

### 🚨 VPS pe client ki live site hai — usme PAYMENT INTEGRATION hai

Volt & Pine ki website usi VPS pe chal rahi hai **aur usme payment integration hai**
(user ne 8 Aug ko bataya; ye baat compaction me kho gayi thi, isliye yahan likhi hai).

**Iska matlab deploy ke liye kya hai:**

Payment gateway apne **webhooks** ek fix URL pe bhejta hai. Agar hamare deploy me koi
aisi routing jud jaye jo un requests ko beech me pakad le ya raasta badal de, to client
ka paisa aana band ho jayega — **aur kisi ko turant pata nahi chalega**, kyunki webhook
fail hone pe browser me kuch nahi dikhta, order bas pending pada rehta hai. Ye woh
tarah ki galti hai jo do din baad "customers ke paise kat gaye par order nahi aaya"
banke saamne aati hai.

**Isliye ye niyam, bina apvaad:**

1. Traefik ki koi bhi config file **chhuni nahi hai**. Deploy se pehle unka md5 lo,
   baad me phir se milao. (Pichli baar aisa hi kiya tha — teeno `OK` aaye the.)
2. Hamara app apne **naye domain** pe, apne **naye port** pe. Koi catch-all rule nahi,
   koi `default_server` nahi, koi wildcard host nahi.
3. Deploy ke baad `voltandpine.com` khud khol ke dekhna, aur **uska payment flow ek
   baar test karna** — sirf homepage 200 dena kaafi nahi hai.
4. Audit me ye dekhna hai ki client ki site kaun se container/service me hai aur uske
   webhook ka raasta kya hai, taaki hum us naam ke aas-paas bhi na jayein.

### Deploy ke bare me — jo pehle pata chala tha

- **VPS pe :80 aur :443 ka maalik Traefik hai, nginx nahi.** Nginx installed hai par
  band pada hai. `DEPLOY-SHARED-VPS.md` me abhi bhi nginx wale steps likhe hain — wo
  us server pe galat hain. Deploy se pehle `audit-vps.sh` dobara chalana hai (usme ab
  Traefik/Docker/PM2 ki jaanch jod di gayi hai) aur uske jawab se plan likhna hai.
- **Purana version wahi VPS pe chal raha hai aur purane Supabase se juda hai.** Naya
  version uske saath-saath chalega, alag port pe. Dono ka RAM milakar ~500 MB — kisi
  bhi dhang ke VPS pe theek. Images ab R2 pe hain, VPS pe nahi.
- Sab clients naye version pe aa jaayein, **tab** purana version aur purana Supabase
  project delete karna hai.

Chhote kaam jo bache hain: card form me draft autosave, Next 14→16 upgrade, lead capture
form, per-card analytics, appointment booking, client intake form, SEO structured data,
Supabase pause guard, design presets, baaki templates ki visual tuning.

---

## 5. Jo abhi tootа hua hai / theek nahi hai

**Data:**

- `purandar-digital-marketing` ka `google_review_url` me **phone number** pada hai
  (`+91 9146919793`), URL nahi. Card live hai. Code ab isse sambhal leta hai (private form
  dikhata hai, dead end nahi), par sahi Google link daalna baaki hai.
- Teen packages me selling price MRP se **zyada** hai
- `vastu-energy` me wahi Instagram URL **chaar baar** hai
- `pdm-marketing` me abhi bhi placeholder content hai

**Security — ye ho chuka:**

- ✅ Public review endpoint pe rate limit (10 minute me 20)
- ✅ Har image se **EXIF/GPS hataya jaata hai** — `lib/imageSafety.ts`, bina kisi image
  library ke, seedha bytes pe. Pixels chhue nahi jaate, quality nahi girti.
- ✅ Image ka asli size header se padha jaata hai; bahut badi tasveer reject
  (chhoti file jo 60000×60000 batati hai — decompression bomb)
- ✅ File ka type uske bytes se tay hota hai, browser ke daave se nahi. SVG band.
- 15 + 7 test likhe aur chalaye gaye; safai ke baad images Pillow se khol ke bhi dekhi gayin.

**Security — abhi baaki:**

- Login/signup pe apna rate limit nahi (Supabase ka apna hai)
- Rate limit is process ki memory me hai — restart pe reset, aur do instance ho to
  dono apni ginti rakhenge. Ek VPS pe theek hai; ek se zyada hue to Postgres me le jaana.

**Local setup:**

- `.env.local` me SMTP settings nahi hain. Localhost pe kam-rating wala feedback
  **database me save hoga par email nahi jayegi**. VPS pe configure hai, wahan chalta hai.

---

## 6. Jo galtiyan ho chuki hain — dobara mat karna

Ye sab asli me hui hain. Har ek pe waqt gaya.

1. **Tailwind runtime-composed classes purge kar deta hai.** `btn-${style}`,
   `social-${style}`, `panel-${style}`, `reveal-${animation}` — ye class names code me
   likhe hue nahi dikhte, isliye Tailwind unhe hata deta hai. Isiliye `globals.css` me ye
   `@layer components` ke **bahar** hain. Andar mat daalna.

2. **`middleware.ts` `src/` ke andar hona chahiye.** Root pe rakha to chup-chaap compile
   hi nahi hoga — koi error nahi, bas custom domains kaam karna band kar denge.

3. **`.env` me `#` comment shuru kar deta hai.** Password me `#` hai to value kat jayegi.

4. **`package.json` me dependency add ki to `package-lock.json` bhi update karo**, warna
   `npm ci` fail hoga. `npm install` chalao aur lock commit karo.

5. **Next `notFound()` ko cache karta hai.** Review enable karne se pehle koi page khol le
   to 404 chipak jaata hai. Isiliye `revalidateCard()` me `revalidatePath('/r/${slug}')` hai.

6. **CSS `transform: scale()` preview ko todta hai** — scaled element apni asli width hi
   ghera rehta hai. Preview ke liye asli 390px container use karo.

7. **VPS pe nginx `default_server` mat likhna.** Khali server pe theek hai, par is shared
   VPS pe wo client ka traffic hijack kar lega. Traefik :80/:443 ka maalik hai, nginx nahi.

8. **`next.config.mjs` me `remotePatterns: hostname: '**'`** ne `/_next/image` ko duniya ke
   liye khula image proxy bana diya tha. Ab `unoptimized: true, remotePatterns: []` hai.

9. **Verification circular nahi honi chahiye.** Ek baar maine migration ke baad wahi columns
   check kiye jo migration ne chhue the — wo test fail ho hi nahi sakta tha. Hamesha *poore*
   database pe scan karo aur destination se seedha pucho ki file wahan hai ya nahi.

10. **Project banate waqt region dekho** — ek project galti se Singapore me ban gaya tha,
    Mumbai (`ap-south-1`) chahiye tha.

11. **Puraani SQL file dobara chalane se naya kaam mit sakta hai.** `seed-existing-cards.sql`
    ek baar galti se dobara chal gayi (doosri file ke saath ek hi editor buffer me paste ho
    gayi thi) aur database ke saare 41 R2 links wapas purane Supabase pe palat gaye. Cards
    tab bhi theek dikh rahe the — kyunki purana project zinda hai — to aankhon se kuch pata
    nahi chalta. Pakda tab gaya jab `view_count` 4 se 0 ho gaya. **Sabak: kisi bhi SQL ke
    baad `deepscan` type ka poora check chalao, screen dekh kar tasalli mat karo.** Ab us
    file ke URLs R2 pe theek kar diye gaye hain aur upar warning laga di hai.

12. **Seed file ne chupchaap kuch cheezein chhod di thi.** Purane aur naye project ka
    table-dar-table comparison karne pe pata chala ki `testimonials.avatar_url` kahin
    laaya hi nahi gaya — ElafranzBiz ke 6 customer photos gayab the, aur card bilkul
    theek dikh raha tha. Baad me haath se theek kiya. **Sabak: migration ke baad dono
    taraf ka count aur null-ness milao, sirf "card khul raha hai" dekhkar aage mat
    badho.** Baaki sab (services, packages, gallery, socials, hours, design) sahi aaya tha.
    Feedback rows aur view counts jaan-boojh kar nahi laaye gaye — wo testing ka data tha.

---

## 7. Verify kaise karein

Kuch bhi "ho gaya" maanne se pehle chala lo. `scripts/` me ye maujood hai:

```bash
npm run migrate:r2:dry     # sirf report, kuch nahi badalta
npm run migrate:r2         # asli migration (kuch delete nahi karta)
```

Migration dobara chalana surakshit hai — jo pehle se R2 pe hai use chhod deta hai.

Card kholke image pe right-click → "Open image in new tab" → address me `r2.dev`
dikhna chahiye, `supabase.co` nahi. **`.env.local` badlo to dev server restart karo**,
warna Next purana render dikhata rahega.

---

## 8. Technical decisions aur unki wajah

- **R2 vs Supabase Storage** — R2 isliye ki uska **egress bilkul free** hai. Supabase ka
  5 GB/month bandwidth ~100 cards pe khatam ho jaata, aur limit paar hote hi *saare*
  clients ke cards ek saath band ho jaate. R2 pe 10 GB storage + unlimited download.
- **R2 vs Cloudinary** — Cloudinary ke 25 credits storage *aur* bandwidth dono me bat te
  hain, to storage badhne pe bandwidth ghat ti hai. R2 me dono alag.
- **systemd vs PM2** — systemd chuna taaki client ki `dump.pm2` ko haath na lagana pade.
- **Review gating** — 4+ ko Google bhejna aur kam waalon ko rokna Google ki policy ke
  khilaf hai (April 2026 me sakhti badhi). Ye jaan-boojh kar liya gaya risk hai.
- **Review page ka font `system-ui`** — Android pe ye khud Roboto ban jaata hai, kuch
  download nahi hota.
- **`sendBeacon`** — rating page chhodne ke baad bhi bhej deta hai, isliye Google redirect
  me koi rukawat nahi aati.
- **Feedback row uploads se *pehle* insert hota hai** — mobile pe upload beech me toota to
  rating aur likha hua text phir bhi bach jaaye.

---

## 9 Aug 2026 — deployed, then four holes found and closed

Live at **https://wizart.pdmmarketing.in** (systemd `wizart`, port 3211,
Traefik file `wizart.yml`). Client's volt-pine untouched; md5 of every
pre-existing Traefik file verified unchanged after deploy.

### Migrations now in the repo

`001-plans-and-orders.sql` was **recovered from the live database**, not
written. The plans and payment_orders tables and the activate_plan /
handle_payment / credit_topup functions had been applied straight to Postgres
in an earlier session and never written down. A rebuild from files would have
produced an app that looked complete and could not take money.

Order to run: `001` → `schema` → `002`..`008`.

### What was wrong, and why none of it threw an error

1. **RLS leak (006).** `published cards are public` had no role restriction.
   Policies are ORed, so every signed-in user's card query also matched every
   live card. A new customer saw all five existing cards. Editing was never
   possible (canManageCard guards both the page and the API) and drafts were
   never exposed — a bad listing, not a disclosure. Fixed by binding the public
   policies to `anon`; public pages read with a cookie-less client and are
   unaffected.

2. **Direct customers got free, immortal cards (007).** `payer_for_card()`
   returned `parent_id` for an end_user. A self-serve buyer has no parent, so
   the payer was null, and null means "ours: free, never expires". They paid
   ₹599, it sat unspent, and no renewal would ever have asked again.

3. **A paid customer could not make a card.** POST /api/admin/cards allowed
   only main_admin and sub_admin. Fixed; `resolveOwner` pins them to
   themselves and `debit_for_card` enforces the plan's card_limit.

4. **Plans granted nothing (008).** `plans.features` is sales copy that no
   code reads, so the review funnel was on for every plan regardless of price.
   Added `plans.grants` / `reseller_terms.grants` (copied at purchase, like the
   money columns) plus `grants_for()` / `has_grant()`. Everything existing was
   backfilled to `{"reviews": true}` so nobody lost a working feature.

### Upgrades

`payment_orders.purpose` now allows `'upgrade'`. Checkout charges
`new price − plan_price_paid`, and `upgrade_plan()` moves the terms across,
banks the money and immediately spends it (two ledger rows, distinct refs).
It deliberately does **not** extend expires_at — otherwise repeated small
upgrades become cheap renewals.

### Navigation

There was no layout under /admin, /reseller or /my. Every page was an island
whose only exit was /admin. Added `AppShell` + `AppNav` and three thin layouts.
Nav comes from the viewer's role, not the URL.

### Publish

Not a bug. The switch is in AdminForm's Settings tab, off by default for
self-created cards, and nobody found it — so their link said "Card not found".
Added a banner and a Publish button on /my.

### Still open

- Backups, uptime and error monitoring — nothing exists
- Card transfer between accounts
- Main admin analytics
- Razorpay: still test mode, KYC incomplete, no UPI until the account activates
- Supabase Auth **Site URL is still localhost:3000** — confirmation emails
  redirect to a dev machine. Fix in Authentication → URL Configuration.
- The webhook secret was visible in two screenshots; rotate before live mode
