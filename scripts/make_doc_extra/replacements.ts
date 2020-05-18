import * as fs from 'fs';
import * as readline from 'readline';
import { Vector } from '../../src';
import * as path from 'path';

export class SimpleReplacement {
    readonly src: RegExp;
    readonly trg: string;

    constructor(_src: string, _trg: string) {
        if (!_src.match(/^[a-zA-Z0-9<> ]+$/)) {
            throw new Error('Not safe for regex: ' + _src);
        }
        this.src = new RegExp(_src, 'g');
        this.trg = _trg;
    }
}

const SUFFIX = 'Glabiboulga';

export class ConstReplacement {
    readonly tsReplacements: Vector<SimpleReplacement>;
    readonly htmlReplacements: Vector<SimpleReplacement>;

    constructor(constNames: string | Vector<string>) {
        const constNamesVector = constNames instanceof Vector ? constNames : Vector.of(constNames);
        this.tsReplacements = constNamesVector
            .map(constName => new SimpleReplacement(
                `const ${constName}`,
                `const ${constName}${SUFFIX}`,
            ));

        this.htmlReplacements = constNamesVector
            .flatMap(constName => Vector.of(
                new SimpleReplacement(
                    `${constName}${SUFFIX}`.toLowerCase(),
                    constName,
                ),
                new SimpleReplacement(
                    this.insertWbrBetweenParts(`${constName}${SUFFIX}`),
                    constName,
                )
            ));
    }

    /**
     * CamelCase42Name -> Camel<wbr>Case42<wbr>Name
     */
    private insertWbrBetweenParts(text: string): string {
        if (!text.match(/^[A-Z]/)) {
            throw new Error('Must start with capital letter: ' + text);
        }

        const part = /[A-Z][^A-Z]*/g;
        function* parts(): IterableIterator<string> {
            for ( ; ; ) {
                const res = part.exec(text);
                if (!res) {
                    return;
                }
                yield res[0];
            }
        }
        return Vector.ofIterable(parts()).mkString('<wbr>');
    }
}

export const FILE_REPLACEMENTS = Vector.of<[string, ConstReplacement]>(
    [path.join('src', 'Option.ts'), new ConstReplacement('Option')],
    [path.join('src', 'Either.ts'), new ConstReplacement('Either')],
    [path.join('src', 'LinkedList.ts'), new ConstReplacement('LinkedList')],
    [path.join('src', 'Stream.ts'), new ConstReplacement('Stream')],
    [path.join('src', 'Function.ts'), new ConstReplacement(Vector.of(0, 1, 2, 3, 4, 5).map(i => `Function${i}`))],
    [path.join('src', 'Predicate.ts'), new ConstReplacement('Predicate')],
)

export function replaceInFiles(fileReplacements: Vector<[string, Vector<SimpleReplacement>]>): Promise<void[]> {
    const promises = fileReplacements
        .map(([file, replacements]) => replaceInFile(file, replacements));
    return Promise.all(promises);
}

export async function replaceInFile(file: string, replacements: Vector<SimpleReplacement>): Promise<void> {
    return new Promise<string>(async (resolve, reject) => {
        const inInterface = readline.createInterface({input: fs.createReadStream(file)});
        try {
            const lines: string[] = [];
            for await (const line of inInterface) {
                lines.push(
                    replacements
                        .foldLeft(line, (l, repl) => l.replace(repl.src, repl.trg))
                );
            }
            resolve(lines.map(l => l + '\n').join(''));
        } catch (err) {
            reject(err);
        } finally {
            inInterface.close();
        }
    }).then(lines => fs.promises.writeFile(file, lines));
}
