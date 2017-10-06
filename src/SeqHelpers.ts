import { Option } from "./Option";
import { WithEquality, hasTrueEquality } from "./Comparison";
import { IMap } from "./IMap";
import { Seq } from "./Seq";
import { Stream } from "./Stream";

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
export function arrangeBy<T,K>(seq: Seq<T>, getKey: (v:T)=>K&WithEquality): Option<IMap<K,T>> {
    return Option.of(seq.groupBy(getKey).mapValues(v => v.single()))
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
