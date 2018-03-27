import { typeOf } from "../src/Comparison";
import { Vector } from "../src/Vector";
import * as assert from 'assert'

describe("typeOf", () => {
    it ("typeOf number", () => {
        // just checking that the type inference comes up with the proper type.
        // only number has 'toExponential'
        Vector.of<any>(1,"a",2,3,"b").filter(typeOf("number"))
            .head().getOrThrow().toExponential(2);
    });
    it ("typeOf string", () => {
        // just checking that the type inference comes up with the proper type.
        // only string has 'charAt'
        Vector.of<any>(1,"a",2,3,"b").filter(typeOf("string"))
            .head().getOrThrow().charAt(2);
    });
});
