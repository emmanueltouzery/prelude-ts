import { readdirSync, writeFileSync } from "fs";
import { Vector } from "../../src/Vector";
import { Function } from "../../src/Function";
import { Predicates } from "../../src/Predicate";
import * as helpers from "./helpers";

const classesFolder = "apidoc/classes/";

/**
 * we work on lines-level in the text output, not xml tags
 * sometimes we have in one parentne "<parent>..</parent>"
 * but we also want to support "<parent>\n...\n</parent>"
 */
function putStaticMethodsOnTop(parentTag: string, parentMarker: string, childTag: string,
                               linesByIndent: helpers.LinesByIndent): helpers.LinesByIndent
{
    const [beforeIndexContent,indexContent,afterIndexContent] =
        helpers.linesByIndentGetTagContents(linesByIndent, parentTag, l => l.indexOf(parentMarker) >= 0);

    const openTag = Predicates.lift<helpers.LineByIndent>(
        l => l.contents.indexOf("<" + childTag) >= 0);

    // the marker parent might be of the same tag, so keep it always.
    const beforeFirstTag = indexContent.take(1)
        .appendAll(indexContent.drop(1).takeWhile(openTag.negate()));

    // the marker parent might be of the same tag, so keep it always.
    const afterLastTag = indexContent.reverse().take(1)
        .appendAll(indexContent
                    .reverse().drop(1)
                    .takeWhile(l => l.contents.indexOf("</" + childTag) < 0))
        .reverse();

    const staticOrNot = indexContent
        .drop(beforeFirstTag.length())
        .dropRight(afterLastTag.length())
        // group the li tags and their contents together, even if they span
        // across several lines like <parent>\n..\n</parent>
        .foldLeft(Vector.empty<helpers.LinesByIndent>(), (sofar,cur) => openTag(cur) ?
                  // open li tag => start a new entry
                  sofar.append(Vector.of<helpers.LineByIndent>(cur)) :
                  // not open li tag => continue the previous entry
                  sofar.dropRight(1).append(sofar.last().getOrThrow().append(cur)))
        .partition(l => l.head().getOrThrow().contents.indexOf("tsd-is-static") >= 0);

    return beforeIndexContent
        .appendAll(beforeFirstTag)
        .appendAll(staticOrNot[0].flatMap(x=>x))
        .appendAll(staticOrNot[1].flatMap(x=>x))
        .appendAll(afterLastTag)
        .appendAll(afterIndexContent);
}

function classPutStaticMethodsOnTop(classfilename: string): void {
    const lines = helpers.fileGetLinesByIndent(classesFolder + classfilename);
    const fnStatic = Function.lift4(putStaticMethodsOnTop);
    const transform = fnStatic.apply3("ul", "tsd-index-list", "li")
        .andThen(fnStatic.apply3("li", "current tsd-kind-class", "li"))
        .andThen(fnStatic.apply3("section", "tsd-panel-group tsd-member-group", "section"));

    writeFileSync(classesFolder + classfilename, helpers.linesByIndentStr(transform(lines)));
}

export function putClassStaticMethodsOnTop(): void {
    const classFiles = Vector.ofIterable(readdirSync(classesFolder));
    classFiles.forEach(classPutStaticMethodsOnTop);
}
