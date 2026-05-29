VERSION=`cat ../../bin/VERSION`; sed 's/VERSION/'"$VERSION"'/g' header > header.tmp

cat header.tmp `cat jquery/compile` util/*.js `cat three/compile` fonts/*.js `cat mgview/compile` main.js > mgview.min.js

#uglifyjs -nm -o mgview.min.js mgview.min.js

rm header.tmp
