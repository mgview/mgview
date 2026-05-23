#!/bin/bash
BIN_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
source "$BIN_DIR/colors.sh"

PORT=8000
MGVIEW_PARENT_DIR=$( cd "$BIN_DIR/../.." && pwd )
MGVIEW_URL="http://localhost:${PORT}/MGView/Examples.html"

SERVER_CMD=()
if command -v python3 >/dev/null 2>&1; then
  SERVER_CMD=(python3 -m http.server "$PORT")
elif command -v python >/dev/null 2>&1; then
  if python -c "import http.server" >/dev/null 2>&1; then
    SERVER_CMD=(python -m http.server "$PORT")
  else
    SERVER_CMD=(python -m SimpleHTTPServer "$PORT")
  fi
else
  echo -e "${C_RED_BOLD}Unable to find Python 3 or Python 2 on your PATH.${C_DEFAULT}"
  exit 1
fi

# Go up a level
pushd "$MGVIEW_PARENT_DIR" &> /dev/null

echo -e "${C_YELLOW_BOLD}------------------------------------------------------------${C_DEFAULT}"
echo -e "${C_YELLOW_BOLD}Starting MGView $(cat ${BIN_DIR}/VERSION)${C_DEFAULT}\n"
echo -e "${C_GREEN_BOLD}Serving MGView at ${MGVIEW_URL}${C_DEFAULT}\n"
echo -e "${C_RED_BOLD}Press Ctrl+C to quit.${C_DEFAULT}"
echo -e "${C_YELLOW_BOLD}------------------------------------------------------------${C_DEFAULT}"

"${SERVER_CMD[@]}" &
SERVER_PID=$!

sleep 1
if command -v open >/dev/null 2>&1; then
  open "$MGVIEW_URL" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$MGVIEW_URL" >/dev/null 2>&1 || true
fi

function cleanup {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  popd &> /dev/null
  echo -e "${C_YELLOW_BOLD}------------------------------------------------------------${C_DEFAULT}"
  echo -e "${C_YELLOW}Killed MGView server.${C_DEFAULT}"
  echo -e "${C_YELLOW_BOLD}Existing MGView tabs open in your browser are now inactive.${C_DEFAULT}"
}

trap cleanup EXIT
wait "$SERVER_PID"
