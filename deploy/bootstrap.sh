#!/usr/bin/env bash
# One-shot server setup, run as root on a fresh Ubuntu 24.04 Lightsail instance.
#
#   sudo SITE_ADDR=":80" bash bootstrap.sh
#   sudo SITE_ADDR="brics-helpdesk.duckdns.org" bash bootstrap.sh
#
# SITE_ADDR is the address Caddy serves on. ":80" serves plain HTTP on the bare
# IP, which is the staging state before DNS exists. A hostname makes Caddy fetch
# a Let's Encrypt certificate automatically.
#
# Idempotent: safe to re-run after changing SITE_ADDR or pulling new code.
set -euo pipefail

REPO="${REPO:-https://github.com/AGAMDAYAL2424/BTPC.git}"
APP_DIR=/srv/brics
APP_USER=brics
ENV_FILE=/etc/brics-faq.env
SITE_ADDR="${SITE_ADDR:?set SITE_ADDR to \":80\" or a hostname}"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

log "Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git sqlite3 ca-certificates debian-keyring debian-archive-keyring apt-transport-https

# Ubuntu 24.04 ships Node 18; package.json requires >= 20 and Next 15 wants newer.
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  log "Node 22 from NodeSource"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
node -v && npm -v

if ! command -v caddy >/dev/null; then
  log "Caddy"
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy
fi

log "Application user and code"
id -u "$APP_USER" >/dev/null 2>&1 || useradd -r -m -d "$APP_DIR" -s /bin/bash "$APP_USER"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --quiet origin main
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard --quiet origin/main
else
  # useradd already created the home directory, so clone into it rather than over it.
  sudo -u "$APP_USER" git clone --quiet "$REPO" "$APP_DIR/src"
  shopt -s dotglob && mv "$APP_DIR/src"/* "$APP_DIR/" && rmdir "$APP_DIR/src" && shopt -u dotglob
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi

log "Environment"
if [ ! -f "$ENV_FILE" ]; then
  # Generated here and never transcribed anywhere. In production the app throws
  # on the first request without it, deliberately, rather than falling back to a
  # weak value.
  SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  if [ "$SITE_ADDR" = ":80" ]; then
    PUBLIC_URL="http://$(curl -s --max-time 5 ifconfig.me || echo localhost)"
  else
    PUBLIC_URL="https://$SITE_ADDR"
  fi
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=3000
AI_PROVIDER=none
SESSION_SECRET=$SECRET
NEXT_PUBLIC_SITE_URL=$PUBLIC_URL
DATABASE_URL=$APP_DIR/data/brics-faq.db
TRUSTED_PROXY_HOPS=1
SESSION_FLOOD_MAX=60
ADDRESS_DEGRADE_MAX=2000
ADDRESS_THROTTLE_MAX=6000
EOF
  chmod 600 "$ENV_FILE"
  echo "wrote $ENV_FILE (NEXT_PUBLIC_SITE_URL=$PUBLIC_URL)"
else
  echo "$ENV_FILE exists, leaving it alone"
fi

log "Install and build"
# --ignore-scripts on purpose. better-sqlite3 ships prebuilt binaries for every
# platform including linux-x64, but it also ships a binding.gyp and declares no
# install script, so npm applies its documented default of compiling with
# node-gyp - which drags in a whole toolchain to rebuild a binary the package
# already contains, and fails without one. Only esbuild (vitest) and fsevents
# (macOS) have real install scripts here, and neither is needed to build or run.
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci --ignore-scripts
sudo -u "$APP_USER" node -e "new (require('better-sqlite3'))(':memory:'); console.log('better-sqlite3 loads its prebuilt binary: ok')"

set -a; . "$ENV_FILE"; set +a
KEEP=NODE_ENV,NEXT_PUBLIC_SITE_URL,DATABASE_URL,SESSION_SECRET,AI_PROVIDER,TRUSTED_PROXY_HOPS
sudo -u "$APP_USER" --preserve-env="$KEEP" npm run build
sudo -u "$APP_USER" --preserve-env="$KEEP" npm run db:init

log "Service"
install -m 644 "$APP_DIR/deploy/brics-faq.service" /etc/systemd/system/brics-faq.service
systemctl daemon-reload
systemctl enable --now brics-faq
systemctl restart brics-faq

log "Caddy"
sed "s|^brics-helpdesk\.duckdns\.org {|${SITE_ADDR} {|" "$APP_DIR/deploy/Caddyfile" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl restart caddy

log "Backups"
chmod 755 "$APP_DIR/deploy/backup-db.sh"
( crontab -u "$APP_USER" -l 2>/dev/null | grep -v backup-db.sh || true
  echo "0 * * * * DATABASE_URL=$APP_DIR/data/brics-faq.db $APP_DIR/deploy/backup-db.sh >> $APP_DIR/backup.log 2>&1"
) | crontab -u "$APP_USER" -

log "Health"
for i in $(seq 1 30); do
  if curl -sf --max-time 3 http://127.0.0.1:3000/api/health >/dev/null; then break; fi
  sleep 2
done
echo "direct : $(curl -s --max-time 5 http://127.0.0.1:3000/api/health || echo UNREACHABLE)"
if [ "${SITE_ADDR:0:1}" = ":" ]; then
  # A port-only site address serves any Host, so do not invent one.
  echo "caddy  : $(curl -s --max-time 5 http://127.0.0.1/api/health || echo UNREACHABLE)"
else
  echo "caddy  : $(curl -s --max-time 5 -H "Host: $SITE_ADDR" http://127.0.0.1/api/health || echo UNREACHABLE)"
fi
# Reporting status must not itself abort a run that already succeeded.
systemctl is-active brics-faq caddy || true

cat <<'DONE'

==> Done. Two things are deliberately NOT automated:

  1. Create the staff account. Choose the passphrase yourself; it should not
     pass through a chat log or a script:
       cd /srv/brics && sudo -u brics npm run admin:create -- <username> '<passphrase>'

  2. /admin is not published. Reach it by tunnel from your own machine:
       ssh -i ~/.ssh/brics-lightsail -L 8080:127.0.0.1:3000 ubuntu@<static-ip>
       then open http://localhost:8080/admin
DONE
