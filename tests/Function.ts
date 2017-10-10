import { Function } from '../src/Function';
import * as assert from 'assert'

describe("function composition", () => {
    it ("Function1 tests", () => {
        assert.equal(9, Function.lift1((x:number)=>x+1).compose((x:number)=>x*2)(4));
        assert.equal(10, Function.lift1((x:number)=>x+1).andThen((x:number)=>x*2)(4));
        assert.equal(5, Function.id()(5));
        assert.equal(5, Function.const1(5)(12));
    });
    it ("Function2 tests", () => {
        assert.equal(16, Function.lift2((x:number,y:number)=>x+y+1).andThen((x:number)=>x*2)(4,3));
        assert.equal(8, Function.lift2((x:number,y:number)=>x+y+1).curried()(4)(3));
        assert.equal(8, Function.lift2((x:number,y:number)=>x+y+1).tupled()([4,3]));
        assert.equal(8, Function.lift2((x:number,y:number)=>x+y+1).flipped()(4,3));
        assert.equal(5, Function.const2(5)(12,32));
    });
    it ("Function3 tests", () => {
        assert.equal(20, Function.lift3((x:number,y:number,z:number)=>x+y+z+1).andThen((x:number)=>x*2)(4,3,2));
        assert.equal(10, Function.lift3((x:number,y:number,z:number)=>x+y+z+1).curried()(4)(3)(2));
        assert.equal(10, Function.lift3((x:number,y:number,z:number)=>x+y+z+1).tupled()([4,3,2]));
        assert.equal(10, Function.lift3((x:number,y:number,z:number)=>x+y+z+1).flipped()(4,3,2));
        assert.equal(5, Function.const3(5)(12,32,45));
    });
    it ("Function4 tests", () => {
        assert.equal(22, Function.lift4((x:number,y:number,z:number,a:number)=>x+y+z+a+1).andThen((x:number)=>x*2)(4,3,2,1));
        assert.equal(11, Function.lift4((x:number,y:number,z:number,a:number)=>x+y+z+a+1).curried()(4)(3)(2)(1));
        assert.equal(11, Function.lift4((x:number,y:number,z:number,a:number)=>x+y+z+a+1).tupled()([4,3,2,1]));
        assert.equal(11, Function.lift4((x:number,y:number,z:number,a:number)=>x+y+z+a+1).flipped()(4,3,2,1));
        assert.equal(5, Function.const4(5)(12,32,45,34));
    });
    it ("Function5 tests", () => {
        assert.equal(22, Function.lift5((x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b+1).andThen((x:number)=>x*2)(4,3,2,1,0));
        assert.equal(11, Function.lift5((x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b+1).curried()(4)(3)(2)(1)(0));
        assert.equal(11, Function.lift5((x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b+1).tupled()([4,3,2,1,0]));
        assert.equal(11, Function.lift5((x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b+1).flipped()(4,3,2,1,0));
        assert.equal(5, Function.const5(5)(12,32,45,34,23));
    });
});
