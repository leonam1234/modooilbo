#!/bin/bash
# 모두일보 회원 DB(D1) 일일 백업 — launchd(com.modooilbo.d1backup)가 매일 04:30 실행.
# 산출물: iCloud Codex/모두일보/backups/d1/modooilbo-members-YYYYMMDD-HHMM.sql.gz (30개 보관)
# 복원: gunzip 후  wrangler d1 execute modooilbo-members --remote --file <파일.sql>
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
REPO="$HOME/GIT/modooilbo"
BK="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Documents/Codex/모두일보/backups/d1"
LOG="$BK/backup.log"
STAMP=$(date +%Y%m%d-%H%M)
OUT="$BK/modooilbo-members-$STAMP.sql"
mkdir -p "$BK"
cd "$REPO"
if ./node_modules/.bin/wrangler d1 export modooilbo-members --remote --output "$OUT" >/dev/null 2>&1; then
  gzip -f "$OUT"
  SIZE=$(du -h "$OUT.gz" | cut -f1)
  echo "$(date '+%F %T') OK $OUT.gz ($SIZE)" >> "$LOG"
else
  echo "$(date '+%F %T') FAIL export 실패" >> "$LOG"
  exit 1
fi
# 보관 정책: 최근 30개만 유지
ls -t "$BK"/modooilbo-members-*.sql.gz 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true
