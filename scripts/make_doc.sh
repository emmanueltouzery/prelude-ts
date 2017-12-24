#!/usr/bin/env bash
set -e

npm install --no-package-lock
tsc

# https://github.com/TypeStrong/typedoc/issues/564
# i would like typedoc to group functions in categories but it's not supported
# yet. So I hack it with their support for external modules...

# we'll modify the files and then revert our changes using
# git reset --HARD so make sure there are no local changes
if [[ $(git status --porcelain) ]]; then
    echo "Can't generate the docs when the git checkout isn't clean"
    exit 1
fi

# pre-process files
node dist/scripts/make_doc_extra/make_doc_preprocess.js

# trick for the 'Option' & 'Either' constants which typedoc skips as it clashes
# with the 'Option' & 'Either' type synomym
sed -i "s/const Option/const optionGlabiboulga/" src/Option.ts
sed -i "s/const Either/const eitherGlabiboulga/" src/Either.ts
sed -i "s/const LinkedList/const linkedListGlabiboulga/" src/LinkedList.ts
sed -i "s/const Stream/const streamGlabiboulga/" src/Stream.ts

# generate with typedoc
./node_modules/typedoc/bin/typedoc --exclude "**/make_doc_extra/*.ts" --mode file --out apidoc --excludePrivate --excludeExternals --excludeNotExported --ignoreCompilerErrors src/index.ts

# revert the 'Option' & 'Either' constant rename
find apidoc -name "*.html" -exec sed -i 's/optionglabiboulga/Option/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/option<wbr>Glabiboulga/Option/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/eitherglabiboulga/Either/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/either<wbr>Glabiboulga/Either/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/linkedlistglabiboulga/LinkedList/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/linked<wbr>List<wbr>Glabiboulga/LinkedList/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/streamglabiboulga/Stream/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/stream<wbr>Glabiboulga/Stream/g' \{\} \;

# modify the output to say 'File' instead of 'Module'
find apidoc -name "*.html" -exec sed -i 's/Module/File/g' \{\} \;

# modify the paths to say 'files' instead of 'modules'
mv apidoc/modules apidoc/files
find apidoc -name "*.html" -exec sed -i 's/modules/files/g' \{\} \;

node dist/scripts/make_doc_extra/make_doc_extra.js

# we're happy with the output now, revert the changes I made
# to the files to make typedoc think they're external modules
git reset --hard HEAD
