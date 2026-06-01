#!/bin/bash
BIN_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
INVOCATION_DIR=$(pwd)
source "$BIN_DIR/colors.sh"

PORT=8000
OPEN_BROWSER=1
WORKSPACE_DIR=""

usage() {
  cat <<EOF
Usage: ./RunMGViewMac [options]
       ./RunMGViewLinux [options]
       RunMGViewWindows.bat [options]   (Windows)

Options:
  -p, --port PORT         HTTP port (default: 8000)
  -w, --workspace PATH    Workspace directory (saved for future runs)
      --no-open           Do not open a browser tab on startup
  -h, --help              Show this help
  -v, --version           Print MGView version and exit

Examples:
  ./RunMGViewMac --port 9000
  ./RunMGViewMac -p 9000 --no-open
  ./RunMGViewMac --workspace ~/simulations
EOF
}

resolve_workspace_path() {
  local raw_path="$1"
  if [[ -z "$raw_path" ]]; then
    return 1
  fi
  (
    cd "$INVOCATION_DIR" || exit 1
    cd -- "$raw_path" || exit 1
    pwd -P 2>/dev/null || pwd
  )
}

is_valid_port() {
  [[ "$1" =~ ^[0-9]+$ ]] && (( "$1" >= 1 && "$1" <= 65535 ))
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port)
      if [[ -z "${2:-}" ]]; then
        echo -e "${C_RED_BOLD}Error: --port requires a value.${C_DEFAULT}" >&2
        usage >&2
        exit 1
      fi
      PORT="$2"
      shift 2
      ;;
    -w|--workspace)
      if [[ -z "${2:-}" ]]; then
        echo -e "${C_RED_BOLD}Error: --workspace requires a value.${C_DEFAULT}" >&2
        usage >&2
        exit 1
      fi
      if ! WORKSPACE_DIR="$(resolve_workspace_path "$2")"; then
        echo -e "${C_RED_BOLD}Error: workspace directory not found: $2${C_DEFAULT}" >&2
        exit 1
      fi
      shift 2
      ;;
    --no-open|--no-browser)
      OPEN_BROWSER=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -v|--version)
      cat "${BIN_DIR}/VERSION"
      exit 0
      ;;
    *)
      echo -e "${C_RED_BOLD}Unknown option: $1${C_DEFAULT}" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! is_valid_port "$PORT"; then
  echo -e "${C_RED_BOLD}Error: invalid port '${PORT}' (use 1–65535).${C_DEFAULT}" >&2
  exit 1
fi

MGVIEW_PARENT_DIR=$( cd "$BIN_DIR/../.." && pwd )
MGVIEW_URL="http://localhost:${PORT}/mgview/"
SERVER_CMD=()

if command -v node >/dev/null 2>&1; then
  SERVER_CMD=(node "$BIN_DIR/server.js" --port "$PORT")
  if [[ -n "$WORKSPACE_DIR" ]]; then
    SERVER_CMD+=(--workspace "$WORKSPACE_DIR")
  fi
else
  echo -e "${C_RED_BOLD}Unable to find Node.js on your PATH.${C_DEFAULT}"
  echo -e "${C_YELLOW}Install the official Node.js LTS release from:${C_DEFAULT}"
  echo -e "${C_GREEN_BOLD}https://nodejs.org/en/download${C_DEFAULT}"
  echo -e "${C_YELLOW}Then run this script again.${C_DEFAULT}"
  exit 1
fi

# Go up a level
pushd "$MGVIEW_PARENT_DIR" &> /dev/null

echo -e "${C_YELLOW_BOLD}------------------------------------------------------------${C_DEFAULT}"
echo -e "${C_YELLOW_BOLD}Starting MGView $(cat ${BIN_DIR}/VERSION)${C_DEFAULT}\n"
echo -e "${C_GREEN_BOLD}Serving MGView at ${MGVIEW_URL}${C_DEFAULT}"
if [[ -n "$WORKSPACE_DIR" ]]; then
  echo -e "${C_GREEN_BOLD}Workspace: ${WORKSPACE_DIR}${C_DEFAULT}"
fi
echo
echo -e "${C_RED_BOLD}Press Ctrl+C to quit.${C_DEFAULT}"
echo -e "${C_YELLOW_BOLD}------------------------------------------------------------${C_DEFAULT}"

"${SERVER_CMD[@]}" &
SERVER_PID=$!

sleep 1
if [[ "$OPEN_BROWSER" -eq 1 ]]; then
  if command -v open >/dev/null 2>&1; then
    open "$MGVIEW_URL" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$MGVIEW_URL" >/dev/null 2>&1 || true
  fi
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
