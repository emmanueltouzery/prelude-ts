import { replaceInFiles, FILE_REPLACEMENTS, SimpleReplacement } from './replacements';
import { Vector } from '../../src';


function main() {
    return FILE_REPLACEMENTS
        .map<[string, Vector<SimpleReplacement>]>(
            ([file, replacement]) => [file, replacement.tsReplacements]
        )
        .transform(replaceInFiles);
}

main()
    .then()
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
