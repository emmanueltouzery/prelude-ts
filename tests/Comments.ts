import { readFileSync, writeFileSync, readdirSync } from "fs";
import { Vector } from "../src/Vector";
import { Option } from "../src/Option";
import { Function } from "../src/Function";
import * as ts from 'typescript';

/**
 * In this little script we extract source code from the apidoc comments
 * all over the source of prelude.ts, generate for each source file which
 * has apidoc comments containing source code samples a special apidoc-*.ts
 * test file.
 *
 * The apidoc comments must have the source indented by 4 characters, and
 * apidoc comments can specify an expected result for an expression using
 * "=>".
 */

function getCodeSamples(commentText: string): Vector<string> {
    const closedOpen = Vector
        .ofIterable(commentText.split("\n"))
        .map(str => str.trim())
        .takeWhile(str => str.indexOf("@param") < 0) // don't consider anything after @param
        .foldLeft({closed: Vector.empty<string>(), open: Option.none<string>()}, (sofar,cur) => {
            // we want to merge consecutive lines of code. a single comment may
            // contain multiple blocks of code, separated by normal text
            // => group the blocks of code together, skip the rest.
            const isCode = cur.startsWith("*    ");
            if (!isCode && sofar.open.isSome()) {
                // this line is not code but we have an open piece of code
                // => close the open piece of code
                return {closed: sofar.closed.append(sofar.open.get()), open: Option.none<string>()};
            }
            if (!isCode) {
                // this line is not code, no open piece of code
                // => nothing to do
                return sofar;
            }
            const lineCode = cur.replace(/^\*    /, "");
            if (sofar.open.isSome()) {
                // this is code, and we have an open piece
                // => append to it
                return { closed: sofar.closed, open: Option.of(sofar.open.get()+"\n"+lineCode)}
            }
            // this is code, no open piece => create a new piece
            return { closed: sofar.closed, open: Option.of(lineCode)}
        });
    return closedOpen.closed.appendAll(closedOpen.open.toVector());
}

type SampleInfo = {
    identifier: string;
    code: string,
    expectedResult?: string
};

function getCommentsInlineCode(scanner: ts.Scanner): Vector<SampleInfo> {
    let token = scanner.scan();
    let codeSamples = Vector.empty<SampleInfo>();
    let curCodeSample = Vector.empty<string>();
    while (token !== ts.SyntaxKind.EndOfFileToken) {
        if (!curCodeSample.isEmpty() &&
            token === ts.SyntaxKind.Identifier) {
            codeSamples = codeSamples.appendAll(
                curCodeSample.map(Function.lift2(getCodeSampleInfo).apply1(scanner.getTokenText())));
            curCodeSample = Vector.empty<string>();
        }
        if ((token === ts.SyntaxKind.SingleLineCommentTrivia) ||
            (token === ts.SyntaxKind.MultiLineCommentTrivia) ||
            (token === ts.SyntaxKind.JSDocComment)) {
            curCodeSample = getCodeSamples(scanner.getTokenText());
        }
        token = scanner.scan();
    }
    return codeSamples;
}

function getCodeSampleInfo(identifier: string, codeSample: string): SampleInfo {
    const lines = Vector.ofIterable(codeSample.split("\n"));
    if (!lines.last().getOrThrow().trim().startsWith("=>")) {
        return {
            identifier,
            code: codeSample
        };
    }
    return {
        identifier,
        code: lines.init().mkString("\n"),
        expectedResult: lines.last().getOrThrow().replace(/^\s*=>\s*/, "")
    };
}

function storeInVariable(code: string) {
    if (code.replace(/[^;]/g, "").length <= 1) {
        // only one ";" or less => single line.
        return "const x = " + code;
    }
    // assuming several lines
    // we rely on indentation to find out where to insert
    // the const x = ...
    //
    // for instance...
    //
    // first LOC
    // xcx
    // blabla( <-- insert here: last line with same indentation as first LOC
    //    ...
    //    ...);
    // => 
    const lines = Vector.ofIterable(code.split("\n"));
    const getIndent = (str:string)=> str.replace(/[^\s].*$/, "").length;
    const codeIndent = getIndent(lines.head().getOrThrow());
    const constExprLines = lines
        .reverse()
        .takeWhile(l => getIndent(l) > codeIndent)
        .length()+1

    const [before,after] = lines.splitAt(lines.length()-constExprLines);
    return before
        .append(" const x = ")
        .appendAll(after)
        .mkString("\n");
}

function generateTestContents(fname: string, sampleInfo: SampleInfo) {
    const wrap = (x:string) => `describe("${fname} docstrings", () => { ${x} });`;
    if (sampleInfo.expectedResult && sampleInfo.expectedResult.startsWith("throws")) {
        return wrap(`
            it("${sampleInfo.identifier}", () => {
                assert.throws(() => {
                    ${sampleInfo.code}
                });
            });
`
        );
    } else if (sampleInfo.expectedResult) {
        return wrap(`
            it("${sampleInfo.identifier}", () => {
                resetMathRandom();
                ${storeInVariable(sampleInfo.code)};
                assert.ok(myEq(${sampleInfo.expectedResult}, x),
                    ${sampleInfo.expectedResult} + " !== " + x);
                Math.random = origMathRandom;
            });
`);
    } else {
        return wrap(`
            // no result to compare the output to, just make sure this compiles
            ${sampleInfo.code}
`);
    }
}

function generateTestFileContents(fname: string, samplesInfo: Vector<SampleInfo>) {
    return `
        import { Vector } from "../src/Vector";
        import { LinkedList } from "../src/LinkedList";
        import { HashSet } from "../src/HashSet";
        import { HashMap } from "../src/HashMap";
        import { Stream } from "../src/Stream";
        import { Function, Function1, Function2,
                 Function3, Function4, Function5 } from "../src/Function";
        import { Predicate, Predicates } from "../src/Predicate";
        import { Either, Left, Right } from "../src/Either";
        import { Option, Some, None } from "../src/Option";
        import * as assert from 'assert';

        function myEq(a:any, b:any): boolean {
             if (a.toArray) {
                 // workaround for the zip test Vector.of([1,"a"]) equality
                 // real Vector returns false, compilation error otherwise
                 return myEq(a.toArray(), b.toArray());
             }
             if (a.equals) {
                 return a.equals(b);
             }
             if (Array.isArray(a)) {
                  if (a.length !== b.length) {
                       return false;
                  }
                  for (let i=0;i<a.length;i++) {
                      if (!myEq(a[i], b[i])) {
                          return false;
                      }
                  }
                  return true;
             }
             return JSON.stringify(a) === JSON.stringify(b);
        }

        const randomValues = [0.49884723907769635, 0.3226548779864311];
        let randomIndex = 0;
        const origMathRandom = Math.random;
        const mockMathRandom = () => randomValues[(randomIndex++) % randomValues.length];
        function resetMathRandom() {
             randomIndex = 0;
             Math.random = mockMathRandom;
        }

        ${samplesInfo.map(Function.lift2(generateTestContents).apply1(fname)).mkString("\n")}
    `;
}

function generateTestCommentsFile(filepath: string, fname: string): void {
    const fileContents = readFileSync(filepath).toString();
    const scanner = ts.createScanner(
        ts.ScriptTarget.ES2016, false,
        ts.LanguageVariant.Standard, readFileSync(filepath).toString());
    const codeSamples = getCommentsInlineCode(scanner);
    if (codeSamples.isEmpty()) {
        // nothing to do
        return;
    }
    const outputContents = generateTestFileContents(fname, codeSamples);
    writeFileSync("tests/apidoc-" + fname, outputContents);
}

/**
 * @hidden
 */
export function generateTestComments(): void {
    const files = readdirSync("./src");
    files
        .filter(file => file.endsWith(".ts"))
        .forEach(file => generateTestCommentsFile("src/" + file, file));
}
generateTestComments();
