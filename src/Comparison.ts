import { Option } from "./Option";

/**
 * Sorting function for type T: function
 * to convert this type to a type which is natively
 * sortable in javascript, that is string, number or boolean.
 * `((v:T)=>number) | ((v:T)=>string) | ((v:T)=>boolean`
 */
export type ToOrderable<T> = ((v:T)=>number) | ((v:T)=>string) | ((v:T)=>boolean);

/**
 * List of types which provide equality semantics:
 * some builtin JS types, for which === provides
 * proper semantics, and then types providing HasEquals.
 * The reason I use all over the place T&WithEquality
 * instead of saying <T extends WithEquality> earlier
 * in the declaration is: https://stackoverflow.com/a/45903143/516188
 */
export type WithEquality
    = string
    | number
    | boolean
    | null
    | HasEquals;

/**
 * A type with semantic equality relationships
 */
export type HasEquals = {equals(other: any): boolean; hashCode(): number;};

/**
 * Type guard for HasEquals: find out for a type with
 * semantic equality, whether you should call .equals
 * or ===
 */
export function hasEquals(v: WithEquality): v is HasEquals {
    // there is a reason why we check only for equals, not for hashCode.
    // we want to decide which codepath to take: === or equals/hashcode.
    // if there is a equals function then we don't want ===, regardless of
    // whether there is a hashCode method or not. If there is a equals
    // and not hashCode, we want to go on the equals/hashCode codepath,
    // which will blow a little later at runtime if the hashCode is missing.
    return ((<HasEquals>v).equals !== undefined);
}

/**
 * Helper function for your objects so you can compute
 * a hashcode. You can pass to this function all the fields
 * of your object that should be taken into account for the
 * hash, and the function will return a reasonable hash code.
 *
 * @param fields the fields of your object to take
 *        into account for the hashcode
 */
export function fieldsHashCode(...fields: any[]): number {
    // https://stackoverflow.com/a/113600/516188
    // https://stackoverflow.com/a/18066516/516188
    let result = 1;
    for (const value of fields) {
        result = 37*result + getHashCode(value);
    }
    return result;
}

/**
 * Helper function to compute a reasonable hashcode for strings.
 */
export function stringHashCode(str: string): number {
    // https://stackoverflow.com/a/7616484/516188
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr   = str.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

/**
 * Equality function which tries semantic equality (using .equals())
 * if possible, degrades to === if not available, and is also null-safe.
 */
export function areEqual(obj: any|null, obj2: any|null): boolean {
    if (obj === null != obj2 === null) {
        return false;
    }
    if (obj === null || obj2 === null) {
        return true;
    }
    if (hasEquals(obj)) {
        return obj.equals(obj2);
    }
    return obj === obj2;
}

/**
 * Hashing function which tries to call hashCode()
 * and uses the object itself for numbers, then degrades
 * for stringHashCode of the string representation if
 * not available.
 */
export function getHashCode(obj: any|null): number {
    if (!obj) {
        return 0;
    }
    if (hasEquals(obj)) {
        return obj.hashCode();
    }
    if (typeof obj === 'number') {
        // this is the hashcode implementation for numbers from immutablejs
        if (obj !== obj || obj === Infinity) {
            return 0;
        }
        let h = obj | 0;
        if (h !== obj) {
            h ^= obj * 0xffffffff;
        }
        while (obj > 0xffffffff) {
            obj /= 0xffffffff;
            h ^= obj;
        }
        return smi(h);
    }
    const val = obj+"";
    return val.length > STRING_HASH_CACHE_MIN_STRLEN ?
        cachedHashString(val) :
        stringHashCode(val);
}

function cachedHashString(string: string) {
    let hashed = stringHashCache[string];
    if (hashed === undefined) {
        hashed = stringHashCode(string);
        if (STRING_HASH_CACHE_SIZE === STRING_HASH_CACHE_MAX_SIZE) {
            STRING_HASH_CACHE_SIZE = 0;
            stringHashCache = {};
        }
        STRING_HASH_CACHE_SIZE++;
        stringHashCache[string] = hashed;
    }
    return hashed;
}

// v8 has an optimization for storing 31-bit signed numbers.
// Values which have either 00 or 11 as the high order bits qualify.
// This function drops the highest order bit in a signed number, maintaining
// the sign bit. (taken from immutablejs)
function smi(i32: number): number {
    return ((i32 >>> 1) & 0x40000000) | (i32 & 0xbfffffff);
}

const STRING_HASH_CACHE_MIN_STRLEN = 16;
const STRING_HASH_CACHE_MAX_SIZE = 255;
let STRING_HASH_CACHE_SIZE = 0;
let stringHashCache: {[key:string]:number} = {};

/**
 * @hidden
 */
export function hasTrueEquality(val: any): Option<boolean> {
    if (!val) {
        return Option.none<boolean>();
    }
    if (val.equals) {
        return Option.of(true);
    }
    switch (val.constructor) {
    case String:
    case Number:
    case Boolean:
        return Option.of(true);
    }
    return Option.of(false);
}

/**
 * Enumeration used to express ordering relationships.
 * it's a const enum, is replaced by integers in the source.
 */
export const enum Ordering {
    /**
     * Lower Than
     */
    LT=-1,
    /**
     * EQuals
     */
    EQ=0,
    /**
     * Greater Than
     */
    GT=1
};

/**
 * Typescript doesn't infer typeguards for lambdas; it only sees
 * predicates. This type allows you to cast a predicate to a type
 * guard in a handy manner.
 *
 * It comes in handy for discriminated unions with a 'kind' discriminator,
 * for instance:
 *
 * .`filter(<TypeGuard<InBoard|OutBoard,InBoard>>(p => p.kind === "in_board"))`
 *
 * Also see [[typeGuard]], [[instanceOf]] and [[typeOf]].
 */
export type TypeGuard<T,U extends T> = (x: T) => x is U;

/**
 * Typescript doesn't infer typeguards for lambdas; it only sees
 * predicates. This type allows you to cast a predicate to a type
 * guard in a handy manner.
 *
 * It comes in handy for discriminated unions with a 'kind' discriminator,
 * for instance:
 *
 * `.filter(typeGuard(p => p.kind === "in_board", {} as InBoard))`
 *
 * Normally you'd have to give both type parameters, but you can use
 * the type witness parameter as shown in that example to skip
 * the first type parameter.
 *
 * Also see [[typeGuard]], [[instanceOf]] and [[typeOf]].
 */
export function typeGuard<T,U extends T>(predicate:(x:T)=>boolean,
                                         typeWitness?: U): TypeGuard<T,U> {
    return <TypeGuard<T,U>>predicate;
}

/**
 * Curried function returning a type guard telling us if a value
 * is of a specific instance.
 * Can be used when filtering to filter for the type and at the
 * same time change the type of the generics on the container.
 *
 *     Vector.of<any>("bad", new Date('04 Dec 1995 00:12:00 GMT')).filter(instanceOf(Date))
 *     => Vector.of<Date>(new Date('04 Dec 1995 00:12:00 GMT'))
 *
 *     Option.of<any>("test").filter(instanceOf(Date))
 *     => Option.none<Date>()
 *
 *     Option.of<any>(new Date('04 Dec 1995 00:12:00 GMT')).filter(instanceOf(Date))
 *     => Option.of<Date>(new Date('04 Dec 1995 00:12:00 GMT'))
 *
 * Also see [[typeGuard]] and [[typeOf]].
 */
export function instanceOf<T>(ctor: new(...args: any[]) => T): TypeGuard<any,T> {
    // https://github.com/Microsoft/TypeScript/issues/5101#issuecomment-145693151
    return <TypeGuard<any,T>>(x => x instanceof ctor);
}

/**
 * Curried function returning a type guard telling us if a value
 * is of a specific type.
 * Can be used when filtering to filter for the type and at the
 * same time change the type of the generics on the container.
 *
 *     Vector.of<any>(1,"a",2,3,"b").filter(typeOf("number"))
 *     => Vector.of<number>(1,2,3)
 *
 *     Option.of<any>(1).filter(typeOf("string"))
 *     => Option.none<string>()
 *
 *     Option.of<any>("str").filter(typeOf("string"))
 *     => Option.of<string>("str")
 *
 * Also see [[instanceOf]] and [[typeGuard]].
 */
export function typeOf(typ: "string"): TypeGuard<any,string>;
export function typeOf(typ: "number"): TypeGuard<any,number>;
export function typeOf(typ: "boolean"): TypeGuard<any,boolean>;
export function typeOf(typ: "symbol"): TypeGuard<any,symbol>;
export function typeOf(typ: string): TypeGuard<any,any> {
    return <any>((x:any) => typeof x === typ);
}
