import { Option } from "../src/Option";
import { Vector } from "../src/Vector";
import { Seq } from "../src/Seq";
import * as assert from 'assert'

describe("option comparison", () => {
    it("should mark equal options as equal", () =>
       assert.ok(Option.of(5).equals(Option.of(5))))
    it("should mark different options as not equal", () =>
       assert.ok(!Option.of(5).equals(Option.of(6))))
    it("should mark none as equals to none", () =>
       assert.ok(Option.none().equals(Option.none())));
    it("should mark none and some as not equal", () =>
       assert.ok(!Option.of(5).equals(Option.none<number>())));
    it("should mark none and some as not equal", () =>
       assert.ok(!Option.none<number>().equals(Option.of(5))));
    it("should return true on contains", () =>
       assert.ok(Option.of(5).contains(5)));
    it("should return false on contains on none", () =>
       assert.ok(!Option.none().contains(5)));
    it("should return false on contains", () =>
       assert.ok(!Option.of(6).contains(5)));
});

describe("option transformation", () => {
    it("should transform with map", () => {
        assert.ok(Option.of(5).equals(Option.of(4).map(x=>x+1)));
    });
    it("should handle null as Some", () =>
       assert.ok(Option.of(5).map<number|null>(x => null).equals(Option.of(null))));
    it("should transform a Some to string properly", () =>
       assert.equal("Some(5)", Option.of(5).toString()));
    it("should transform a None to string properly", () =>
       assert.equal("None()", Option.none().toString()));
    it("should transform with flatMap x->y", () => {
        assert.ok(Option.of(5).equals(Option.of(4).flatMap(x=>Option.of(x+1))));
    });
    it("should transform with flatMap x->none", () => {
        assert.ok(Option.none().equals(Option.of(4).flatMap(x=>Option.none())));
    });
    it("should transform with flatMap none->none", () => {
        assert.ok(Option.none().equals(Option.none<number>().flatMap(x=>Option.of(x+1))));
    });
    it("should filter some->some", () =>
       assert.ok(Option.of(5).equals(Option.of(5).filter(x => x>2))));
    it("should filter some->none", () =>
       assert.ok(Option.of(5).filter(x => x<2).isNone()));
    it("should filter none->none", () =>
       assert.ok(Option.none<number>().filter(x => x<2).isNone()));
});

describe("Option helpers", () => {
    it("should do sequence when all are some", () =>
       assert.ok(
           Option.of(<Seq<number>>Vector.of(1,2,3)).equals(
               Option.sequence(Vector.of(Option.of(1), Option.of(2), Option.of(3))))));
    it("should fail sequence when some are none", () =>
       assert.ok(
           Option.none().equals(
               Option.sequence(Vector.of(Option.of(1), Option.none(), Option.of(3))))));
    it("should liftA2", () => assert.ok(Option.of(11).equals(
        Option.liftA2((x:number,y:number) => x+y)(Option.of(5), Option.of(6)))));
    it("should abort liftA2 on none", () => assert.ok(Option.none().equals(
        Option.liftA2((x:number,y:number) => x+y)(Option.of(5), Option.none()))));
});

describe("option retrieval", () => {
    it("should return the value on Some.getOrElse", () =>
       assert.equal(5, Option.of(5).getOrElse(6)));
    it("should return the alternative on None.getOrElse", () =>
       assert.equal(6, Option.none().getOrElse(6)));
    it("should return the value on Some.toVector", () =>
       assert.deepEqual([5], Option.of(5).toVector().toArray()));
    it("should return empty on None.toVector", () =>
       assert.deepEqual([], Option.none().toVector().toArray()));
});
