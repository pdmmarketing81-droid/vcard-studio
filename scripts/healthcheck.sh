#!/usr/bin/env bash
# Watch our own app and bring it back if it falls over.
#
# Runs every 5 minutes from cron. Two checks, because they fail differently:
# a dead process answers nothing, while a live process with a broken database
# answers 503 — and only the second one is invisible without asking properly.
#
# It restarts ONCE and then stops trying. A service that crashes on boot and is
# restarted every five minutes for a week fills the disk with logs and hides
# the original error. If the second check still fails, it stays down and loud.
#
# Only ever touches wizart.service. The client's site runs under pm2 and is not
# referenced anywhere in this file.

set -uo pipefail

URL="https://wizart.pdmmarketing.in/api/health"
LOG="/var/log/wizart-health.log"
STATE="/run/wizart-health.restarted"

say() { echo "$(date '+%F %T') $*" >> "$LOG"; }

code=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$URL" || echo "000")

if [ "$code" = "200" ]; then
  [ -f "$STATE" ] && { say "recovered (200)"; rm -f "$STATE"; }
  exit 0
fi

say "unhealthy: HTTP $code"

if [ -f "$STATE" ]; then
  say "already restarted once and still down — leaving it alone, needs a human"
  exit 1
fi

touch "$STATE"
say "restarting wizart.service"
systemctl restart wizart
sleep 20

code=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$URL" || echo "000")
say "after restart: HTTP $code"
