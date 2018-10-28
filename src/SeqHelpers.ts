import { Option } from "./Option";
import { WithEquality, hasTrueEquality,
         Ordering, ToOrderable } from "./Comparison";
import { HashMap } from "./HashMap";
import { Seq } from "./Seq";
import { Collection } from "./Collection";
import { Stream, ConsStream } from "./Stream";
import { Lazy } from "./Lazy";
import { HashSet } from "./HashSet";

/**
 * @hidden
 */
export function shuffle(array: any[]) {
    // https://stackoverflow.com/a/2450976/516188
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

/**
 * @hidden
 */
export function arrangeBy<T,K>(collection: Collection<T>, getKey: (v:T)=>K&WithEquality): Option<HashMap<K,T>> {
    return Option.of(collection.groupBy(getKey).mapValues(v => v.single()))
        .filter(map => !map.anyMatch((k,v) => v.isNone()))
        .map(map => map.mapValues(v => v.getOrThrow()));
}

/**
 * @hidden
 */
export function seqHasTrueEquality<T>(seq: Seq<T>): boolean {
    return seq.find(x => x!=null).hasTrueEquality();
}

/**
 * @hidden
 */
export function zipWithIndex<T>(seq: Seq<T>): Seq<[T,number]> {
    return seq.zip<number>(Stream.iterate(0,i=>i+1));
}

/**
 * @hidden
 */
export function sortOn<T>(seq: Seq<T>, getKeys: Array<ToOrderable<T>|{desc:ToOrderable<T>}>): Seq<T> {
    return seq.sortBy((x,y) => {
        for (const getKey of getKeys) {
            if ((<any>getKey).desc) {
                const a = (<ToOrderable<T>>(<any>getKey).desc)(x);
                const b = (<ToOrderable<T>>(<any>getKey).desc)(y);
                if (a === b) {
                    continue;
                }
                return a<b?Ordering.GT:Ordering.LT;
            } else {
                const a = (<ToOrderable<T>>getKey)(x);
                const b = (<ToOrderable<T>>getKey)(y);
                if (a === b) {
                    continue;
                }
                return a>b?Ordering.GT:Ordering.LT;
            }
        }
        return Ordering.EQ;
    });
}

/**
 * @hidden
 */
export function distinctBy<T,U>(seq: Collection<T>, keyExtractor: (x:T)=>U&WithEquality): Collection<T> {
    let knownKeys = HashSet.empty<U>();
    return seq.filter(x => {
        const key = keyExtractor(x);
        const r = knownKeys.contains(key);
        if (!r) {
            knownKeys = knownKeys.add(key);
        }
        return !r;
    });
}

/**
 * Utility function to help converting a value to string
 * util.inspect seems to depend on node.
 * @hidden
 */
export function toStringHelper(
    obj: any|null,
    options: {quoteStrings:boolean} = {quoteStrings: true}): string
{
    if (Array.isArray(obj)) {
        return "[" + obj.map(o => toStringHelper(o, options)) + "]"
    }
    if (typeof obj === "string") {
        return options.quoteStrings ? `'${obj}'` : obj;
    }
    if (obj && (obj.toString !== Object.prototype.toString)) {
        return obj.toString();
    }
    // We used to use JSON.stringify here, but that will
    // throw an exception if there are cycles, which we
    // absolutely don't want!
    // https://stackoverflow.com/a/48254637/516188
    const customStringify = function (v:any) {
        const cache = new Set();
        return JSON.stringify(v, function (key, value) {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) {
                    // Circular reference found, discard key
                    return;
                }
                // Store value in our set
                cache.add(value);
            }
            return value;
        });
    };
    return customStringify(obj);
}

/**
 * @hidden
 */
export function minBy<T>(coll: Collection<T>, compare: (v1:T,v2:T)=>Ordering): Option<T> {
    return coll.reduce((v1,v2)=>compare(v1,v2)<0 ? v2 : v1);
}

/**
 * @hidden
 */
export function minOn<T>(coll: Collection<T>, getSortable: ToOrderable<T>): Option<T> {
    if (coll.isEmpty()) {
        return Option.none<T>();
    }
    let iter = coll[Symbol.iterator]();
    let step = iter.next();
    let val = getSortable(step.value);
    let result = step.value;
    while (!(step = iter.next()).done) {
        const curVal = getSortable(step.value);
        if (curVal < val) {
            val = curVal;
            result = step.value;
        }
    }
    return Option.of(result);
}

/**
 * @hidden
 */
export function maxBy<T>(coll: Collection<T>, compare: (v1:T,v2:T)=>Ordering): Option<T> {
    return coll.reduce((v1,v2)=>compare(v1,v2)>0 ? v2 : v1);
}

/**
 * @hidden
 */
export function maxOn<T>(coll: Collection<T>, getSortable: ToOrderable<T>): Option<T> {
    if (coll.isEmpty()) {
        return Option.none<T>();
    }
    let iter = coll[Symbol.iterator]();
    let step = iter.next();
    let val = getSortable(step.value);
    let result = step.value;
    while (!(step = iter.next()).done) {
        const curVal = getSortable(step.value);
        if (curVal > val) {
            val = curVal;
            result = step.value;
        }
    }
    return Option.of(result);
}

/**
 * @hidden
 */
export function sumOn<T>(coll: Collection<T>, getNumber: (v:T)=>number): number {
    return coll.foldLeft(0, (soFar,cur)=>soFar+getNumber(cur));
}

/**
 * @hidden
 */
export function reduce<T>(coll: Collection<T>, combine: (v1:T,v2:T)=>T): Option<T> {
    if (coll.isEmpty()) {
        return Option.none<T>();
    }
    let iter = coll[Symbol.iterator]();
    let step = iter.next();
    let result = step.value;
    while (!(step = iter.next()).done) {
        result = combine(result, step.value);
    }
    return Option.of(result);
}

/**
 * @hidden
 */
export function sliding<T>(seq: Seq<T>, count:number): Stream<Seq<T>> {
    // in a way should get better performance with Seq.splitAt instead
    // of Seq.take+Seq.drop, but we should be lazy and not hold another
    // version of the sequence in memory (though for linked list it's free,
    // it's not the case for Vector)
    return seq.isEmpty() ?
        Stream.empty<Seq<T>>() :
        new ConsStream(seq.take(count), Lazy.of(() => sliding(seq.drop(count), count)));
}

/**
 * @hidden
 */
export function removeAll<T>(seq: Seq<T>, elts:Iterable<T&WithEquality>): Seq<T> {
    const toRemove = HashSet.ofIterable(elts);
    // I know T must have equality since the parameter has it and is the same type.
    return <Seq<T>><any>(<Seq<T&WithEquality>><any>seq).filter(x => !toRemove.contains(x));
}
