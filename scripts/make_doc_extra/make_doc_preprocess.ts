import { readFileSync, writeFileSync } from "fs";

declare global {
    interface String {
        startsWith(other:string): boolean
    }
}

function makeModule(moduleName:string, filename:string): void {
    const contents = readFileSync(filename).toString();
    const moduleStart = "export module " + moduleName+ " { ";
    const contentsWithModuleHeader = contents.trim().startsWith("/**") ?
        // add the module header at the end of the apidoc comment
        // so the comment apidoc covers the module
        contents.replace(/\*\//, "*/ " + moduleStart) :
        // add the module header straight at the top of the file
        moduleStart + contents;

    // in any case close at the end of the file
    writeFileSync(filename, contentsWithModuleHeader + "\n}\n");
}

// list of files for which to trick typedoc
// to think they're external modules
makeModule("Comparison", "src/Comparison.ts");
makeModule("Contract", "src/Contract.ts");
makeModule("Option", "src/Option.ts");
makeModule("Either", "src/Either.ts");
makeModule("LinkedList", "src/LinkedList.ts");
makeModule("Stream", "src/Stream.ts");

