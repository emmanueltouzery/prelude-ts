import { List } from "../src/List";
import { HashMap } from "../src/HashMap";
import { HashSet } from "../src/HashSet";
import { Stream } from "../src/Stream";
import { readFileSync, writeFileSync } from "fs";

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

// group classes & interfaces by category.
const CATEGORIES = List.of<[string,HashSet<string>]>(
    ["Control", HashSet.of<string>(
        "Either", "Lazy", "Option", "Function",
        "Function1", "Function2", "Function3", "Function4", "Function5",
        "Predicate", "Predicates")],
    ["Collection", HashSet.of<string>(
        "HashMap", "HashSet", "List", "Stream", "Tuple2",
        "Vector", "Collection", "Foldable", "IMap",
        "ISet", "Seq")],
    ["Core", HashSet.of<string>(
        "Value", "Comparison", "Contract")]);

// we'll modify the 'globals' typedoc file.
const contents = readFileSync("apidoc/globals.html").toString();
const lines = List.ofIterable(contents.split("\n"))
    .map(l => ({indent: l.length-l.trim().length, contents: l}));

// i'm interested in the part within 'tsd-index-content'
// split the parts before & after using string contains & indentation.
// we'll keep the parts before & after unchanged, but modify the indexContent.
const [beforeIndexContent,atIndexContent] =
    lines.span(l => l.contents.indexOf("tsd-index-content") < 0);
const indexContentIndent = atIndexContent.head().getOrThrow().indent;
const [indexContent,afterIndexContent] =
    atIndexContent.span(l => l.indent >= indexContentIndent);

function requireNotNull<T>(x:T|null): T {
    if (x === null) {
        throw "requireNotNull got null!";
    }
    return <T>x;
}

function indent(count: number): string {
    return "\n" + Stream.continually(()=>"\t")
        .take(count).mkString("");
}

function getSectionHeader(sectionName:string): string {
    return `${indent(6)}<section class="tsd-index-section">` +
        `${indent(7)}<h3>${sectionName}</h3>` +
        `${indent(7)}<ul class="tsd-index-list">\n`;
}

function getSectionFooter(): string {
    return `${indent(7)}</ul>` +
        `${indent(6)}</section>`;
}

// right now i have the part of interest. I can regenerate the wrapping items
// the items which interest me are the leaves, which are <li> tags,
// and I'll group them by their name (class name, interface name...).
const liRows = indexContent
    .map(l => l.contents)
    .filter(t => t.indexOf("<li") >= 0)
    .arrangeBy(row => requireNotNull(row.match(/>([\w<>]+)<\//))[1].replace(/<wbr>/g,""))
    .getOrThrow();

// start preparing the new contents for the indexContent
let newIndexContent = `${indent(5)}<div class="tsd-index-content">`;

const allKnownElements = CATEGORIES
    .map(c=>c[1])
    .fold(HashSet.empty<string>(), (s1,s2)=>s1.addAll(s2));

const missingElements = liRows.keySet().diff(allKnownElements);
if (!missingElements.isEmpty()) {
    throw "Missing the following elements: " + missingElements;
}

CATEGORIES.forEach(([name,elements]) => {
    newIndexContent += getSectionHeader(name);
    const elts = elements.toList();
    const rows = elts.map(elt => liRows.get(elt).getOrThrow())
        .zip(elts).sortOn(x=>x[1]).map(x=>x[0]);
    newIndexContent += rows.mkString("\n");
    newIndexContent += getSectionFooter();
});

// conclude the new contents for the indexContent
newIndexContent += `${indent(5)}</div>\n`; // close tsd-index-content

// overwrite globals.html -- first the text before the indexContent,
// then the modified indexContent, then the rest.
writeFileSync(
    'apidoc/globals.html',
    beforeIndexContent.map(l => l.contents).mkString("\n") +
        newIndexContent +
        afterIndexContent.map(l=>l.contents).mkString("\n"));
