const Benchmark: any = require('benchmark');

import { execSync } from "child_process";
import { Vector } from "../src/Vector";
import { HashSet } from "../src/HashSet";
import { HashMap } from "../src/HashMap";
import { LinkedList } from "../src/LinkedList";
import * as imm from 'immutable';
const hamt: any = require("hamt_plus");
const hamtBase: any = require("hamt");

const lengths = [200, 10000];

function getPrerequisites(length:number): Prerequisites {
    // https://stackoverflow.com/a/43044960/516188
    const getArray = (length:number) => Array.from({length}, () => Math.floor(Math.random() * length));
    const array = getArray(length);
    const vec = Vector.ofIterable(array);
    const rawhamt = hamt.empty.mutate(
        (h:any) => {
            const iterator = array[Symbol.iterator]();
            let curItem = iterator.next();
            while (!curItem.done) {
                h.set(h.size, curItem.value);
                curItem = iterator.next();
            }
        });
    let rawhamtBase = hamtBase.empty;
    const iterator = array[Symbol.iterator]();
    let curItem = iterator.next();
    while (!curItem.done) {
        rawhamtBase = rawhamtBase.set(rawhamtBase.size, curItem.value);
        curItem = iterator.next();
    }

    const list = LinkedList.ofIterable(array);
    const immList = imm.List(array);

    const idxThreeQuarters = array.length*3/4;
    const atThreeQuarters = array[idxThreeQuarters];

    const hashset = HashSet.ofIterable(array);
    const immSet = imm.Set(array);

    const hashmap = HashMap.ofIterable<string,number>(array.map<[string,number]>(x => [x+"",x]));
    const immMap = imm.Map(array.map<[string,number]>(x => [x+"",x]));

    return {vec,immList,array,list,idxThreeQuarters,
            rawhamt,rawhamtBase,hashset,immSet,length,hashmap,immMap};
}

interface Prerequisites {
    vec: Vector<number>;
    immList: imm.List<number>;
    array: number[];
    list:LinkedList<number>;
    idxThreeQuarters: number;
    rawhamt: any;
    rawhamtBase: any;
    hashset: HashSet<number>;
    immSet: imm.Set<number>;
    hashmap: HashMap<string,number>;
    immMap: imm.Map<string,number>;
    length:number;
}

const preReqs = lengths.map(getPrerequisites);

function _compare(preReqs: Prerequisites, items: Array<[string, (x:Prerequisites)=>any]>) {
    const benchSuite: any = new Benchmark.Suite;
    for (const item of items) {
        benchSuite.add(item[0], () => item[1](preReqs));
    }
    benchSuite.on('cycle', function(event:any) {
        console.log(String(event.target));
    }).on('complete', function(this:any) {
        console.log('Fastest is ' + this.filter('fastest').map('name') + "\n");
    }).run();
}
function compare(...items: Array<[string, (x:Prerequisites)=>any]>) {
    for (let i=0;i<lengths.length;i++) {
        let length = lengths[i];
        console.log("n = " + length);
        _compare(preReqs[i], items);
    }
}

console.log("immList, immSet are the immutablejs list,set... https://facebook.github.io/immutable-js/");

process.stdout.write("node version: ");
execSync("node --version", {stdio:[0,1,2]});
console.log();

compare(['Vector.toArray', (p:Prerequisites) => p.vec.toArray()],
        ['LinkedList.toArray', (p:Prerequisites) => p.list.toArray()],
        ['immList.toArray', (p:Prerequisites) => p.immList.toArray()]);

compare(['Vector.take', (p:Prerequisites) => p.vec.take(p.idxThreeQuarters)],
        ['Array.slice', (p:Prerequisites) => p.array.slice(0,p.idxThreeQuarters)],
        ['immList.take', (p:Prerequisites) => p.immList.take(p.idxThreeQuarters)],
        ['LinkedList.take', (p:Prerequisites) => p.list.take(p.idxThreeQuarters)]);

compare(['Vector.filter', (p:Prerequisites) => p.vec.filter(x => x%2===0)],
        ['Array.filter', (p:Prerequisites) => p.array.filter(x => x%2===0)],
        ['immList.filter', (p:Prerequisites) => p.immList.filter(x => x%2===0)],
        ['LinkedList.filter', (p:Prerequisites) => p.list.filter(x => x%2===0)]);

compare(['Vector.map', (p:Prerequisites) => p.vec.map(x => x*2)],
        ['Array.map', (p:Prerequisites) => p.array.map(x => x*2)],
        ['immList.map', (p:Prerequisites) => p.immList.map(x => x*2)],
        ['LinkedList.map', (p:Prerequisites) => p.list.map(x => x*2)]);

compare(['Vector.find', (p:Prerequisites) => p.vec.find(x => x===p.idxThreeQuarters)],
        ['Array.find', (p:Prerequisites) => p.array.find(x => x===p.idxThreeQuarters)],
        ['immList.find', (p:Prerequisites) => p.immList.find(x => x===p.idxThreeQuarters)],
        ['LinkedList.find', (p:Prerequisites) => p.list.find(x => x===p.idxThreeQuarters)]);

compare(['Vector.ofIterable', (p:Prerequisites) => Vector.ofIterable(p.array)],
        ['rawhamt.build from iterable', (p:Prerequisites) => {
            hamt.empty.mutate(
                (h:any) => {
                    const iterator = p.array[Symbol.iterator]();
                    let curItem = iterator.next();
                    while (!curItem.done) {
                        h.set(h.size, curItem.value);
                        curItem = iterator.next();
                    }
                })
        }],
        ['rawhamt.build from array', (p:Prerequisites) => {
            hamt.empty.mutate(
                (h:any) => {
                    for (let i=0;i<p.array.length;i++) {
                        h.set(i, p.array[i]);
                    }
                })
        }],
        ['rawhamtBase.build from iterable', (p:Prerequisites) => {
            let rawhamtBase = hamtBase.empty;
            const iterator = p.array[Symbol.iterator]();
            let curItem = iterator.next();
            while (!curItem.done) {
                rawhamtBase = rawhamtBase.set(rawhamtBase.size, curItem.value);
                curItem = iterator.next();
            }
        }],
        ['LinkedList.ofIterable', (p:Prerequisites) =>LinkedList.ofIterable(p.array)],
        ['immList.ofIterable', (p:Prerequisites) => imm.List(p.array)]);

compare(['Vector.get(i)', (p:Prerequisites) => p.vec.get(p.length/2)],
        ['rawhamt.get(i)', (p:Prerequisites) => p.rawhamt.get(p.length/2)],
        ['rawhamtBase.get(i)', (p:Prerequisites) => p.rawhamtBase.get(p.length/2)],
        ['LinkedList.get(i)', (p:Prerequisites) => p.list.get(p.length/2)],
        ['Array.get(i)', (p:Prerequisites) => p.array[p.length/2]],
        ['immList.get(i)', (p:Prerequisites) => p.immList.get(p.length/2)]);

compare(['Vector.flatMap', (p:Prerequisites) => p.vec.flatMap(x => Vector.of(1,2))],
        ['LinkedList.flatMap', (p:Prerequisites) => p.list.flatMap(x =>LinkedList.of(1,2))],
        ['immList.flatMap', (p:Prerequisites) => p.immList.flatMap(x => imm.List([1,2]))]);

compare(['Vector.reverse', (p:Prerequisites) => p.vec.reverse()],
        ['Array.reverse', (p:Prerequisites) => p.array.reverse()],
        ['immList.reverse', (p:Prerequisites) => p.immList.reverse()],
        ['LinkedList.reverse', (p:Prerequisites) => p.list.reverse()]);

compare(['Vector.groupBy', (p:Prerequisites) => p.vec.groupBy(x => x%2)],
        ['LinkedList.groupBy', (p:Prerequisites) => p.list.groupBy(x => x%2)],
        ['immList.groupBy', (p:Prerequisites) => p.immList.groupBy(x => x%2)]);

compare(
    ['Vector.append', (p:Prerequisites) => {
        let v = Vector.empty<number>();
        for (let item of p.array) {
            v = v.append(item);
        }
    }],
    ['Array.push', (p:Prerequisites) => {
        let v = [];
        for (let item of p.array) {
            v.push(item);
        }
    }],
    ['immList.push', (p:Prerequisites) => {
        let v = imm.List<number>();
        for (let item of p.array) {
            v = v.push(item);
        }
    }],
    ['LinkedList.append', (p:Prerequisites) => {
        let v =LinkedList.empty<number>();
        for (let item of p.array) {
            v = v.append(item);
        }
    }]);

compare(['Vector.appendAll', (p:Prerequisites) => p.vec.appendAll(p.vec)],
        ['Array.appendAll', (p:Prerequisites) => p.array.concat(p.array)],
        ['immList.appendAll', (p:Prerequisites) => p.immList.concat(p.immList)],
        ['LinkedList.appendAll', (p:Prerequisites) => p.list.appendAll(p.list)]);

compare(['Vector.prependAll', (p:Prerequisites) => p.vec.prependAll(p.vec)],
        ['Array.prependAll', (p:Prerequisites) => p.array.concat(p.array)],
        ['LinkedList.prependAll', (p:Prerequisites) => p.list.prependAll(p.list)]);

compare(['Vector.foldLeft', (p:Prerequisites) => p.vec.foldLeft(0, (acc,i)=>acc+i)],
        ['Array.foldLeft', (p:Prerequisites) => p.array.reduce((acc,i)=>acc+i)],
        ['immList.foldLeft', (p:Prerequisites) => p.immList.reduce((acc,i)=>acc+i,0)],
        ['LinkedList.foldLeft', (p:Prerequisites) => p.vec.foldLeft(0, (acc,i)=>acc+i)]);

compare(['Vector.foldRight', (p:Prerequisites) => p.vec.foldRight(0, (i,acc)=>acc+i)],
        ['immList.foldRight', (p:Prerequisites) => p.immList.reduceRight((acc,i)=>acc+i,0)],
        ['LinkedList.foldRight', (p:Prerequisites) => p.vec.foldRight(0, (i,acc)=>acc+i)]);

compare(['HashSet.ofIterable', (p:Prerequisites) => HashSet.ofIterable(p.array)],
        ['immSet', (p:Prerequisites) => imm.Set(p.array)]);

compare(['HashSet.ofIterable (from vector)', (p:Prerequisites) => HashSet.ofIterable(p.vec)],
        ['immSet (from vector)', (p:Prerequisites) => imm.Set(p.vec)]);

compare(['HashSet.contains', (p:Prerequisites) => p.hashset.contains(p.array[Math.floor(Math.random()*p.array.length)])],
        ['immSet.contains', (p:Prerequisites) => p.immSet.contains(p.array[Math.floor(Math.random()*p.array.length)])]);

compare(['HashSet.filter', (p:Prerequisites) => p.hashset.filter(x => x<p.length/2)],
        ['immSet.filter', (p:Prerequisites) => p.immSet.filter(x => x<p.length/2)]);

compare(['HashMap.ofIterable', (p:Prerequisites) =>
         HashMap.ofIterable<string,number>(p.array.map<[string,number]>(x => [x+"",x]))],
        ['immMap', (p:Prerequisites) => imm.Map(p.array.map<[string,number]>(x => [x+"",x]))]);

compare(['HashMap.ofIterable (from vector)', (p:Prerequisites) =>
         HashMap.ofIterable(p.vec.map<[string,number]>(x => [x+"",x]))],
        ['immMap (from vector)', (p:Prerequisites) =>
         imm.Map(p.vec.map<[string,number]>(x => [x+"",x]))]);

compare(['HashMap.get', (p:Prerequisites) => p.hashmap.get(p.array[Math.floor(Math.random()*p.array.length)]+"")],
        ['immMap.get', (p:Prerequisites) => p.immMap.get(p.array[Math.floor(Math.random()*p.array.length)]+"")]);

compare(['HashMap.filter', (p:Prerequisites) => p.hashmap.filter((k,v) => parseInt(k)<p.length/2)],
        ['immMap.filter', (p:Prerequisites) => p.immMap.filter((v,k) => parseInt(k)<p.length/2)]);
