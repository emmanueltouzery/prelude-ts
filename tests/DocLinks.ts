import { readFileSync } from "fs";
import { Vector } from "../src/Vector";
import { Future } from "../src/Future";
import * as helpers from "../scripts/make_doc_extra/helpers";
import * as rp from 'request-promise-native';

function checkUrlsInText(text:string, urlFilter: (url:string)=>boolean): Future<Vector<string>> {
    const urls = Vector.ofIterable(
        helpers.requireNotNull(text.match(/https?:.+?(?=[\s\)"'])/g)))
        .filter(urlFilter);
    return Future.traverse(urls, url => {
        console.log(`Checking ${url}...`);
        return Future.of(rp(url).promise())
    }, {maxConcurrent:3});
}

describe("documentation links work", () => {
    it("README.md", async () => {
        const contents = readFileSync("README.md").toString();
        await checkUrlsInText(contents, _=>true);
    });
    it("User Guide", async () => {
        const userGuide = await rp("https://github.com/emmanueltouzery/prelude.ts/wiki/Prelude.ts-user-guide");
        await checkUrlsInText(userGuide, url => url.indexOf("emmanuel") >= 0 && !url.endsWith(".git"));
    });
    it("Equality Guide", async () => {
        const userGuide = await rp("https://github.com/emmanueltouzery/prelude.ts/wiki/Equality");
        await checkUrlsInText(userGuide, url => url.indexOf("emmanuel") >= 0 && !url.endsWith(".git"));
    });
});
