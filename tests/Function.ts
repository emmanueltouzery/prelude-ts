import { Function } from '../src/Function';
import * as assert from 'assert'

describe("function composition", () => {
    it ("Function1 tests", () => {
        const add1 = Function.lift1((x:number)=>x+1);
        assert.equal(9, add1.compose((x:number)=>x*2)(4));
        assert.equal(10, add1.andThen((x:number)=>x*2)(4));
        assert.equal(5, Function.id()(5));
        assert.equal(5, Function.const1(5)(12));
    });
    it ("Function2 tests", () => {
        const sumPlus1 = Function.lift2((x:number,y:number)=>x+y+1);
        assert.equal(16, sumPlus1.andThen((x:number)=>x*2)(4,3));
        assert.equal(8, sumPlus1.curried()(4)(3));
        assert.equal(8, sumPlus1.tupled()([4,3]));
        assert.equal(8, sumPlus1.flipped()(4,3));
        assert.equal(5, Function.const2(5)(12,32));
        assert.equal(8, sumPlus1.apply1(4)(3));
    });
    it ("Function3 tests", () => {
        const sumPlus1 = Function.lift3((x:number,y:number,z:number)=>x+y+z+1);
        assert.equal(20, sumPlus1.andThen((x:number)=>x*2)(4,3,2));
        assert.equal(10, sumPlus1.curried()(4)(3)(2));
        assert.equal(10, sumPlus1.tupled()([4,3,2]));
        assert.equal(10, sumPlus1.flipped()(4,3,2));
        assert.equal(5, Function.const3(5)(12,32,45));
        assert.equal(10, sumPlus1.apply1(4)(3,2));
        assert.equal(10, sumPlus1.apply2(4,3)(2));
    });
    it ("Function4 tests", () => {
        const sumPlus1 = Function.lift4((x:number,y:number,z:number,a:number)=>x+y+z+a+1);
        assert.equal(22, sumPlus1.andThen((x:number)=>x*2)(4,3,2,1));
        assert.equal(11, sumPlus1.curried()(4)(3)(2)(1));
        assert.equal(11, sumPlus1.tupled()([4,3,2,1]));
        assert.equal(11, sumPlus1.flipped()(4,3,2,1));
        assert.equal(5, Function.const4(5)(12,32,45,34));
        assert.equal(11, sumPlus1.apply1(4)(3,2,1));
        assert.equal(11, sumPlus1.apply2(4,3)(2,1));
        assert.equal(11, sumPlus1.apply3(4,3,2)(1));
    });
    it ("Function5 tests", () => {
        const sumPlus1 = Function.lift5((x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b+1);
        assert.equal(22, sumPlus1.andThen((x:number)=>x*2)(4,3,2,1,0));
        assert.equal(11, sumPlus1.curried()(4)(3)(2)(1)(0));
        assert.equal(11, sumPlus1.tupled()([4,3,2,1,0]));
        assert.equal(11, sumPlus1.flipped()(4,3,2,1,0));
        assert.equal(5, Function.const5(5)(12,32,45,34,23));
        assert.equal(11, sumPlus1.apply1(4)(3,2,1,0));
        assert.equal(11, sumPlus1.apply2(4,3)(2,1,0));
        assert.equal(11, sumPlus1.apply3(4,3,2)(1,0));
        assert.equal(11, sumPlus1.apply4(4,3,2,1)(0));
    });
});
