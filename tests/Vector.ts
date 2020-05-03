import { Vector } from "../src/Vector";
import { Stream } from "../src/Stream";
import { MyClass } from "./SampleData";
import { typeOf } from "../src/Comparison";
import { Option } from "../src/Option";
import { assertFailCompile } from "./TestHelpers";
import * as SeqTest from "./Seq";
import * as assert from 'assert'

SeqTest.runTests("Vector",
                 Vector.ofIterable,
                 Vector.of,
                 Vector.empty,
                 Vector.unfoldRight);

describe("Vector toString", () => {
    it("serializes to string correctly", () => assert.equal(
        "Vector(1, 2, 3)", Vector.of(1,2,3).toString()));
    it("serializes to string correctly - arrays & strings", () => assert.equal(
        "Vector([1,'a'])", Vector.of([1,'a']).toString()));
    it("serializes to string correctly - custom toString", () => assert.equal(
        "Vector({field1: hi, field2: 99})", Vector.of(new MyClass("hi", 99)).toString()));
    it("serializes to string correctly - plain map", () => assert.equal(
        "Vector({\"name\":\"hi\",\"age\":99})", Vector.of({name:"hi", age:99}).toString()));
});

// tests with over 32 elements
describe("Vector over one node", () => {
    it("maps also on longer lists", () => assert.deepEqual(
        [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,
         25,26,27,28,29,30,31,32,33,34,35,36,37,38,39],
        Stream.iterate(1,x=>x+1).take(40).toVector().map(x=>x-1).toArray()));
    it("iterator is correct also on longer lists", () => assert.deepEqual(
        [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,
         25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40],
        Array.from(Stream.iterate(1,x=>x+1).take(40).toVector())));
    it("actually broke once", () => assert.ok(
        Stream.iterate(0,i=>i+1).take(33).toVector().equals(
            Stream.iterate(0,i=>i+1).take(31).toVector().appendAll([31,32]))));
})

describe("Vector extra methods", () => {
    it("map calls the conversion function once per element", () => {
        let i = 0;
        Vector.of(1,2,3).map(x=>{i+=1; return x+4;});
        assert.equal(3, i);
    });
    it("map works on the empty vector", () => assert.ok(
        Vector.empty<number>().equals(Vector.empty<number>().map(x=>x+1))));
    it("handles init correctly on a non-empty vector", () => assert.deepEqual(
        [1,2,3], Vector.of(1,2,3,4).init().toArray()));
    it("handles init correctly on an empty vector", () => assert.deepEqual(
        [], Vector.empty<number>().init().toArray()));
    it("handles init correctly on a single-element vector", () => assert.deepEqual(
        [], Vector.of(1).init().toArray()));
    it("doesn't modify the receiver on init", () => {
        const x = Vector.of(1,2,3);
        x.init();
        assert.deepEqual(
            [1,2,3], x.toArray())
    });
    it("handles replace correctly on a simple example", () => assert.deepEqual(
        [1,4,3], Vector.of(1,2,3).replace(1,4).toArray()));
    it("should throw on replace on negative index", () => assert.throws(
        () => Vector.of(1,2,3).replace(-1,0)));
    it("should throw on replace on out of bounds index", () => assert.throws(
        () => Vector.of(1,2,3).replace(5,0)));
    it("doesn't modify the receiver on replace", () => {
        const x = Vector.of(1,2,3);
        x.replace(1,4);
        assert.deepEqual(
            [1,2,3], x.toArray())
    });
    it("correctly infers the more precise left type on partition in case of typeguard", () => {
        // just checking that this compiles. 'charAt' is available on strings not numbers.
        // the get(0) is to make sure that partition returns me a Vector
        // not a Collection or something less precise than Vector.
        Vector.of<string|number>(1,"test",2,"a")
            .partition(typeOf("string"))[0]
            .get(0).getOrThrow().charAt(0);
    });
});

describe("Vector search methods beside those defined in Seq", () => {
    it("should find last by predicate", () => {
        const x = Vector.of(1,2,3,4);
        assert.ok(
            Option.some(4).equals(
                x.findLast(i => i % 2 === 0)
            )
        );
    });
    it("should return none from findList if not found", () => {
        const x = Vector.of(1,2,3,4);
        assert.ok(
            Option.none().equals(
                x.findLast(i => i === 5)
            )
        );
    });
    it("should find first index", () => {
        const x = Vector.of(1,2,3,4);
        assert.ok(
            Option.some(1).equals(
                x.findIndex(i => i % 2 === 0)
            )
        );
    });
    it("should return none from findIndex it not found", () => {
        const x = Vector.of(1,2,3,4);
        assert.ok(
            Option.none().equals(
                x.findIndex(i => i === 5)
            )
        );
    });
});

function checkTake<T>(longer: Vector<T>, n: number, shorter: Vector<T>) {
    const arrayBefore = longer.toArray();
    assert.deepStrictEqual(
        shorter.toArray(),
        longer.take(n).toArray());
    // taking should not have modified the original vector
    assert.deepStrictEqual(arrayBefore, longer.toArray());
}

// check that the internal structure of the vector trie
// is correct after take, that means also root killing and so on.
describe("Vector.take() implementation", () => {
    it("handles simple cases correctly", () =>
       checkTake(Vector.of(1,2,3,4,5,6), 3, Vector.of(1,2,3)));
    it("handles root killing correctly", () => checkTake(
        Vector.ofIterable(Stream.iterate(1,i=>i+1).take(40)),
        3, Vector.of(1,2,3)));
    it("handles double root killing correctly", () => checkTake(
        Vector.ofIterable(Stream.iterate(1,i=>i+1).take(1100)),
        3, Vector.of(1,2,3)));
    it("handles taking all on length multiple of node size correctly", () => checkTake(
        Stream.iterate(1,i=>i+1).take(128).toVector(),
        128, Stream.iterate(1,i=>i+1).take(128).toVector()));
    it("handles taking more than the whole length on length multiple of node size correctly", () => checkTake(
        Stream.iterate(1,i=>i+1).take(128).toVector(),
        129, Stream.iterate(1,i=>i+1).take(128).toVector()));
});

function checkAppend<T>(base: Vector<T>, toAppend: Iterable<T>, combined: Vector<T>) {
    const arrayBefore = base.toArray();
    assert.deepStrictEqual(
        combined.toArray(),
        base.appendAll(toAppend).toArray());
    // appending should not have modified the original vector
    assert.deepStrictEqual(arrayBefore, base.toArray());
}

describe("Vector.appendAll() implementation", () => {
    it("handles simple cases correctly", () => {
        checkAppend(Vector.of(1,2,3), [4,5,6,7,8], Vector.of(1,2,3,4,5,6,7,8));
    });
    it("handles adding nodes correctly", () => {
        checkAppend(Vector.of(1,2,3), Stream.iterate(4,i=>i+1).take(70),
                    Vector.ofIterable(Stream.iterate(1,i=>i+1).take(73)));
    });
    it("handles adding nodes correctly, adding an array", () => {
        checkAppend(Vector.of(1,2,3), Stream.iterate(4,i=>i+1).take(70).toArray(),
                    Vector.ofIterable(Stream.iterate(1,i=>i+1).take(73)));
    });
    it("handles adding nodes correctly, adding a vector", () => {
        checkAppend(Vector.of(1,2,3), Stream.iterate(4,i=>i+1).take(70).toVector(),
                    Vector.ofIterable(Stream.iterate(1,i=>i+1).take(73)));
    });
    it("handles large vectors at node boundaries", () => {
        assert.deepStrictEqual(
            Stream.iterate(0,i=>i+1).take(86016).toArray(),
            Stream.iterate(0,i=>i+1).take(86015).toVector().appendAll([86015]).toArray());
    });
});
describe("static Vector.zip", () => {
    it("performs static correctly", () => {
        const r = Vector.zip<[number,string,number]>([1,2], ["a", "b"], Vector.of(11,10,9));
        assert.equal(2, r.length());
        // check that the types are properly inferred
        const head: [number,string,number] = r.head().getOrThrow();
        assert.equal(1, head[0]);
        assert.equal("a", head[1]);
        assert.equal(11, head[2]);

        const other = r.get(1).getOrThrow();
        assert.equal(2, other[0]);
        assert.equal("b", other[1]);
        assert.equal(10, other[2]);
    });
});
describe("vector replaceFirst", () => {
    it("empty vector", () => {
        assert.ok(Vector.empty<number>().equals(Vector.empty<number>().replaceFirst(2, 3)));
    });
    it("value not present", () => {
        assert.ok(Vector.of(1, 3, 4, 5).equals(Vector.of(1, 3, 4, 5).replaceFirst(2, 3)));
    });
    it("type with real equals", () => {
        assert.ok(Vector.of(new MyClass("c", 2), new MyClass("b", 2), new MyClass("a", 1)).equals(
            Vector.of(new MyClass("a", 1), new MyClass("b", 2), new MyClass("a", 1))
                .replaceFirst(new MyClass("a", 1), new MyClass("c", 2))));
    });
    it("should fail compilation on replace if not equality", () =>
       assertFailCompile(
           "Vector.of([1]).replaceFirst([1], [2])", "Argument of type \'" +
               "number[]\' is not assignable to parameter"));
});
describe("vector replaceAll", () => {
    it("empty vector", () => {
        assert.ok(Vector.empty<number>().equals(Vector.empty<number>().replaceAll(2, 3)));
    });
    it("value not present", () => {
        assert.ok(Vector.of(1, 3, 4, 5).equals(Vector.of(1, 3, 4, 5).replaceFirst(2, 3)));
    });
    it("type with real equals", () => {
        assert.ok(Vector.of(new MyClass("c", 2), new MyClass("b", 2), new MyClass("c", 2)).equals(
            Vector.of(new MyClass("a", 1), new MyClass("b", 2), new MyClass("a", 1))
                .replaceAll(new MyClass("a", 1), new MyClass("c", 2))));
    });
    it("should fail compilation on replace if not equality", () =>
       assertFailCompile(
           "Vector.of([1]).replaceAll([1], [2])", "Argument of type \'" +
               "number[]\' is not assignable to parameter"));
});
describe("vector indexOf", () => {
    it("empty vector", () => {
        assert.ok(Option.none<number>().equals(Vector.empty<number>().indexOf(2)));
    });
    it("value not present", () => {
        assert.ok(Option.none<number>().equals(Vector.of(1, 3, 4, 5).indexOf(2)));
    });
    it("type with real equals", () => {
        assert.ok(Option.of(1).equals(
            Vector.of(new MyClass("a", 1), new MyClass("b", 2), new MyClass("a", 1))
                .indexOf(new MyClass("b", 2))));
    });
    it("should fail compilation on replace if not equality", () =>
       assertFailCompile(
           "Vector.of([1]).indexOf([1])", "Argument of type \'" +
               "number[]\' is not assignable to parameter"));
});
