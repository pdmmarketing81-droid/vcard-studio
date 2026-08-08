-- =====================================================================
-- ⚠️  YE FILE APNA KAAM KAR CHUKI HAI — DOBARA CHALANE KI ZARURAT NAHI.
--
--     Ek baar galti se dobara chal chuki hai (schema.sql ke saath ek hi
--     buffer me paste ho gayi thi). Us waqt isme purane Supabase project
--     ke image URLs the, aur chalte hi database ke saare 41 R2 links
--     wapas purane project pe palat gaye. Cards tab bhi dikhte rahe,
--     kyunki purana project abhi zinda hai — isliye pata bhi nahi chalta.
--
--     Ab URLs R2 pe theek kar diye gaye hain, to dobara chalne se ab wo
--     nuksan nahi hoga. Phir bhi: `view_count` reset ho jaata hai aur
--     haath se ki gayi koi bhi edit mit jaati hai. Chalane se pehle soch lo.
--
--     Agar kabhi shak ho ki URLs palat gaye hain:
--         npm run migrate:r2      -- files dobara upload nahi hoti,
--                                 -- sirf database ke pointers theek hote hain
-- =====================================================================

-- =====================================================================
-- The four real cards, copied out of the old project.
--
-- Run AFTER schema.sql, on the new project. Re-runnable: each card is
-- deleted by slug first, so running it twice replaces rather than
-- duplicates.
--
-- Slugs are preserved deliberately. QR codes for these cards are already
-- printed and shared — a changed slug kills every one of them.
--
-- Image URLs still point at the OLD project's storage. That is fine and
-- intended: those URLs are public and keep working while the old project
-- exists. They get rewritten when media moves to R2. Do not delete the
-- old project before that happens.
--
-- FOUR THINGS ARE WRONG IN THIS DATA. They are copied as-is rather than
-- silently corrected — it is your clients' content, not mine to change.
-- Each is flagged inline. Fix them in /admin after this runs.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. ElafranzBiz
-- ─────────────────────────────────────────────────────────────────────
do $$
declare bid uuid;
begin
  delete from public.businesses where slug = 'elafranzbiz';

  insert into public.businesses
    (slug, name, tagline, about, template, theme_color, email, phone, whatsapp,
     address, website, logo_url, cover_url, cover_type, published,
     review_enabled, review_threshold, extras, design)
  values (
    'elafranzbiz',
    'ElafranzBiz',
    'From Registration to Returns – We Handle It All.',
    'ElafranzBiz  is your trusted partner for taxation, GST, Income Tax Return (ITR), accounting, audits, business registration, and financial consulting. We provide accurate, transparent, and timely solutions to help individuals, startups, and businesses stay compliant, manage finances efficiently, and achieve sustainable growth with confidence and professional expertise.',
    'classic', '#0f766e',
    'info.elafranzbiz@gmail.com', '+91 8898985060', '+91 8898985060',
    'Elafranz, office no.  401, Pearl Square Building, above dwarka sweets, handewadi Road Satavnagar Hadapsar Pune 411028',
    null,
    'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/logos/1785420299482-j96kib.webp',
    'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/covers/1785420775850-nt8uxu.mp4',
    'video', true, false, 4, '{}'::jsonb,
    '{"panel":"elevated","hidden":["share","packages"],"radius":"pill","animation":"tilt","heroRatio":"16:11","heroShape":"rounded","heroStyle":"overlap","textScale":"md","background":"aurora","embedWidth":"medium","socialSize":"md","buttonStyle":"gradient","headingFont":"playfair","socialStyle":"squircle","galleryRatio":"1:1","packageRatio":"1:1","serviceRatio":"1:1","packageLayout":"card","animationSpeed":"slow","galleryColumns":4,"packageColumns":2,"buttonAnimation":"pulse"}'::jsonb
  ) returning id into bid;

  insert into public.social_links (business_id, platform, url, sort_order) values
    (bid,'instagram','https://www.instagram.com/elafranz.biz?igsh=MTc0cGFydmZyZGdtag==',0),
    (bid,'facebook','https://www.facebook.com/share/1C3tNEqopZ/',1),
    (bid,'whatsapp','https://wa.me/918898985060?utm_source=chatgpt.com',2),
    (bid,'custom','https://cards.pdmmarketing.in/elafranzbiz',3);

  insert into public.services (business_id, title, image_url, sort_order) values
    (bid,'GST','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785420221167-9ox7wp.webp',0),
    (bid,'Income Tax Return (ITR) Filing','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785422070920-ox2oe4.webp',1),
    (bid,'TAN Registration','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785422275470-bdlddd.webp',2),
    (bid,'New Business Setup','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785422425209-pi1f6u.webp',3),
    (bid,'Sole Proprietorship Registration','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785422602538-ttjbgh.webp',4),
    (bid,'Partnership Firm Registration','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785424231497-gdvx9r.webp',5),
    (bid,'LLP Registration','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785424328208-nwupjh.webp',6),
    (bid,'Private Limited Company Incorporation','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785424436909-n50s5a.webp',7),
    (bid,'One Person Company (OPC) Registration','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785424619492-x54x0q.webp',8),
    (bid,'Public Limited Company Registration','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785424827181-uxf58g.webp',9);

  insert into public.testimonials (business_id, author, quote, rating, sort_order) values
    (bid,'Samir Jagtap','Highly satisfied with the quality and efficiency of their work.',5,0),
    (bid,'Kapil Gaikwad','Affordable services with exceptional professionalism.',5,1),
    (bid,'kajol kale','A trusted partner for taxation and business solutions.',5,2),
    (bid,'Sahil Bagwan','Quick response, expert advice, and outstanding support.',5,3),
    (bid,'Rashmi Landge','Great experience with company registration and compliance services.',5,4),
    (bid,'kunal zende','Made my ITR filing simple and stress-free.',5,5);

  insert into public.gallery_items (business_id, image_url, sort_order)
  select bid, 'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/gallery/' || f, i
  from unnest(array[
    '1785425366095-kjo4bn.webp','1785425371551-lheegp.webp','1785425376868-01w7s0.webp',
    '1785425381332-bypoqv.webp','1785425386932-k2w6g1.webp','1785425391763-r0ke1s.webp',
    '1785425396508-n58m5h.webp'
  ]) with ordinality as t(f, i);

  insert into public.business_hours (business_id, day_of_week, open_time, close_time, closed)
  select bid, d, '10:00', '19:00', false from generate_series(0,6) as d;
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- 2. PDM MARKETING  (purandar-digital-marketing)
--
-- ⚠️ google_review_url below is a PHONE NUMBER, not a URL. Every customer
--    who taps 4 or 5 stars currently goes nowhere. Copied as-is so the
--    card matches what is live; fix it in /admin → Reviews.
-- ⚠️ Two packages have selling_price ABOVE net_price, so no discount
--    renders. Also copied as-is.
-- ─────────────────────────────────────────────────────────────────────
do $$
declare bid uuid;
begin
  delete from public.businesses where slug = 'purandar-digital-marketing';

  insert into public.businesses
    (slug, name, tagline, about, template, theme_color, email, phone, whatsapp,
     address, website, logo_url, cover_url, cover_type, published,
     review_enabled, google_review_url, feedback_email, review_threshold,
     review_headline, review_thanks, extras, design)
  values (
    'purandar-digital-marketing',
    'PDM MARKETING',
    'All Tips Of Business',
    'Grow your business with Purandar Digital Media through our affordable and results-driven digital marketing package. Build your online presence, attract more customers, and increase engagement with professional marketing services.',
    'restaurant', '#b45309',
    'purandardigitalmedia@gmail.com', '+919146919793', '+919146919793',
    'Saswad', 'Www.pdmmarketin.in',
    'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/logos/1785350728262-6nnljg.webp',
    'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/covers/1785401509385-lr0zeg.mp4',
    'video', true,
    true, '+91 9146919793', 'purandardigitalmedia@gmail.com', 4,
    'how was your experience ?', 'thankyou', '{}'::jsonb,
    '{"order":["about","contact","services","packages","gallery","testimonials","hours","videos","map","share","qr"],"panel":"elevated","hidden":["share"],"radius":"soft","bodyFont":"inter","animation":"rise","heroRatio":"16:9","heroShape":"rounded","heroStyle":"overlap","textScale":"md","background":"butter","embedWidth":"wide","socialSize":"md","buttonStyle":"glow","embedLayout":"carousel","headingFont":"playfair","socialStyle":"glass","galleryRatio":"1:1","gallerySpeed":4,"packageRatio":"1:1","serviceRatio":"1:1","packageLayout":"card","animationSpeed":"slow","galleryColumns":4,"packageColumns":1,"serviceColumns":2,"buttonAnimation":"shine","galleryAutoplay":true}'::jsonb
  ) returning id into bid;

  insert into public.social_links (business_id, platform, url, sort_order) values
    (bid,'instagram','https://www.instagram.com/pdm_marketing_/?hl=en',0),
    (bid,'facebook','https://www.facebook.com/purandardigitalmedia',1),
    (bid,'whatsapp','https://wa.me/919146919793?text=Hello%2C%20I%20would%20like%20more%20information',2),
    (bid,'custom','https://cards.pdmmarketing.in/',3);

  insert into public.services (business_id, title, description, image_url, sort_order) values
    (bid,'Digital marketing',
     'Grow your business with Purandar Digital Media through our affordable and results-driven digital marketing package. Build your online presence, attract more customers, and increase engagement with professional marketing services.',
     'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785351586023-sowkjr.webp',0);

  insert into public.packages (business_id, title, description, image_url, net_price, selling_price, badge, sort_order) values
    (bid,'6000rs monthly growth package',
     E'📦 Package Includes:\n✅ Meta Ads Management\n✅ Content Calendar\n✅ 15 Creative Graphic Designs\n✅ 8 Google Business Profile (GMB) Posts\n✅ 4 Professional Reels (30 Seconds Each)\n✅ Social Media Account Handling\n✅ CRM Support',
     'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/packages/1785351689740-o1bk5z.webp',
     9999, 6000, 'Best', 0),
    -- ⚠️ selling (5999) > MRP (3999)
    (bid,'3999 Startic plan',
     E'📦 Package Includes:\n✅ Meta Ads Management\n✅ Content Calendar\n✅ 15 Creative Graphic Designs\n✅ 8 Google Business Profile (GMB) Posts\n✅ 4 Professional Reels (30 Seconds Each)\n✅ Social Media Account Handling\n✅ CRM Support',
     'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/packages/1785351737958-h11fbl.webp',
     3999, 5999, 'nice', 1),
    -- ⚠️ selling (40000) > MRP (30000)
    (bid,'Compleat marketing packages',
     E'📦 Package Includes:\n✅ Meta Ads Management\n✅ Content Calendar\n✅ 15 Creative Graphic Designs\n✅ 8 Google Business Profile (GMB) Posts\n✅ 4 Professional Reels (30 Seconds Each)\n✅ Social Media Account Handling\n✅ CRM Support',
     'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/packages/1785351807088-i3q7bb.webp',
     30000, 40000, 'year', 2);

  insert into public.gallery_items (business_id, image_url, sort_order)
  select bid, 'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/gallery/' || f, i
  from unnest(array[
    '1785351867323-2lrmn9.webp','1785351881855-msvlc5.webp','1785351887546-jdki3o.webp'
  ]) with ordinality as t(f, i);
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- 3. Vastu Energy
--
-- ⚠️ The same Instagram URL is stored four times, so the card shows four
--    identical icons. Copied as-is.
-- ⚠️ The package has selling (45000) above MRP (40000).
-- ─────────────────────────────────────────────────────────────────────
do $$
declare bid uuid;
begin
  delete from public.businesses where slug = 'vastu-energy';

  insert into public.businesses
    (slug, name, tagline, about, template, theme_color, email, phone, whatsapp,
     address, website, logo_url, cover_url, cover_type, published,
     review_enabled, google_review_url, feedback_email, review_threshold,
     review_headline, review_thanks, extras, design)
  values (
    'vastu-energy',
    'Vastu  Energy',
    'Dr Nitin bhongale',
    E'Astrology & Vastu Shastra Research Centre\n\nVEDIC ASTROLOGY NUMEROLOGY PALMISTRY-VASTU & HOROSCOPE CONSULTANT\n\nMEDICAL ASTROLOGY GEMS ASTROLOGY NATURAL HEALING & MEDITATION CENTRE\n\nVISIT IN ALL TYPES OF VASTU: PLOTS, HOTELS, SHOPS, FACTORIES, FARMHOUSES, OFFICES, BANKS\n\nALL TYPES OF GEMS, CRYSTALS & RUDRAKSHA AVAILABLE FOR SALE',
    'photography', '#9d174d',
    'vastuenergy.2010@gmail.com', '9637051234', '9637051234',
    'Yashwantnagar ,swrupnagar akluj', 'www.vastuenergy.com',
    'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/logos/1785395346311-59476c.webp',
    'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/covers/1785395330579-hj3rzf.webp',
    'image', true,
    true, 'https://search.google.com/local/writereview?placeid=ChIJqf4yIVICwzsRURshk1k1N6k',
    'wizart035@gmail.com', 4, 'how was your experience ?', 'thankyou', '{}'::jsonb,
    '{"order":["about","contact","services","packages","gallery","testimonials","videos","hours","map","qr","share"],"panel":"glass","hidden":["share"],"radius":"sharp","bodyFont":"poppins","animation":"zoom","heroRatio":"3:4","heroShape":"rounded","heroStyle":"overlap","textScale":"md","background":"peach","socialSize":"md","buttonStyle":"glow","headingFont":"poppins","socialStyle":"glass","animationSpeed":"slow","buttonAnimation":"press"}'::jsonb
  ) returning id into bid;

  insert into public.social_links (business_id, platform, url, sort_order)
  select bid, 'instagram', 'https://www.instagram.com/bhumika04__?igsh=MTN4azByOWcxeHZpNw==', i
  from generate_series(0,3) as i;

  insert into public.services (business_id, title, description, image_url, sort_order) values
    (bid,'Stones','Gems stone manik ruby pachu nilam',
     'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785399523733-irszyw.webp',0);

  insert into public.packages (business_id, title, description, image_url, net_price, selling_price, badge, sort_order) values
    (bid,'Factory visiting charges','Remindies ,consultancy,and more',
     'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/packages/1785399442338-1yt7i9.webp',
     40000, 45000, 'Best seller', 0);

  insert into public.testimonials (business_id, author, role, quote, rating, sort_order) values
    (bid,'Bhumika','Client','Energy roads',5,0);

  insert into public.business_hours (business_id, day_of_week, open_time, close_time, closed) values
    (bid,0,null,null,true);
  insert into public.business_hours (business_id, day_of_week, open_time, close_time, closed)
  select bid, d, '10:00', '19:00', false from generate_series(1,6) as d;
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- 4. PDM Marketing  (pdm-marketing)
--
-- ⚠️ This card is live but still holds placeholder content — about is
--    "Hi My", a service called "xyz", a package called "test". Carried
--    over so nothing is lost; clean it up in /admin.
-- ─────────────────────────────────────────────────────────────────────
do $$
declare bid uuid;
begin
  delete from public.businesses where slug = 'pdm-marketing';

  insert into public.businesses
    (slug, name, tagline, about, template, theme_color, email, phone, whatsapp,
     address, website, logo_url, cover_url, cover_type, published,
     review_enabled, google_review_url, feedback_email, review_threshold, extras, design)
  values (
    'pdm-marketing',
    'PDM Marketing',
    'Sagar Jagtap',
    'Hi My',
    'classic', '#9d174d',
    'purandardigitalmedia@gmail.com', '+919146919793', '9146919793',
    'saswad', 'www.pdmmarketing.com',
    'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/logos/1785767276464-yecu8z.webp',
    'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/covers/1785767288194-8dnup1.webp',
    'image', true,
    true, 'https://g.page/r/CZGFV92DwQoPEBM/review', 'purandardigitalmedia@gmail.com', 4,
    '{}'::jsonb,
    '{"order":["about","contact","services","packages","gallery","videos","testimonials","hours","map","qr","share"],"panel":"solid","hidden":[],"radius":"tight","bodyFont":"inter","animation":"zoom","heroRatio":"16:11","heroShape":"rounded","heroStyle":"overlap","textScale":"md","background":"sand","embedWidth":"wide","socialSize":"md","videoRatio":"1:1","buttonStyle":"gradient","embedLayout":"stack","headingFont":"inter","socialStyle":"glass","gallerySpeed":2,"packageRatio":"1:1","packageLayout":"card","animationSpeed":"slow","galleryColumns":2,"instagramRatio":"1:1","packageColumns":1,"buttonAnimation":"pulse","galleryAutoplay":true}'::jsonb
  ) returning id into bid;

  insert into public.services (business_id, title, description, image_url, sort_order) values
    (bid,'xyz','test','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/services/1785767156639-t8gcjh.webp',0);

  insert into public.packages (business_id, title, description, image_url, net_price, selling_price, badge, sort_order) values
    (bid,'test','xyz','https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/packages/1785767189985-fpvc9r.webp',12000,6000,'Nice',0);

  insert into public.testimonials (business_id, author, quote, rating, sort_order) values
    (bid,'sagar','nice products',4,0);

  insert into public.gallery_items (business_id, image_url, sort_order)
  select bid, 'https://pub-d133dda6bf0e4966b282ef33efb79e5d.r2.dev/gallery/' || f, i
  from unnest(array[
    '1785767297635-iom61g.webp','1785767302929-ur8fjz.webp','1785767307773-sqc619.webp',
    '1785767312684-09ncpz.webp','1785767317270-s1dcfm.webp'
  ]) with ordinality as t(f, i);

  insert into public.business_hours (business_id, day_of_week, open_time, close_time, closed) values
    (bid,0,null,null,true);
  insert into public.business_hours (business_id, day_of_week, open_time, close_time, closed)
  select bid, d, '10:00', '19:00', false from generate_series(1,6) as d;
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- Check
-- ─────────────────────────────────────────────────────────────────────
select b.slug, b.name, b.template,
       (select count(*) from public.services s      where s.business_id=b.id) as services,
       (select count(*) from public.packages p      where p.business_id=b.id) as packages,
       (select count(*) from public.gallery_items g where g.business_id=b.id) as gallery,
       (select count(*) from public.testimonials t  where t.business_id=b.id) as testimonials
from public.businesses b order by b.slug;
