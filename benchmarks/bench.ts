const Benchmark: any = require('benchmark');

import { execSync } from "child_process";
import { Vector } from "../src/Vector";
import { HashSet } from "../src/HashSet";
import { HashMap } from "../src/HashMap";
import { LinkedList } from "../src/LinkedList";

// import immutables through require for now so that
// the immutables typescript type definitions are not
// parsed: as of typescript 2.9rc and immutables 4.0.0rc9
// they don't compile.
const imm: any = require('immutable');
// import * as imm from 'immutable';

const hamt: any = require("hamt_plus");
const hamtBase: any = require("hamt");

import * as Funkia from "list";

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
    const funkiaList = Funkia.from(array);

    const idxThreeQuarters = array.length*3/4;
    const atThreeQuarters = array[idxThreeQuarters];

    const hashset = HashSet.ofIterable(array);
    const immSet = imm.Set(array);

    const hashmap = HashMap.ofIterable<string,number>(array.map<[string,number]>(x => [x+"",x]));
    const immMap = imm.Map(array.map<[string,number]>(x => [x+"",x]));

    return {vec,immList,array,list,idxThreeQuarters,
            rawhamt,rawhamtBase,hashset,immSet,length,hashmap,immMap, funkiaList};
}

interface Prerequisites {
    vec: Vector<number>;
    // immList: imm.List<number>;
    immList: any;
    array: number[];
    list:LinkedList<number>;
    idxThreeQuarters: number;
    rawhamt: any;
    rawhamtBase: any;
    hashset: HashSet<number>;
    // immSet: imm.Set<number>;
    immSet: any;
    hashmap: HashMap<string,number>;
    // immMap: imm.Map<string,number>;
    immMap: any;
    length:number;
    funkiaList: Funkia.List<number>;
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
console.log("funkiaList is the list from https://github.com/funkia/list");

process.stdout.write("node version: ");
execSync("node --version", {stdio:[0,1,2]});
console.log();

compare(['Vector.toArray', (p:Prerequisites) => p.vec.toArray()],
        ['LinkedList.toArray', (p:Prerequisites) => p.list.toArray()],
        ['immList.toArray', (p:Prerequisites) => p.immList.toArray()],
        ['funkiaList.toArray', (p:Prerequisites) => Funkia.toArray(p.funkiaList)]);

compare(['Vector.take', (p:Prerequisites) => p.vec.take(p.idxThreeQuarters)],
        ['Array.slice', (p:Prerequisites) => p.array.slice(0,p.idxThreeQuarters)],
        ['immList.take', (p:Prerequisites) => p.immList.take(p.idxThreeQuarters)],
        ['LinkedList.take', (p:Prerequisites) => p.list.take(p.idxThreeQuarters)],
        ['funkiaList.take', (p:Prerequisites) => Funkia.take(p.idxThreeQuarters, p.funkiaList)]);

compare(['Vector.drop', (p:Prerequisites) => p.vec.drop(p.idxThreeQuarters)],
        ['Array.slice', (p:Prerequisites) => p.array.slice(p.idxThreeQuarters)],
        ['immList.slice', (p:Prerequisites) => p.immList.slice(p.idxThreeQuarters)],
        ['LinkedList.drop', (p:Prerequisites) => p.list.drop(p.idxThreeQuarters)],
        ['funkiaList.drop', (p:Prerequisites) => Funkia.drop(p.idxThreeQuarters, p.funkiaList)]);

compare(['Vector.filter', (p:Prerequisites) => p.vec.filter(x => x%2===0)],
        ['Array.filter', (p:Prerequisites) => p.array.filter(x => x%2===0)],
        ['immList.filter', (p:Prerequisites) => p.immList.filter((x:number) => x%2===0)],
        ['LinkedList.filter', (p:Prerequisites) => p.list.filter(x => x%2===0)],
        ['funkiaList.filter', (p:Prerequisites) => Funkia.filter(x => x%2===0, p.funkiaList)]);

compare(['Vector.map', (p:Prerequisites) => p.vec.map(x => x*2)],
        ['Array.map', (p:Prerequisites) => p.array.map(x => x*2)],
        ['immList.map', (p:Prerequisites) => p.immList.map((x:number) => x*2)],
        ['LinkedList.map', (p:Prerequisites) => p.list.map(x => x*2)],
        ['funkiaList.map', (p:Prerequisites) => Funkia.map(x => x*2, p.funkiaList)]);

compare(['Vector.find', (p:Prerequisites) => p.vec.find(x => x===p.idxThreeQuarters)],
        ['Array.find', (p:Prerequisites) => p.array.find(x => x===p.idxThreeQuarters)],
        ['immList.find', (p:Prerequisites) => p.immList.find((x:number) => x===p.idxThreeQuarters)],
        ['LinkedList.find', (p:Prerequisites) => p.list.find(x => x===p.idxThreeQuarters)],
        ['funkiaList.find', (p:Prerequisites) => Funkia.find(x => x===p.idxThreeQuarters, p.funkiaList)]);

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
        ['immList.ofIterable', (p:Prerequisites) => imm.List(p.array)],
        ['funkiaList.ofArray', (p:Prerequisites) => Funkia.from(p.array)]);

compare(['Vector.get(i)', (p:Prerequisites) => p.vec.get(p.length/2)],
        ['rawhamt.get(i)', (p:Prerequisites) => p.rawhamt.get(p.length/2)],
        ['rawhamtBase.get(i)', (p:Prerequisites) => p.rawhamtBase.get(p.length/2)],
        ['LinkedList.get(i)', (p:Prerequisites) => p.list.get(p.length/2)],
        ['Array.get(i)', (p:Prerequisites) => p.array[p.length/2]],
        ['immList.get(i)', (p:Prerequisites) => p.immList.get(p.length/2)],
        ['funkiaList.get(i)', (p:Prerequisites) => Funkia.nth(p.length/2, p.funkiaList)]);

compare(['Vector.flatMap', (p:Prerequisites) => p.vec.flatMap(x => Vector.of(1,2))],
        ['LinkedList.flatMap', (p:Prerequisites) => p.list.flatMap(x =>LinkedList.of(1,2))],
        ['immList.flatMap', (p:Prerequisites) => p.immList.flatMap((x:number) => imm.List([1,2]))],
        ['funkiaList.chain', (p:Prerequisites) => Funkia.chain(x => Funkia.list(1,2), p.funkiaList)]);
        
compare(['Vector.reverse', (p:Prerequisites) => p.vec.reverse()],
        ['Array.reverse', (p:Prerequisites) => p.array.reverse()],
        ['immList.reverse', (p:Prerequisites) => p.immList.reverse()],
        ['LinkedList.reverse', (p:Prerequisites) => p.list.reverse()],
        ['funkiaList.reverse', (p:Prerequisites) => Funkia.reverse(p.funkiaList)]);

compare(['Vector.groupBy', (p:Prerequisites) => p.vec.groupBy(x => x%2)],
        ['LinkedList.groupBy', (p:Prerequisites) => p.list.groupBy(x => x%2)],
        ['immList.groupBy', (p:Prerequisites) => p.immList.groupBy((x:number) => x%2)]);

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
        // let v = imm.List<number>();
        let v = imm.List();
        for (let item of p.array) {
            v = v.push(item);
        }
    }],
    ['LinkedList.append', (p:Prerequisites) => {
        let v = LinkedList.empty<number>();
        for (let item of p.array) {
            v = v.append(item);
        }
    }],
    ['Funkia.append', (p:Prerequisites) => {
        let v = Funkia.empty();
        for (let item of p.array) {
            v = Funkia.append(item, v);
        }
    }]);

compare(
    ['Vector.prepend', (p:Prerequisites) => {
        let v = Vector.empty<number>();
        for (let item of p.array) {
            v = v.prepend(item);
        }
    }],
    ['Array.unshift', (p:Prerequisites) => {
        let v = [];
        for (let item of p.array) {
            v.unshift(item);
        }
    }],
    ['immList.unshift', (p:Prerequisites) => {
        // let v = imm.List<number>();
        let v = imm.List();
        for (let item of p.array) {
            v = v.unshift(item);
        }
    }],
    ['LinkedList.prepend', (p:Prerequisites) => {
        let v = LinkedList.empty<number>();
        for (let item of p.array) {
            v = v.prepend(item);
        }
    }],
    ['Funkia.prepend', (p:Prerequisites) => {
        let v = Funkia.empty();
        for (let item of p.array) {
            v = Funkia.prepend(item, v);
        }
}]);

function iterateOn<T>(coll: Iterable<T>) {
    const it = coll[Symbol.iterator]();
    let item = it.next();
    while (!item.done) {
        item = it.next();
    }
}

compare(['Vector.iterate', (p:Prerequisites) => iterateOn(p.vec)],
        ['Array.iterate', (p:Prerequisites) => iterateOn(p.array)],
        ['immList.iterate', (p:Prerequisites) => iterateOn(p.immList)],
        ['LinkedList.iterate', (p:Prerequisites) => iterateOn(p.list)],
        ['Funkia.iterate', (p:Prerequisites) => iterateOn(p.funkiaList)]);

compare(['Vector.appendAll', (p:Prerequisites) => p.vec.appendAll(p.vec)],
        ['Array.appendAll', (p:Prerequisites) => p.array.concat(p.array)],
        ['immList.appendAll', (p:Prerequisites) => p.immList.concat(p.immList)],
        ['LinkedList.appendAll', (p:Prerequisites) => p.list.appendAll(p.list)],
        ['Funkia.concat', (p:Prerequisites) => Funkia.concat(p.funkiaList, p.funkiaList)]);

compare(['Vector.prependAll', (p:Prerequisites) => p.vec.prependAll(p.vec)],
        ['Array.prependAll', (p:Prerequisites) => p.array.concat(p.array)],
        ['LinkedList.prependAll', (p:Prerequisites) => p.list.prependAll(p.list)]);

compare(['Vector.foldLeft', (p:Prerequisites) => p.vec.foldLeft(0, (acc,i)=>acc+i)],
        ['Array.foldLeft', (p:Prerequisites) => p.array.reduce((acc,i)=>acc+i)],
        ['immList.foldLeft', (p:Prerequisites) => p.immList.reduce((acc:number,i:number)=>acc+i,0)],
        ['LinkedList.foldLeft', (p:Prerequisites) => p.vec.foldLeft(0, (acc,i)=>acc+i)],
        ['Funkia.foldl', (p:Prerequisites) => Funkia.foldl((i,acc)=>acc+i, 0, p.funkiaList)]);

compare(['Vector.foldRight', (p:Prerequisites) => p.vec.foldRight(0, (i,acc)=>acc+i)],
        ['immList.foldRight', (p:Prerequisites) => p.immList.reduceRight((acc:number,i:number)=>acc+i,0)],
        ['LinkedList.foldRight', (p:Prerequisites) => p.vec.foldRight(0, (i,acc)=>acc+i)],
        ['Funkia.foldr', (p:Prerequisites) => Funkia.foldr((i,acc)=>acc+i, 0, p.funkiaList)]);

compare(['HashSet.ofIterable', (p:Prerequisites) => HashSet.ofIterable(p.array)],
        ['immSet', (p:Prerequisites) => imm.Set(p.array)]);

compare(['HashSet.ofIterable (from vector)', (p:Prerequisites) => HashSet.ofIterable(p.vec)],
        ['immSet (from vector)', (p:Prerequisites) => imm.Set(p.vec)]);

compare(['HashSet.contains', (p:Prerequisites) => p.hashset.contains(p.array[Math.floor(Math.random()*p.array.length)])],
        ['immSet.contains', (p:Prerequisites) => p.immSet.contains(p.array[Math.floor(Math.random()*p.array.length)])]);

compare(['HashSet.filter', (p:Prerequisites) => p.hashset.filter(x => x<p.length/2)],
        ['immSet.filter', (p:Prerequisites) => p.immSet.filter((x:number) => x<p.length/2)]);

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
        ['immMap.filter', (p:Prerequisites) => p.immMap.filter((v:number,k:string) => parseInt(k)<p.length/2)]);
