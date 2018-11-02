import * as assert from 'assert'
import { readFileSync } from "fs";
import { Vector } from "../src/Vector";
import { Future } from "../src/Future";
import * as helpers from "../scripts/make_doc_extra/helpers";
import * as rp from 'request-promise-native';

describe("documentation links work", () => {
    it("README.md", () => {
        const contents = readFileSync("README.md").toString();
        const urls = Vector.ofIterable(
            helpers.requireNotNull(contents.match(/\bhttps?:.+?(?=[\s\)])/g)));
        return Future.traverse(urls, url =>  Future.of(rp(url).promise()), {maxConcurrent:3});
    });
});
