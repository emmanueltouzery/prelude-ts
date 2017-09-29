#!/usr/bin/env bash
set -e

cat <<END
/**
 * prelude.ts v$(node -p 'require("./package.json").version')
 * https://github.com/emmanueltouzery/prelude.ts
 * (c) 2017-$(git show -s --format=%ai | cut -d - -f 1) Emmanuel Touzery
 * prelude.ts may be freely distributed under the ISC license.
*/
END
cat $*
