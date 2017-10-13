#!/usr/bin/env bash
set -e

tsc
node ./node_modules/browserify/bin/cmd.js -s prelude_ts dist/src/index.js -o /tmp/prelude_ts_pre.js
scripts/with_header.sh /tmp/prelude_ts_pre.js > dist/src/prelude_ts.js
node ./node_modules/browserify/bin/cmd.js -s prelude_ts_object_formatters dist/src/ChromeDevToolFormatters.js -o dist/src/chrome_dev_tools_formatters.js
./node_modules/uglify-js/bin/uglifyjs --compress --mangle --output /tmp/prelude_ts_premin.js -- /tmp/prelude_ts_pre.js
scripts/with_header.sh /tmp/prelude_ts_premin.js > dist/src/prelude_ts.min.js
rm /tmp/prelude_ts_pre.js /tmp/prelude_ts_premin.js
