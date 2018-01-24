import { Function0, Function1, Function2, Function3, Function4, Function5 } from '../src/Function';
import { Option } from "../src/Option";
import * as assert from 'assert'

describe("function composition", () => {
    it ("Function0 tests", () => {
        const two = Function0.of(()=>2);
        assert.equal(4, two.andThen((x:number)=>x*2)());
        assert.equal(5, Function0.constant(5)());
    });
    it ("Function1 tests", () => {
        const add1 = Function1.of((x:number)=>x+1);
        assert.equal(9, add1.compose((x:number)=>x*2)(4));
        assert.equal(10, add1.andThen((x:number)=>x*2)(4));
        assert.equal(5, Function1.id()(5));
        assert.equal(5, Function1.constant(5)(12));
        assert.ok(Function1.liftOption((x:number)=>x+1)(1).equals(Option.of(2)));
        assert.ok(Function1.liftOption((x:number)=>undefined)(1).isNone());
        assert.ok(Function1.liftOption((x:number)=>{throw "x"})(1).isNone());
    });
    it ("Function2 tests", () => {
        const sumPlus1 = Function2.of((x:number,y:number)=>x+y+1);
        assert.equal(16, sumPlus1.andThen((x:number)=>x*2)(4,3));
        assert.equal(8, sumPlus1.curried()(4)(3));
        assert.equal(8, sumPlus1.tupled()([4,3]));
        assert.equal(8, sumPlus1.flipped()(4,3));
        assert.equal(5, Function2.constant(5)(12,32));
        assert.equal(8, sumPlus1.apply1(4)(3));
        assert.ok(Function2.liftOption(
            (x:number,y:number)=>x+1)(1,2).equals(Option.of(2)));
        assert.ok(Function2.liftOption(
            (x:number,y:number)=>undefined)(1,2).isNone());
        assert.ok(Function2.liftOption(
            (x:number,y:number)=>{throw "x"})(1,2).isNone());
    });
    it ("Function3 tests", () => {
        const sumPlus1 = Function3.of((x:number,y:number,z:number)=>x+y+z+1);
        assert.equal(20, sumPlus1.andThen((x:number)=>x*2)(4,3,2));
        assert.equal(10, sumPlus1.curried()(4)(3)(2));
        assert.equal(10, sumPlus1.tupled()([4,3,2]));
        assert.equal(10, sumPlus1.flipped()(4,3,2));
        assert.equal(5, Function3.constant(5)(12,32,45));
        assert.equal(10, sumPlus1.apply1(4)(3,2));
        assert.equal(10, sumPlus1.apply2(4,3)(2));
        assert.ok(Function3.liftOption(
            (x:number,y:number,z:number)=>x+1)(1,2,3).equals(Option.of(2)));
        assert.ok(Function3.liftOption(
            (x:number,y:number,z:number)=>undefined)(1,2,3).isNone());
        assert.ok(Function3.liftOption(
            (x:number,y:number,z:number)=>{throw "x"})(1,2,3).isNone());
    });
    it ("Function4 tests", () => {
        const sumPlus1 = Function4.of((x:number,y:number,z:number,a:number)=>x+y+z+a+1);
        assert.equal(22, sumPlus1.andThen((x:number)=>x*2)(4,3,2,1));
        assert.equal(11, sumPlus1.curried()(4)(3)(2)(1));
        assert.equal(11, sumPlus1.tupled()([4,3,2,1]));
        assert.equal(11, sumPlus1.flipped()(4,3,2,1));
        assert.equal(5, Function4.constant(5)(12,32,45,34));
        assert.equal(11, sumPlus1.apply1(4)(3,2,1));
        assert.equal(11, sumPlus1.apply2(4,3)(2,1));
        assert.equal(11, sumPlus1.apply3(4,3,2)(1));
        assert.ok(Function4.liftOption(
            (x:number,y:number,z:number,a:number)=>x+1)(1,2,3,4).equals(Option.of(2)));
        assert.ok(Function4.liftOption(
            (x:number,y:number,z:number,a:number)=>undefined)(1,2,3,4).isNone());
        assert.ok(Function4.liftOption(
            (x:number,y:number,z:number,a:number)=>{throw "x"})(1,2,3,4).isNone());
    });
    it ("Function5 tests", () => {
        const sumPlus1 = Function5.of((x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b+1);
        assert.equal(22, sumPlus1.andThen((x:number)=>x*2)(4,3,2,1,0));
        assert.equal(11, sumPlus1.curried()(4)(3)(2)(1)(0));
        assert.equal(11, sumPlus1.tupled()([4,3,2,1,0]));
        assert.equal(11, sumPlus1.flipped()(4,3,2,1,0));
        assert.equal(5, Function5.constant(5)(12,32,45,34,23));
        assert.equal(11, sumPlus1.apply1(4)(3,2,1,0));
        assert.equal(11, sumPlus1.apply2(4,3)(2,1,0));
        assert.equal(11, sumPlus1.apply3(4,3,2)(1,0));
        assert.equal(11, sumPlus1.apply4(4,3,2,1)(0));
        assert.ok(Function5.liftOption(
            (x:number,y:number,z:number,a:number,b:number)=>x+1)(1,2,3,4,5).equals(Option.of(2)));
        assert.ok(Function5.liftOption(
            (x:number,y:number,z:number,a:number,b:number)=>undefined)(1,2,3,4,5).isNone());
        assert.ok(Function5.liftOption(
            (x:number,y:number,z:number,a:number,b:number)=>{throw "x"})(1,2,3,4,5).isNone());
    });
});
