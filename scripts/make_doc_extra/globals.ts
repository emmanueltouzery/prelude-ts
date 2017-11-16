import { Vector } from "../../src/Vector";
import { HashMap } from "../../src/HashMap";
import { HashSet } from "../../src/HashSet";
import { writeFileSync } from "fs";
import * as helpers from "./helpers";

// group classes & interfaces by category.
const CATEGORIES = Vector.of<[string,HashSet<string>]>(
    ["Control", HashSet.of<string>(
        "Either", "Lazy", "Option", "Function",
        "Function1", "Function2", "Function3", "Function4", "Function5",
        "Predicate", "Predicates")],
    ["Collection", HashSet.of<string>(
        "HashMap", "HashSet", "LinkedList", "Stream", "Tuple2",
        "Vector", "Collection", "Foldable", "IMap",
        "ISet", "Seq")],
    ["Core", HashSet.of<string>(
        "Value", "Comparison", "Contract")]);

function getSectionHeader(sectionName:string): string {
    return `${helpers.indent(6)}<section class="tsd-index-section">` +
        `${helpers.indent(7)}<h3>${sectionName}</h3>` +
        `${helpers.indent(7)}<ul class="tsd-index-list">\n`;
}

function getSectionFooter(): string {
    return `${helpers.indent(7)}</ul>` +
        `${helpers.indent(6)}</section>`;
}

// improve the typedoc 'globals' screen by
// grouping the classes, interfaces by "categories"
// and not by type (class, interface,...) as typedoc
// does out of the box.
// i should rather try to improve typedoc but..
//
// I rather not using typescript external modules
// because there are several options and I think
// that may assume too much about how users of the
// library want to consume it.
// So everything is in the base namespace, but I can
// at least do some grouping in the apidocs.
export function groupGlobalsByCategory(): void {
    // we'll modify the 'globals' typedoc file.
    const lines = helpers.fileGetLinesByIndent("apidoc/globals.html");

    // i'm interested in the part within 'tsd-index-content'
    const [beforeIndexContent,indexContent,afterIndexContent] =
        helpers.linesByIndentGetTagContents(lines, "div", l => l.indexOf("tsd-index-content") >= 0);

    // right now i have the part of interest. I can regenerate the wrapping items
    // the items which interest me are the leaves, which are <li> tags,
    // and I'll group them by their name (class name, interface name...).
    const liRows = indexContent
        .map(l => l.contents)
        .filter(t => t.indexOf("<li") >= 0)
        .arrangeBy(row => helpers.requireNotNull(row.match(/>([\w<>]+)<\//))[1].replace(/<wbr>/g,""))
        .getOrThrow();

    // start preparing the new contents for the indexContent
    let newIndexContent = `${helpers.indent(5)}<div class="tsd-index-content">`;

    const allKnownElements = CATEGORIES
        .map(c=>c[1])
        .fold(HashSet.empty<string>(), (s1,s2)=>s1.addAll(s2));

    const missingElements = liRows.keySet().diff(allKnownElements);
    if (!missingElements.isEmpty()) {
        throw "Missing the following elements: " + missingElements;
    }

    CATEGORIES.forEach(([name,elements]) => {
        newIndexContent += getSectionHeader(name);
        const elts = elements.toVector();
        const rows = elts.sortOn(x=>x).map(elt => liRows.get(elt).getOrThrow());
        newIndexContent += rows.mkString("\n");
        newIndexContent += getSectionFooter();
    });

    // conclude the new contents for the indexContent
    newIndexContent += `${helpers.indent(5)}</div>\n`; // close tsd-index-content

    // overwrite globals.html -- first the text before the indexContent,
    // then the modified indexContent, then the rest.
    writeFileSync(
        'apidoc/globals.html',
        helpers.linesByIndentStr(beforeIndexContent) +
            newIndexContent +
            helpers.linesByIndentStr(afterIndexContent));
}
