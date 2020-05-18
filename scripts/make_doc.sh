#!/usr/bin/env bash
set -e

# we'll modify files in src/ and then revert our changes using
# git checkout src/* so make sure they have no local changes
if git status --porcelain | grep 'src/'; then
    echo "Can't generate the docs when the git checkout isn't clean"
    exit 1
fi

npm install --no-package-lock
tsc -p tsconfig.docgen.json

# https://github.com/TypeStrong/typedoc/issues/564
# i would like typedoc to group functions in categories but it's not supported
# yet. So I hack it with their support for external modules...
node dist/scripts/make_doc_extra/make_doc_preprocess.js

# trick for the 'Option' & 'Either' constants which typedoc skips as it clashes
# with the 'Option' & 'Either' type synomym
node dist/scripts/make_doc_extra/replace_in_ts.js

# generate with typedoc
./node_modules/typedoc/bin/typedoc --exclude "**/make_doc_extra/*.ts" --mode file --out apidoc --excludePrivate --excludeExternals --excludeNotExported --ignoreCompilerErrors --tsconfig tsconfig.prepublish.json src/index.ts

# revert the 'Option' & 'Either' constant rename
node dist/scripts/make_doc_extra/replace_in_html.js

mv apidoc/modules apidoc/files

node dist/scripts/make_doc_extra/make_doc_extra.js

# we're happy with the output now, revert the changes I made
# to the files to make typedoc think they're external modules
git checkout src/*
