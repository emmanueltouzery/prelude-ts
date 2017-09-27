//  http://bit.ly/object-formatters

interface ElementHandler {
    isElement(object:any): boolean;
    getHeader(object:any): any;
    hasBody(elt:any): boolean;
    getBody(elt:any): any;
}

class VectorHandler implements ElementHandler {
    isElement(object:any): boolean {
        return object.hashCode && object.equals && object.hamt && Number.isInteger(object.indexShift);
    }
    getHeader(object:any): any {
        return ["span", {}, "Vector(" + object.length() + ")"];
    }
    hasBody(elt:any): boolean {
        return !elt.isEmpty();
    }
    getBody(elt:any): any {
        return ["ol",
                {"style":"list-style-type:none; padding-left: 0px; margin-top: 0px; margin-bottom: 0px; margin-left: 12px"},
                ...elt.toArray().map((x:any,idx:number) => ["li",{},
                                                               ["span",{"style":"color: rgb(136, 19, 145);"},idx+": "],
                                                               ["object", {"object":x}]])];
    }
}

const handlers = [new VectorHandler()];

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
