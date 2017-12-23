import { Option, Some, None } from "../src/Option";
import { Vector } from "../src/Vector";
import { Seq } from "../src/Seq";
import { assertFailCompile } from "./TestHelpers";
import * as assert from 'assert'

describe("option comparison", () => {
    it("should mark equal options as equal", () =>
       assert.ok(Option.of(5).equals(Option.of(5))))
    it("should mark different options as not equal", () =>
       assert.ok(!Option.of(5).equals(Option.of(6))))
    it("should mark none as equals to none", () =>
       assert.ok(Option.none().equals(Option.none<string>())));
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
    it("doesn't throw when given another type on equals", () => assert.equal(
        false, Option.of(1).equals(<any>[1,2])));
    it("doesn't throw when given null on equals", () => assert.equal(
        false, Option.of(1).equals(<any>null)));
    it("empty doesn't throw when given another type on equals", () => assert.equal(
        false, Option.none().equals(<any>[1,2])));
    it("empty doesn't throw when given null on equals", () => assert.equal(
        false, Option.none().equals(<any>null)));
    it("should throw when comparing options without true equality", () => assert.throws(
        () => Option.of(Vector.of([1])).equals(Option.of(Vector.of([1])))));
    it("should fail compilation on an obviously bad equality test", () =>
       assertFailCompile(
           "Option.of([1]).equals(Option.of([1]))", "Argument of type \'" +
               "Option<number[]>\' is not assignable to parameter"));
    it("should fail compilation on an obviously bad contains test", () =>
       assertFailCompile(
           "Option.of([1]).contains([1])",
           "Argument of type \'number[]\' is not assignable to parameter"));
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
        assert.ok(Option.none().equals(Option.of(4).flatMap(x=>Option.none<number>())));
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
    it("should apply match to a some", () =>
       assert.equal(5, Option.of(4).match({
           Some: x=>x+1,
           None: ()=>-1
       })));
    it("should apply match to a nome", () =>
       assert.equal(-1, Option.none<number>().match({
           Some: x=>x+1,
           None: ()=>-1
       })));
    it("some supports transform", () =>
       assert.equal(6, Option.of(3).transform(x => 6)));
    it("none supports transform", () =>
       assert.equal(6, Option.none<number>().transform(x => 6)));
    it("should support lists combining some & none", () => {
        const a = <Some<number>>Option.of(5);
        const b = <None<number>>Option.none<number>();
        const c = Vector.of<Option<number>>(a, b);
    });
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
        Option.liftA2((x:number,y:number) => x+y)(Option.of(5), Option.none<number>()))));
    it("should liftAp", () => assert.ok(Option.of(14).equals(
        Option.liftAp((x:{a:number,b:number,c:number}) => x.a+x.b+x.c)
        ({a:Option.of(5), b:Option.of(6), c:Option.of(3)}))));
    it("should abort liftAp on none", () => assert.ok(Option.none().equals(
        Option.liftAp((x:{a:number,b:number}) => x.a+x.b)
        ({a:Option.of(5), b:Option.none<number>()}))));
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
    it("should not throw on Some.getOrThrow", () =>
       assert.equal(5, Option.of(5).getOrThrow()));
    it("should throw on None.getOrThrow", () =>
       assert.throws(() => Option.none().getOrThrow()));
    it("should throw on None.getOrThrow with custom msg", () =>
       assert.throws(() => Option.none().getOrThrow("my custom msg"), /^my custom msg$/));
    it("should offer get() if i checked for isSome", () => {
        const opt = <Option<number>>Option.of(5); 
        if (opt.isSome()) {
            // what we are checking here is whether this does build
            // .get() is available only on Some not on None
            assert.equal(5, opt.get());
        }
    });
    it("should offer get() if i eliminated isNone", () => {
        const opt = <Option<number>>Option.of(5); 
        if (!opt.isNone()) {
            // what we are checking here is whether this does build
            // .get() is available only on Some not on None
            assert.equal(5, opt.get());
        }
    });
    it("should allow some & none in a list", () => {
        const a = Option.of(5);
        const b = Option.none<number>();
        if (a.isSome() && b.isNone()) {
            Vector.of(a.asOption(),b);
        }
    })
});
