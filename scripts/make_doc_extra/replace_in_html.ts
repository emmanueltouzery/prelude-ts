import * as fs from 'fs';
import * as path from 'path';
import { FILE_REPLACEMENTS, replaceInFile, SimpleReplacement } from './replacements';

async function main() {
    const allHtmlReplacements = FILE_REPLACEMENTS
        .flatMap(([_, constReplacement]) => constReplacement.htmlReplacements)
        .appendAll([
            new SimpleReplacement('Module', 'File'),
            new SimpleReplacement('modules', 'files'),
        ]);

    const promises: Promise<void>[] = [];
    for await (const htmlFile of findHtml('apidoc')) {
        promises.push(replaceInFile(htmlFile, allHtmlReplacements));
    }
    return Promise.all(promises);
}

async function* findHtml(dir: string): AsyncIterableIterator<string> {
    const children = await fs.promises.readdir(dir, {withFileTypes: true});
    for (const child of children) {
        if (child.isDirectory()) {
            yield *findHtml(path.join(dir, child.name))
        } else if (child.isFile() && child.name.endsWith('.html')) {
            yield path.join(dir, child.name);
        }
    }
}

main()
    .then()
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
