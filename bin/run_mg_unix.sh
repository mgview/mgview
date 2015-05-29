#!/bin/bash
BIN_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
source $BIN_DIR/colors.sh

# Go up a level
pushd $BIN_DIR/../.. &> /dev/null

echo -e "${C_YELLOW_BOLD}------------------------------------------------------------${C_DEFAULT}"
echo -e "${C_YELLOW_BOLD}Starting MGView $(cat ${BIN_DIR}/VERSION)${C_DEFAULT}\n"
#echo -e "${C_YELLOW}Server is running.\n"
echo -e "${C_GREEN_BOLD}Open your browser and type localhost:8000 in the address bar.${C_DEFAULT}\n"
echo -e "${C_RED_BOLD}Press Ctrl+C to quit.${C_DEFAULT}"
echo -e "${C_YELLOW_BOLD}------------------------------------------------------------${C_DEFAULT}"

python -m SimpleHTTPServer 8000 &

#popd &> /dev/null

### Launching a URL in Chrome stopped working, and I can't figure out how to do it in Mac,
### so for now we'll skip this fanciness.
#
# sleep 0.5
#
# google-chrome localhost:8000
#
# if [ $? -ne 0 ]; then
#   echo -e "${C_RED}Chrome failed to start. Try manually starting Chrome, then run this script again.${C_DEFAULT}"
#   kill -9 %1
#   popd &> /dev/null
#   exit -1
# fi
#

function cleanup {
  kill -9 %1
  popd &> /dev/null
  echo -e "${C_YELLOW_BOLD}------------------------------------------------------------${C_DEFAULT}"
  echo -e "${C_YELLOW}Killed MGView server.${C_DEFAULT}"
  echo -e "${C_YELLOW_BOLD}Existing MGView tabs open in your browser are now inactive.${C_DEFAULT}"
}


trap cleanup EXIT
while read -n 1 -s line
do
  echo -e "${C_RED_BOLD}Press Ctrl+C to quit.${C_DEFAULT}"
done

