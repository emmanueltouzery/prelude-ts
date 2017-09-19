import { Option } from "./Option";
import { WithEquality } from "./Comparison";
import { IMap } from "./IMap";
import { Seq } from "./Seq";

// https://stackoverflow.com/a/2450976/516188
export function shuffle(array: any[]) {
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

export function arrangeBy<T,K>(seq: Seq<T>, getKey: (v:T)=>K&WithEquality): Option<IMap<K,T>> {
    return Option.of(seq.groupBy(getKey).mapValues(v => v.single()))
        .filter(map => !map.anyMatch((k,v) => v.isNone()))
        .map(map => map.mapValuesStruct(v => v.getOrThrow()));
}
