#!/usr/bin/env bash
# Hourly snapshot of the SQLite file.
#
# The flagged-question queue is the coverage-gap instrument for the entire
# event: it is how staff find out which questions the advisory does not answer,
# and it is the one thing here that cannot be regenerated from the repo. Losing
# it to a crash on day four loses the output the deployment exists to produce.
#
# `.backup` rather than `cp`: under WAL a plain copy can capture a torn file,
# because the committed state is split across the database and its -wal.
#
# Install:  0 * * * * /srv/brics/deploy/backup-db.sh >> /var/log/brics-backup.log 2>&1
set -euo pipefail

DB="${DATABASE_URL:-/srv/brics/data/brics-faq.db}"
DEST="${BACKUP_DIR:-/srv/brics/backups}"
KEEP="${BACKUP_KEEP:-48}"

mkdir -p "$DEST"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$DEST/brics-faq-$STAMP.db"

sqlite3 "$DB" ".backup '$OUT'"

# A backup that cannot be opened is not a backup. Check before rotating, so a
# run of corrupt snapshots cannot quietly evict the last good one.
if ! sqlite3 "$OUT" 'PRAGMA integrity_check;' | grep -q '^ok$'; then
  echo "$(date -uIs) FAILED integrity check, keeping everything: $OUT" >&2
  exit 1
fi

gzip -9 "$OUT"
echo "$(date -uIs) ok $OUT.gz ($(du -h "$OUT.gz" | cut -f1))"

# Keep the most recent N, oldest first out.
ls -1t "$DEST"/brics-faq-*.db.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm --
