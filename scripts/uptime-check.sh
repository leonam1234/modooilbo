#!/bin/bash
# 모두일보 업타임 모니터 — launchd(com.modooilbo.uptime)가 5분마다 실행.
# 홈이 2회 연속 실패하면 장애 메일 1통, 복구되면 복구 메일 1통 (mailer worker 경유).
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
STATE="/tmp/modooilbo-uptime.state"   # 내용: ok | fail1 | down
LOG="/tmp/modooilbo-uptime.log"
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://modooilbo.com/" || echo 000)
PREV=$(cat "$STATE" 2>/dev/null || echo ok)

notify() { # $1=제목 $2=본문
  KEY=$(security find-generic-password -s modooilbo-mailer-key -w 2>/dev/null) || return 1
  curl -s -X POST "https://modooilbo-mailer.bridzzikorea.workers.dev" \
    -H "x-mailer-key: $KEY" -H "content-type: application/json" \
    -d "{\"to\":\"bridzzikorea@gmail.com\",\"from\":{\"email\":\"no-reply@modooilbo.com\",\"name\":\"모두일보 모니터\"},\"subject\":\"$1\",\"text\":\"$2\"}" >/dev/null
}

if [ "$CODE" = "200" ]; then
  if [ "$PREV" = "down" ]; then
    notify "[모두일보] ✅ 사이트 복구됨" "modooilbo.com 이 다시 정상 응답(200)합니다. $(date '+%F %T')"
    echo "$(date '+%F %T') RECOVER" >> "$LOG"
  fi
  echo ok > "$STATE"
else
  if [ "$PREV" = "fail1" ]; then
    notify "[모두일보] 🚨 사이트 다운 감지" "modooilbo.com 이 2회 연속 응답 실패(HTTP $CODE). 확인 필요. $(date '+%F %T')"
    echo "$(date '+%F %T') DOWN ($CODE)" >> "$LOG"
    echo down > "$STATE"
  elif [ "$PREV" != "down" ]; then
    echo fail1 > "$STATE"
    echo "$(date '+%F %T') FAIL1 ($CODE)" >> "$LOG"
  fi
fi
