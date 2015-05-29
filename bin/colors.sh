#!/bin/bash

C_DEFAULT="\x1B[0m"

C_RED="\x1B[31m"
C_GREEN="\x1B[32m"
C_YELLOW="\x1B[33m"
C_BLUE="\x1B[34m"
C_PURPLE="\x1B[35m"

C_RED_BOLD="\x1B[1;31m"
C_GREEN_BOLD="\x1B[1;32m"
C_YELLOW_BOLD="\x1B[1;33m"
C_BLUE_BOLD="\x1B[1;34m"
C_PURPLE_BOLD="\x1B[1;35m"

function show_colors () {
  echo -e "Available color variables:"
  echo -e "  ${C_DEFAULT}C_DEFAULT${C_DEFAULT}"

  echo -e "  ${C_RED}C_RED${C_DEFAULT}"
  echo -e "  ${C_GREEN}C_GREEN${C_DEFAULT}"
  echo -e "  ${C_YELLOW}C_YELLOW${C_DEFAULT}"
  echo -e "  ${C_BLUE}C_BLUE${C_DEFAULT}"
  echo -e "  ${C_PURPLE}C_PURPLE${C_DEFAULT}"

  echo -e "  ${C_RED_BOLD}C_RED_BOLD${C_DEFAULT}"
  echo -e "  ${C_GREEN_BOLD}C_GREEN_BOLD${C_DEFAULT}"
  echo -e "  ${C_YELLOW_BOLD}C_YELLOW_BOLD${C_DEFAULT}"
  echo -e "  ${C_BLUE_BOLD}C_BLUE_BOLD${C_DEFAULT}"
  echo -e "  ${C_PURPLE_BOLD}C_PURPLE_BOLD${C_DEFAULT}"
}
