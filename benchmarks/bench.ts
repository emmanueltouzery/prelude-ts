const Benchmark: any = require('benchmark');

import { Vector } from "../src/Vector"
import { List } from "../src/List"

function compare(...items: Array<[string, ()=>any]>) {
    const benchSuite: any = new Benchmark.Suite;
    for (const item of items) {
        benchSuite.add(item[0], item[1]);
    }
    benchSuite.on('cycle', function(event:any) {
        console.log(String(event.target));
    })
        .on('complete', function(this:any) {
            console.log('Fastest is ' + this.filter('fastest').map('name'));
        })
        .run();
}

// https://stackoverflow.com/a/43044960/516188
const getArray = (length:number) => Array.from({length}, () => Math.floor(Math.random() * length));
const array = getArray(200);
const vec = Vector.ofIterable(array);
const list = List.ofIterable(array);
compare(['Vector.filter', () => vec.filter(x => x%2===0)],
        ['Array.filter', () => array.filter(x => x%2===0)],
        ['List.filter', () => list.filter(x => x%2===0)]);

compare(['Vector.map', () => vec.map(x => x*2)],
        ['Array.map', () => array.map(x => x*2)],
        ['List.map', () => list.map(x => x*2)]);

compare(['Vector.ofIterable', () => Vector.ofIterable(array)],
        ['List.ofIterable', () => List.ofIterable(array)]);

compare(['Vector.flatMap', () => vec.flatMap(x => Vector.of(1,2))],
        ['List.flatMap', () => list.flatMap(x => List.of(1,2))]);

compare(['Vector.reverse', () => vec.reverse()],
        ['Array.reverse', () => array.reverse()],
        ['List.reverse', () => list.reverse()]);

compare(['Vector.groupBy', () => vec.groupBy(x => x%2)],
        ['List.groupBy', () => list.groupBy(x => x%2)]);

compare(['Vector.appendAll', () => vec.appendAll(vec)],
        ['Array.appendAll', () => array.concat(array)],
        ['List.appendAll', () => list.appendAll(list)]);

compare(['Vector.prependAll', () => vec.prependAll(vec)],
        ['Array.prependAll', () => array.concat(array)],
        ['List.prependAll', () => list.prependAll(list)]);
