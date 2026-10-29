#!/bin/sh
set -eu
# Chỉ đọc secret lúc chạy container, không bake AUTH_SECRET vào build frontend.
if [ -f /run/secrets/auth_secret ]; then
  export AUTH_SECRET="$(cat /run/secrets/auth_secret)"
fi
exec node server.js
