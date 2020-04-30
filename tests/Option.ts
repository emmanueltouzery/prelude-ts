import { Option, Some, None } from "../src/Option";
import { Vector } from "../src/Vector";
import { instanceOf } from "../src/Comparison";
import { Seq } from "../src/Seq";
import { MyClass, MySubclass } from "./SampleData";
import { assertFailCompile } from "./TestHelpers";
import * as assert from 'assert'

describe("option creation", () => {
    it("should create a Some for Option.ofNullable(0)", () => {
        assert.ok(Option.ofNullable(0).equals(Option.of(0)));
        assert.ok(Option.ofNullable(0).isSome());
      });
});
describe("option comparison", () => {
    it("should mark equal options as equal", () =>
       assert.ok(Option.of(5).equals(Option.of(5))))
    it("should mark different options as not equal", () =>
       assert.ok(!Option.of(5).equals(Option.of(6))))
    it("should mark none as equals to none", () =>
       assert.ok(Option.none<string>().equals(Option.none<string>())));
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
    it("should return the original Some with orCall", () => {
        assert.ok(Option.of(5).equals(Option.of(5).orCall(() => Option.none())));
    });
    it("should call the function when calling orCall on None", () => {
        assert.ok(Option.of(5).equals(Option.none<number>().orCall(() => Option.of(5))));
    });
    it("should handle null as Some", () =>
       assert.ok(Option.of(5).map<number|null>(x => null).equals(Option.of<number|null>(null))));
    it("should transform a Some to string properly", () =>
       assert.equal("Some(5)", Option.of(5).toString()));
    it("should transform a None to string properly", () =>
       assert.equal("None()", Option.none().toString()));
    it("should transform with flatMap x->y", () => {
        assert.ok(Option.of(5).equals(Option.of(4).flatMap(x=>Option.of(x+1))));
    });
    it("should transform with flatMap x->none", () => {
        assert.ok(Option.none<number>().equals(Option.of(4).flatMap(x=>Option.none<number>())));
    });
    it("should transform with flatMap none->none", () => {
        assert.ok(Option.none<number>().equals(Option.none<number>().flatMap(x=>Option.of(x+1))));
    });
    it("should filter some->some", () =>
       assert.ok(Option.of(5).equals(Option.of(5).filter(x => x>2))));
    it("should filter some->none", () =>
       assert.ok(Option.of(5).filter(x => x<2).isNone()));
    it("should filter none->none", () =>
       assert.ok(Option.none<number>().filter(x => x<2).isNone()));
    it("filter upcasts if possible", () => {
        // here we only want to check that the code does compile,
        // that 'x' is correctly seen has MySubclass in the 3rd line
        Option.of<MyClass>(new MySubclass("a",1,"b"))
            .filter(instanceOf(MySubclass))
            .filter(x => x.getField3().length>1);
    });
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
           Option.sequence(Vector.of(Option.of(1), Option.none<number>(), Option.of(3))).isNone()));
    it("should liftA2", () => assert.ok(Option.of(11).equals(
        Option.liftA2((x:number,y:number) => x+y)(Option.of(5), Option.of(6)))));
    it("should abort liftA2 on none", () => assert.ok(Option.none<number>().equals(
        Option.liftA2((x:number,y:number) => x+y)(Option.of(5), Option.none<number>()))));
    it("should liftAp", () => assert.ok(Option.of(14).equals(
        Option.liftAp((x:{a:number,b:number,c:number}) => x.a+x.b+x.c)
        ({a:Option.of(5), b:Option.of(6), c:Option.of(3)}))));
    it("should abort liftAp on none", () => assert.ok(Option.none<number>().equals(
        Option.liftAp((x:{a:number,b:number}) => x.a+x.b)
        ({a:Option.of(5), b:Option.none<number>()}))));
    it("should support ifSome on Some", () => {
        let x = 0;
        Option.of(5).ifSome(v => x=v);
        assert.equal(5, x);
    });
    it("should support ifSome on None", () => {
        let x = 0;
        Option.of(5).filter(x=>x<0).ifSome(v => x=v);
        assert.equal(0, x);
    });
    it("should support ifNone on Some", () => {
        let x = 0;
        Option.of(5).ifNone(() => x=5);
        assert.equal(0, x);
    });
    it("should support ifNone on None", () => {
        let x = 0;
        Option.of(5).filter(x=>x<0).ifNone(() => x=5);
        assert.equal(5, x);
    });
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
        assert.throws(() => Option.none().getOrThrow("my custom msg"),
                      (err: Error) => err.message === 'my custom msg'));
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

describe("lifting", () => {
    it("should lift 0-parameter functions", () => {
        assert.ok(Option.lift(()=>1)().equals(Option.of(1)));
        assert.ok(Option.lift(()=>undefined)().isNone());
        assert.ok(Option.lift(()=>{throw "x"})().isNone());
    });
    it("should lift 1-parameter functions", () => {
        assert.ok(Option.lift((x:number)=>x+1)(1).equals(Option.of(2)));
        assert.ok(Option.lift((x:number)=>undefined)(1).isNone());
        assert.ok(Option.lift((x:number)=>{throw "x"})(1).isNone());
    });
    it("should lift 2-parameter functions", () => {
        assert.ok(Option.lift(
            (x:number,y:number)=>x+1)(1,2).equals(Option.of(2)));
        assert.ok(Option.lift(
            (x:number,y:number)=>undefined)(1,2).isNone());
        assert.ok(Option.lift(
            (x:number,y:number)=>{throw "x"})(1,2).isNone());
    });
    it("should lift 3-parameter functions" , () => {
        assert.ok(Option.lift(
            (x:number,y:number,z:number)=>x+1)(1,2,3).equals(Option.of(2)));
        assert.ok(Option.lift(
            (x:number,y:number,z:number)=>undefined)(1,2,3).isNone());
        assert.ok(Option.lift(
            (x:number,y:number,z:number)=>{throw "x"})(1,2,3).isNone());
    });
    it("should lift 4-parameter functions", () => {
        assert.ok(Option.lift(
            (x:number,y:number,z:number,a:number)=>x+1)(1,2,3,4).equals(Option.of(2)));
        assert.ok(Option.lift(
            (x:number,y:number,z:number,a:number)=>undefined)(1,2,3,4).isNone());
        assert.ok(Option.lift(
            (x:number,y:number,z:number,a:number)=>{throw "x"})(1,2,3,4).isNone());
    });
    it("should lift 5-parameter functions", () => {
        assert.ok(Option.lift(
            (x:number,y:number,z:number,a:number,b:number)=>x+1)(1,2,3,4,5).equals(Option.of(2)));
        assert.ok(Option.lift(
            (x:number,y:number,z:number,a:number,b:number)=>undefined)(1,2,3,4,5).isNone());
        assert.ok(Option.lift(
            (x:number,y:number,z:number,a:number,b:number)=>{throw "x"})(1,2,3,4,5).isNone());
    });
});
