import { Stream } from "../../src/Stream";
import { Vector } from "../../src/Vector";
import { readFileSync } from "fs";

export function requireNotNull<T>(x:T|null): T {
    if (x === null) {
        throw "requireNotNull got null!";
    }
    return <T>x;
}

export function indent(count: number): string {
    return "\n" + Stream.continually(()=>"\t")
        .take(count).mkString("");
}

export type LineByIndent = {contents:string,indent:number};
export type LinesByIndent = Vector<LineByIndent>;

export function fileGetLinesByIndent(fname: string): LinesByIndent {
    const contents = readFileSync(fname).toString();
    return Vector.ofIterable(contents.split("\n"))
        .map(l => ({indent: l.length-l.trim().length, contents: l}));
}

/**
 * extract a tag from the linesbyindent. You tell me the tag name,
 * how to match the start tag, I return to you the rows before, the rows within that
 * tag (depth>=tagDepth) and the rows after.
 * returns [before, atTag, after]
 */
export function linesByIndentGetTagContents(
    lines: LinesByIndent,
    tagName: string,                                        
    startPredicate: (line:string)=>boolean): [LinesByIndent, LinesByIndent, LinesByIndent] {
    // split the parts before & after using string the predicate & indentation.
    const [before, atTag] = lines.span(l => !startPredicate(l.contents));
    const indentAtTag = atTag.head().getOrThrow().indent;
    const [tagContents,after] =
            atTag.span(l => (l.indent > indentAtTag) ||
                       (l.indent <= indentAtTag && l.contents.indexOf("</" + tagName) < 0));
    if (!after.isEmpty()) {
        // i want the closing tag also in 'atTag' but I rejected it in the span,
        // so take it from after
        return [before, tagContents.append(after.head().getOrThrow()), after.drop(1)];
    }
    return [before, tagContents, after];
}

export function linesByIndentStr(linesByIndent: LinesByIndent): string {
    return linesByIndent.map(l => l.contents).mkString("\n");
}
