export class FunctionX0<R> {
    
    /**
     * @hidden
     */
    constructor(private fn: ()=>R) {}

    // proper function appl but must be an interface
    apply(): R {
        return this.fn();
    }
}

type THead<T extends any[]> = 
	T extends [infer R, ...any[]] ? R : 
	T extends [] ? undefined : 
	  never;

// must go through a function to extract the type of the rest parameters, see
// see https://github.com/Microsoft/TypeScript/issues/25719
type TTail<T extends any[]> =
	((...args: T) => void) extends ((first: any, ...rest: infer S1) => void) ? S1
	: T extends [infer S2] ? []
	: T extends [] ? []
	: never;

type Apply1ReturnType<P,R> = P extends [infer T1, infer T2, ...any[]] ?
    (((...args: P) => void) extends ((first: any, ...rest: infer S1) => void) ? FunctionX<T1,S1,R> : never)
    : FunctionX0<R>;
// type ReturnType<P,R> = P extends [infer T1, infer T2, ...any[]] ?
//     FunctionX<T1,any[],R> : FunctionX0<R>;


// https://github.com/Microsoft/TypeScript/issues/14174#issuecomment-411661058
type CurryReturnType<T,P extends any[],R> = {
    0: FunctionX<T,[],R>,
    1: FunctionX<T,[],CurryReturnType<THead<P>,TTail<P>,R>>
}[P extends [infer T1, ...any[]] ? 1 : 0];
// type CurryReturnType<T,P,R> = P extends [infer T1, ...any[]] ?
//     FunctionX<T,[],CurryReturnType<T1,TTail<P>,R>> : FunctionX0<R>;

export class FunctionX<T, P extends any[], R> {

    private constructor(private fn: (p1:T,...p:P)=>R) {}

    public static of<R>(fn: ()=>R): FunctionX0<R>
    public static of<T, P extends any[], R>(fn: (p1:T,...p:P)=>R): FunctionX<T,P,R>
    public static of(fn: any): any {
        if (fn.length === 0) {
            return new FunctionX0(fn);
        }
        return new FunctionX(fn);
    }

    // TODO proper fn application but must be interface
    apply(p1: T, ...rest: P): R {
        return this.fn(p1, ...rest);
    }

    // (p1: T, rest: P): R {
    //     return this.fn(p1, ...rest);
    // }

    public apply1(p: T): Apply1ReturnType<P, R> {
        return <any>null;
    }

    public curried(): CurryReturnType<T,P,R> {
        return <any>null;
    }

    public tupled(): ((a: T, ...args: P) => R) extends ((...allP: infer AP) => infer R1)
        ? FunctionX<AP,[],R>: never {
    // FunctionX<[T,...P],[],R> {
        return <any>null;
    }
}

const f/*: FunctionX0<number>*/ = FunctionX.of(()=>5);
const f2/*: FunctionX<number,[number],number>*/ = FunctionX.of((x:number,y:number)=>x+y);
const f3/*: FunctionX<number,[number,number],number>*/ = FunctionX.of((x:number,y:number,z:number)=>x+y+z);

const a1: FunctionX0<number> = f2.apply1(5)
const a2: FunctionX<number,[number],number> = f3.apply1(1)
const a3: FunctionX0<number> = f3.apply1(5).apply1(2);

const v: number = f2.curried().apply(5).apply(6);
const w: FunctionX<number,[], FunctionX<number,[],FunctionX<number, [],number>>> = f3.curried();

const n: number = f3.tupled().apply([1,2,3])
