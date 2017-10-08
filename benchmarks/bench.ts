const Benchmark: any = require('benchmark');

import { Vector } from "../src/Vector"
import { List } from "../src/List"
import * as imm from 'immutable';

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
const length = 200;
const array = getArray(length);
const vec = Vector.ofIterable(array);
const list = List.ofIterable(array);
const immList = imm.List(array);
compare(['Vector.filter', () => vec.filter(x => x%2===0)],
        ['Array.filter', () => array.filter(x => x%2===0)],
        ['immList.filter', () => immList.filter(x => x%2===0)],
        ['List.filter', () => list.filter(x => x%2===0)]);

compare(['Vector.map', () => vec.map(x => x*2)],
        ['Array.map', () => array.map(x => x*2)],
        ['immList.map', () => immList.map(x => x*2)],
        ['List.map', () => list.map(x => x*2)]);

compare(['Vector.ofIterable', () => Vector.ofIterable(array)],
        ['List.ofIterable', () => List.ofIterable(array)],
        ['immList.ofIterable', () => imm.List(array)]);

compare(['Vector.get(i)', () => vec.get(length/2)],
        ['List.get(i)', () => list.get(length/2)],
        ['Array.get(i)', () => array[length/2]],
        ['immList.get(i)', () => immList.get(length/2)]);

compare(['Vector.flatMap', () => vec.flatMap(x => Vector.of(1,2))],
        ['List.flatMap', () => list.flatMap(x => List.of(1,2))],
        ['immList.flatMap', () => immList.flatMap(x => imm.List([1,2]))]);

compare(['Vector.reverse', () => vec.reverse()],
        ['Array.reverse', () => array.reverse()],
        ['immList.reverse', () => immList.reverse()],
        ['List.reverse', () => list.reverse()]);

compare(['Vector.groupBy', () => vec.groupBy(x => x%2)],
        ['List.groupBy', () => list.groupBy(x => x%2)],
        ['immList.groupBy', () => immList.groupBy(x => x%2)]);

compare(['Vector.appendAll', () => vec.appendAll(vec)],
        ['Array.appendAll', () => array.concat(array)],
        ['immList.appendAll', () => immList.concat(immList)],
        ['List.appendAll', () => list.appendAll(list)]);

compare(['Vector.prependAll', () => vec.prependAll(vec)],
        ['Array.prependAll', () => array.concat(array)],
        ['List.prependAll', () => list.prependAll(list)]);

compare(['Vector.foldLeft', () => vec.foldLeft(0, (acc,i)=>acc+i)],
        ['Array.foldLeft', () => array.reduce((acc,i)=>acc+i)],
        ['immList.foldLeft', () => immList.reduce((acc,i)=>acc+i,0)],
        ['List.foldLeft', () => vec.foldLeft(0, (acc,i)=>acc+i)]);

compare(['Vector.foldRight', () => vec.foldRight(0, (i,acc)=>acc+i)],
        ['immList.foldRight', () => immList.reduceRight((acc,i)=>acc+i,0)],
        ['List.foldRight', () => vec.foldRight(0, (i,acc)=>acc+i)]);
