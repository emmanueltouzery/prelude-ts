#!/usr/bin/env bash
set -e

# https://github.com/TypeStrong/typedoc/issues/564
# i would like typedoc to group functions in categories but it's not supported
# yet. So I hack it with their support for external modules...

# we'll modify the files and then revert our changes using
# git reset --HARD so make sure there are no local changes
if [[ $(git status --porcelain) ]]; then
    echo "Can't generate the docs when the git checkout isn't clean"
    exit 1
fi

# the output of typedoc when using external modules suits us
# exactly, but we don't want to use external modules
# => trick typedoc into thinking we do have external modules
function makeModule {
    sed -i "1s/^/export module $1 { /" $2
    echo "}" >> $2
}

# list of files for which to trick typedoc
# to think they're external modules
makeModule "Comparison" src/Comparison.ts
makeModule "Contract" src/Contract.ts

# generate with typedoc
./node_modules/typedoc/bin/typedoc --exclude "**/make_doc_extra/*.ts" --mode file --out apidoc --excludePrivate --excludeExternals --excludeNotExported --ignoreCompilerErrors src/index.ts

# modify the output to say 'File' instead of 'Module'
find apidoc -name "*.html" -exec sed -i 's/Module/File/g' \{\} \;

# modify the paths to say 'files' instead of 'modules'
mv apidoc/modules apidoc/files
find apidoc -name "*.html" -exec sed -i 's/modules/files/g' \{\} \;

node dist/scripts/make_doc_extra/make_doc_extra.js

# we're happy with the output now, revert the changes I made
# to the files to make typedoc think they're external modules
git reset --hard HEAD
