const Benchmark: any = require('benchmark');

import { Vector } from "../src/Vector"

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
        .run({ 'async': true });
}

// https://stackoverflow.com/a/43044960/516188
const getArray = (length:number) => Array.from({length}, () => Math.floor(Math.random() * length));
const array = getArray(200)
const vec = Vector.ofIterable(array)
// compare(['Vector.filter', () => vec.filter(x => x%2===0)],
//         ['Array.filter', () => array.filter(x => x%2===0)]);

const vecLessValues = vec.map(x => x%10);
compare(['Vector.distinctBy', () => vecLessValues.distinctBy(x => x)],
        ['Vector.distinctBy2', () => vecLessValues.distinctBy2(x => x)]);
