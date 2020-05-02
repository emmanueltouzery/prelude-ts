#!/usr/bin/env bash
set -e

npm install --no-package-lock
tsc -p tsconfig.docgen.json

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
sed -i "s/const Function0/const function0Glabiboulga/" src/Function.ts
sed -i "s/const Function1/const function1Glabiboulga/" src/Function.ts
sed -i "s/const Function2/const function2Glabiboulga/" src/Function.ts
sed -i "s/const Function3/const function3Glabiboulga/" src/Function.ts
sed -i "s/const Function4/const function4Glabiboulga/" src/Function.ts
sed -i "s/const Function5/const function5Glabiboulga/" src/Function.ts
sed -i "s/const Predicate/const predicateGlabiboulga/" src/Predicate.ts

# generate with typedoc
./node_modules/typedoc/bin/typedoc --exclude "**/make_doc_extra/*.ts" --mode file --out apidoc --excludePrivate --excludeExternals --excludeNotExported --ignoreCompilerErrors --tsconfig tsconfig.prepublish.json src/index.ts

# revert the 'Option' & 'Either' constant rename
find apidoc -name "*.html" -exec sed -i 's/optionglabiboulga/Option/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/option<wbr>Glabiboulga/Option/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/eitherglabiboulga/Either/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/either<wbr>Glabiboulga/Either/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/linkedlistglabiboulga/LinkedList/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/linked<wbr>List<wbr>Glabiboulga/LinkedList/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/streamglabiboulga/Stream/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/stream<wbr>Glabiboulga/Stream/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function0glabiboulga/Function0/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function0<wbr>Glabiboulga/Function0/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function1glabiboulga/Function1/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function1<wbr>Glabiboulga/Function1/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function2glabiboulga/Function2/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function2<wbr>Glabiboulga/Function2/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function3glabiboulga/Function3/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function3<wbr>Glabiboulga/Function3/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function4glabiboulga/Function4/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function4<wbr>Glabiboulga/Function4/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function5glabiboulga/Function5/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/function5<wbr>Glabiboulga/Function5/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/predicateglabiboulga/Predicate/g' \{\} \;
find apidoc -name "*.html" -exec sed -i 's/predicate<wbr>Glabiboulga/Predicate/g' \{\} \;

# modify the output to say 'File' instead of 'Module'
find apidoc -name "*.html" -exec sed -i 's/Module/File/g' \{\} \;

# modify the paths to say 'files' instead of 'modules'
mv apidoc/modules apidoc/files
find apidoc -name "*.html" -exec sed -i 's/modules/files/g' \{\} \;

node dist/scripts/make_doc_extra/make_doc_extra.js

# we're happy with the output now, revert the changes I made
# to the files to make typedoc think they're external modules
git reset --hard HEAD
