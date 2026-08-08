#!/usr/bin/env bash
# ============================================================================
#  READ-ONLY VPS AUDIT
#
#  This script CHANGES NOTHING. It only reads and prints.
#  No installs, no writes, no restarts, no config edits.
#
#  Run it on the VPS that already hosts your client's website, then send me
#  the output. I'll write the exact config for your server from it.
#
#      bash audit-vps.sh > audit.txt 2>&1
#
#  Read audit.txt yourself before sending — it may contain domain names.
#  It does not print passwords, keys or env files.
# ============================================================================

line() { printf '\n===== %s =====\n' "$1"; }

line "SYSTEM"
cat /etc/os-release 2>/dev/null | grep -E '^(NAME|VERSION)=' || echo "unknown"
echo "kernel: $(uname -r)"
echo "uptime: $(uptime -p 2>/dev/null)"

line "RESOURCES  (Next.js needs ~1GB free during build)"
free -h 2>/dev/null || echo "free not available"
echo "--- disk ---"
df -h / 2>/dev/null
echo "--- swap ---"
swapon --show 2>/dev/null || echo "no swap configured"

line "WHO OWNS PORT 80 AND 443  (this decides the whole plan)"
# The single most important question. A previous audit found Traefik holding
# both ports with nginx stopped — writing an nginx block on that server would
# have produced a site that never answered, and the mistake would have looked
# like a DNS problem for hours.
ss -tlnp 2>/dev/null | grep -E ':80\s|:443\s' || netstat -tlnp 2>/dev/null | grep -E ':80\s|:443\s' || echo "could not read listeners (try with sudo)"

line "WEB SERVER / PROXY"
for s in nginx apache2 httpd caddy traefik openlitespeed lshttpd; do
  if command -v "$s" >/dev/null 2>&1 || systemctl list-units --type=service 2>/dev/null | grep -q "$s"; then
    echo "found: $s"
    systemctl is-active "$s" 2>/dev/null | sed "s/^/  status: /"
  fi
done
nginx -v 2>&1 | sed 's/^/nginx version: /'

line "DOCKER  (Traefik usually lives here)"
if command -v docker >/dev/null 2>&1; then
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' 2>/dev/null || echo "docker present but not readable as this user"
  echo "--- compose files ---"
  find / -maxdepth 5 -name 'docker-compose*.y*ml' -not -path '*/node_modules/*' 2>/dev/null | head -10
else
  echo "docker not installed"
fi

line "TRAEFIK CONFIG  (read-only; we must not touch these)"
find / -maxdepth 6 \( -name 'traefik*.y*ml' -o -name 'traefik*.toml' -o -name 'dynamic*.y*ml' \) -not -path '*/node_modules/*' 2>/dev/null | head -10
echo "--- md5 of each, so we can prove afterwards that we changed nothing ---"
find / -maxdepth 6 \( -name 'traefik*.y*ml' -o -name 'traefik*.toml' -o -name 'dynamic*.y*ml' \) -not -path '*/node_modules/*' 2>/dev/null | head -10 | xargs -r md5sum 2>/dev/null

line "WHAT IS ALREADY RUNNING  (the old vCard app lives here too)"
if command -v pm2 >/dev/null 2>&1; then pm2 list 2>/dev/null; else echo "pm2 not installed"; fi
echo "--- node processes ---"
ps aux 2>/dev/null | grep -E '[n]ode|[n]ext' | head -10
echo "--- our own systemd units ---"
systemctl list-units --type=service 2>/dev/null | grep -iE 'vcard|next|card' || echo "none named vcard/next/card"

line "CONTROL PANEL  (changes the safe procedure completely)"
for p in /usr/local/cpanel /usr/local/directadmin /usr/local/cwp /usr/local/hestia \
         /usr/local/vesta /opt/psa /usr/local/CyberCP /usr/local/lsws; do
  [ -e "$p" ] && echo "DETECTED: $p"
done
command -v cyberpanel >/dev/null 2>&1 && echo "DETECTED: cyberpanel"
docker ps --format '  {{.Names}}\t{{.Ports}}' 2>/dev/null | sed '1i docker containers:' || true

line "WHAT IS LISTENING  (I must pick a port nobody is using)"
(ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null) | grep LISTEN

line "NGINX SITES  (filenames only — I am not printing your configs)"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null
ls -la /etc/nginx/conf.d/ 2>/dev/null

line "!! DEFAULT_SERVER — THE ONE THAT CAN BREAK THE EXISTING SITE"
grep -rn "default_server" /etc/nginx/ 2>/dev/null | grep -v "^Binary" \
  || echo "none found (good — adding a normal server block is safe)"

line "SERVER NAMES ALREADY CLAIMED"
grep -rhn "server_name" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null \
  | sed 's/^[[:space:]]*//' | sort -u

line "NGINX CONFIG VALIDITY  (must already say 'ok' before we touch anything)"
nginx -t 2>&1

line "EXISTING SSL CERTIFICATES"
certbot certificates 2>/dev/null | grep -E "Certificate Name|Domains|Expiry" \
  || echo "certbot not installed or no certs"

line "NODE / PM2  (a version change could break the other site)"
node -v 2>/dev/null || echo "node: not installed"
npm -v 2>/dev/null  || echo "npm: not installed"
pm2 -v 2>/dev/null  || echo "pm2: not installed"
echo "--- pm2 processes ---"
pm2 list 2>/dev/null || echo "none"

line "OTHER RUNTIMES IN USE"
php -v 2>/dev/null | head -1 || echo "php: not installed"
mysql --version 2>/dev/null || echo "mysql: not installed"

line "OUTBOUND HTTPS  (the app must reach Supabase)"
curl -s -o /dev/null -w "supabase reachable: %{http_code}\n" \
  --max-time 10 https://fgfjjlvcxlwneggfrwvk.supabase.co 2>/dev/null \
  || echo "supabase: NOT reachable"

line "FIREWALL"
ufw status 2>/dev/null || firewall-cmd --list-all 2>/dev/null || echo "ufw/firewalld not present"

line "AUDIT COMPLETE — nothing was modified"
