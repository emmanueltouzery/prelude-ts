//  http://bit.ly/object-formatters

const formatter = {
    header: (object: any, config: any) => {
        if (object.hashCode && object.equals && (object.hamt || object.toVector || object.map2)) {
            return ["span", {}, object.toString()];
        }
        return null;
    },
    hasBody: (object: any, config: any) => {
        return object.isEmpty ? !object.isEmpty() : false;
    },
    body: (object: any, config:any) => {
        return ["ol", {}, ...object.map((x:any) => ["li",{}, x.toString()])];
    }
};
if (!(<any>window).devtoolsFormatters) {
    (<any>window).devtoolsFormatters = [];
}
(<any>window).devtoolsFormatters.push(formatter);
