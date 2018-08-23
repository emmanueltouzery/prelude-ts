//  http://bit.ly/object-formatters

interface ElementHandler {
    isElement(object:any): boolean;
    getHeader(object:any): any;
    hasBody(elt:any): boolean;
    getBody(elt:any): any;
}

const olStyle = "list-style-type:none; padding-left: 0px; margin-top: 0px; margin-bottom: 0px; margin-left: 12px";

function getWithToArrayBody(elt: any): any {
    return ["ol",
            {"style":olStyle},
            ...elt.toArray().map((x:any,idx:number) => ["li",{},
                                                        ["span",{"style":"color: rgb(136, 19, 145);"},idx+": "],
                                                        ["object", {"object":x}]])];
}

class VectorHandler implements ElementHandler {
    isElement(object:any): boolean {
        return object.hashCode && object.equals && object.sortOn && Number.isInteger(object._maxShift);
    }
    getHeader(object:any): any {
        return ["span", {}, "Vector(" + object.length() + ")"];
    }
    hasBody(elt:any): boolean {
        return !elt.isEmpty();
    }
    getBody = getWithToArrayBody
}

// not going to behave well with infinite streams...
class StreamHandler implements ElementHandler {
    isElement(object:any): boolean {
        return object.hashCode && object.equals && object.sortBy && object.cycle && object.toVector;
    }
    getHeader(object:any): any {
        // not displaying the length for streams in case
        // of infinite streams. the user can expand if needed.
        return ["span", {}, "Stream(?)"];
    }
    hasBody(elt:any): boolean {
        return !elt.isEmpty();
    }
    getBody = getWithToArrayBody
}

class ListHandler implements ElementHandler {
    isElement(object:any): boolean {
        return object.hashCode && object.equals && object.sortBy && object.toVector;
    }
    getHeader(object:any): any {
        // not displaying the length for streams in case
        // of infinite streams. the user can expand if needed.
        return ["span", {}, "List(" + object.length() + ")"];
    }
    hasBody(elt:any): boolean {
        return !elt.isEmpty();
    }
    getBody = getWithToArrayBody
}

class HashSetHandler implements ElementHandler {
    isElement(object:any): boolean {
        return object.hashCode && object.equals && object.hamt && object.intersect;
    }
    getHeader(object:any): any {
        return ["span", {}, "HashSet(" + object.length() + ")"];
    }
    hasBody(elt:any): boolean {
        return !elt.isEmpty();
    }
    getBody = getWithToArrayBody
}

class HashMapHandler implements ElementHandler {
    isElement(object:any): boolean {
        return object.hashCode && object.equals && object.hamt && object.valueIterable;
    }
    getHeader(object:any): any {
        return ["span", {}, "HashMap(" + object.length() + ")"];
    }
    hasBody(elt:any): boolean {
        return !elt.isEmpty();
    }
    getBody(elt:any): any {
        return ["ol",
                {"style":olStyle},
                ...elt.toArray().map((kv:any,idx:number) => {
                    // using object.create to avoid the __proto__ in the GUI
                    const obj = Object.create(null);
                    obj.key = kv[0];
                    obj.value = kv[1];
                    return ["li",{},
                            ["span",{"style":"color: rgb(136, 19, 145);"},idx+": "],
                            ["object", {"object":obj}]];
                })];
    }
}

const handlers = [new VectorHandler(),
                  new StreamHandler(),
                  new ListHandler(),
                  new HashSetHandler(),
                  new HashMapHandler()];

function getHandler(object: any): ElementHandler|undefined {
    return handlers.find(h => h.isElement(object));
}

const formatter = {
    header: (object: any, config: any): any => {
        const handler = getHandler(object);
        return handler ? handler.getHeader(object) : null;
    },
    hasBody: (object: any, config: any): boolean => {
        const handler = getHandler(object);
        return handler ? handler.hasBody(object) : false;
    },
    body: (object: any, config:any): any => {
        const handler = getHandler(object);
        return handler ? handler.getBody(object) : null;
    }
};
if (!(<any>window).devtoolsFormatters) {
    (<any>window).devtoolsFormatters = [];
}
(<any>window).devtoolsFormatters.push(formatter);
