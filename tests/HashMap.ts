import { HashMap } from "../src/HashMap";
import { HashSet } from "../src/HashSet";
import { Vector } from "../src/Vector";
import { LinkedList } from "../src/LinkedList";
import { Option } from "../src/Option";
import { Stream } from "../src/Stream";
import { Tuple2 } from "../src/Tuple2";
import { fieldsHashCode } from "../src/Comparison";
import { MyClass} from "./SampleData";
import { assertFailCompile } from "./TestHelpers";
import * as assert from 'assert'

type MyEnum = "a" | "b" | "c";

describe("hashmap construction basic sanity tests", () => {
    it("should overwrite values with the same key", () => assert.ok(
        HashMap.empty<number,string>().put(5, "test").put(5, "test1")
            .equals(HashMap.empty<number,string>().put(5, "test1"))));
    it("should overwrite values with the same key with custom types", () => assert.ok(
        HashMap.empty<MyClass,string>()
            .put(new MyClass("a", 1), "test")
            .put(new MyClass("a", 1), "test1")
            .put(new MyClass("a", 2), "test1").equals(
                HashMap.empty<MyClass,string>()
                    .put(new MyClass("a", 1), "test1")
                    .put(new MyClass("a", 2), "test1"))));

    it("should overwrite values with the same key with custom types when created with of()", () => assert.ok(
        HashMap.empty<MyClass,string>()
            .put(new MyClass("a", 1), "test")
            .put(new MyClass("a", 1), "test1")
            .put(new MyClass("a", 2), "test1").equals(
                HashMap.of<MyClass,string>([new MyClass("a", 1), "test1"])
                    .put(new MyClass("a", 2), "test1"))));

    it("should overwrite values with the same key with custom types when created with ofIterable()", () => assert.ok(
        HashMap.ofIterable<MyClass,string>(<[MyClass,string][]>[
            [new MyClass("a", 1), "test"],
            [new MyClass("a", 2), "test1"]])
            .put(new MyClass("a", 1), "test1")
            .equals(
                HashMap.of<MyClass,string>([new MyClass("a", 1), "test1"])
                    .put(new MyClass("a", 2), "test1"))));

    it("should support map as a key itself", () => assert.ok(
        HashMap.empty<HashMap<string,number>, number>()
            .put(HashMap.empty<string,number>().put("hello", 1), 6)
            .put(HashMap.empty<string,number>().put("hello", 1), 7)
            .put(HashMap.empty<string,number>().put("bye", 1), 7)
            .equals(
                HashMap.empty<HashMap<string,number>, number>()
                    .put(HashMap.empty<string,number>().put("hello", 1), 7)
                    .put(HashMap.empty<string,number>().put("bye", 1), 7))));

    it("should build with of", () => assert.ok(
        HashMap.empty<number,string>().put(1,"a").put(2,"b").equals(
            HashMap.of([1,"a"],[2,"b"]))));
    it("should build with ofIterable", () => assert.ok(
        HashMap.empty<number,string>().put(1,"a").put(2,"b").equals(
            HashMap.ofIterable(Vector.of<[number,string]>([1,"a"],[2,"b"])))));
    it("should put with merge", () => assert.ok(
        HashMap.empty<number,string>()
            .put(5,"test").putWithMerge(5,"a",(a,b)=>a+b)
            .equals(HashMap.empty<number,string>().put(5, "testa"))));
    it("should mergeWith", () => assert.ok(
        HashMap.empty<number,string>().put(1,"a").put(2,"bc").put(3,"d")
            .equals(HashMap.empty<number,string>().put(1,"a").put(2,"b")
                    .mergeWith(HashMap.empty<number,string>().put(2,"c").put(3,"d"), (v1,v2)=>v1+v2))));
    it("should remove keys", () => assert.ok(
        HashMap.of<number,string>([2,"b"]).equals(
            HashMap.of<number,string>([1,"a"],[2,"b"]).remove(1))));
    it("should allow to remove an inexisting key", () => assert.ok(
        HashMap.of<number,string>([1,"a"],[2,"b"]).equals(
            HashMap.of<number,string>([1,"a"],[2,"b"]).remove(3))));
    it("should allow to remove from the empty map", () => assert.ok(
        HashMap.empty<number,string>().equals(
            HashMap.of<number,string>().remove(1))));
    it("should build from a string object dictionary", () => assert.ok(
        HashMap.of<string,number>(["a",1],["b",2]).equals(
            HashMap.ofObjectDictionary<number>({a:1,b:2}))));
    it("should build from an int object dictionary", () => assert.ok(
        HashMap.of<string,string>(["1","a"],["2","b"]).equals(
            HashMap.ofObjectDictionary<string>({1:"a",2:"b"}))));
    it("should strip dictionary values with undefined", () => assert.ok(
        HashMap.of<string,string>(["1","a"]).equals(
            HashMap.ofObjectDictionary<string>({1:"a",2:undefined}))));
    it("should build from an enum object dictionary", () => {
        const s: {[TKey in MyEnum]:number} = {"a":1,"b":2,"c":3};
        const got = HashMap.ofObjectDictionary<number>(s);
        assert.ok(HashMap.of<string,number>(["a",1],["b",2],["c",3]).equals(got));
    });
    it("should build from a partial enum object dictionary", () => {
        const s: {[TKey in MyEnum]?:number} = {"a":1};
        const got = HashMap.ofObjectDictionary<number>(s);
        assert.ok(HashMap.of<string,number>(["a",1]).equals(got));
    });
    it("should fail at runtime on key without equality", () => assert.throws(() =>
        HashMap.empty<any,string>().put({field1:'test', field2:-1}, "value1")));
});

describe("hashmap equality", () => {
    it("empty should be equal with empty", () =>
       assert.ok(HashMap.empty<number,string>().equals(HashMap.empty<number,string>())));
    it("non empty should be not be equal with empty", () =>
       assert.ok(!HashMap.empty<number,string>().put(1,"t").equals(HashMap.empty<number,string>())));
    it("empty should be not be equal with non empty", () =>
       assert.ok(!HashMap.empty<number,string>().equals(HashMap.empty<number,string>().put(1,"t"))));
    it("doesn't throw when given another type on equals", () => assert.equal(
        false, HashMap.empty().put(1,2).equals(<any>[1,2])));
    it("doesn't throw when given null on equals", () => assert.equal(
        false, HashMap.empty().put(1,2).equals(<any>null)));
    it("empty doesn't throw when given another type on equals", () => assert.equal(
        false, HashMap.empty().equals(<any>[1,2])));
    it("empty doesn't throw when given null on equals", () => assert.equal(
        false, HashMap.empty().equals(<any>null)));
    it("should refuse keys which don't offer true equality (neither equals nor hashcode)", () => assert.throws(
        () => HashMap.of([<any>{name:""}, 1])));
    it("should refuse keys which don't offer true equality (no hashcode)", () => assert.throws(
        () => HashMap.of([<any>{name:"",equals:(x:any,y:any)=>true},1])));
    it("should refuse keys which don't offer true equality (no equals)", () => assert.throws(
        () => HashMap.of([<any>{name:"",hashCode:()=>1},1])));
    it("should refuse keys which don't offer true equality", () => assert.throws(
        () => HashMap.of([Vector.of([1]),"value"])));
    it("should refuse keys which don't offer true equality (vector)", () => assert.throws(
        () => HashMap.empty().put(Vector.of(Vector.of([1])),"value")));
    it("should refuse keys which don't offer true equality (stream)", () => assert.throws(
        () => HashMap.of([Stream.of([1]), "value"])));
    it("should refuse keys which don't offer true equality (option)", () => assert.throws(
        () => HashMap.of([Option.of([1]), "value"])));
    it("should refuse keys which don't offer true equality (tuple2)", () => assert.throws(
        () => HashMap.of([Tuple2.of(1,Vector.of([1])), "value"])));
    it("should refuse keys which don't offer true equality (hashmap)", () => assert.throws(
        () => HashMap.of([HashMap.of(["a",[1]]), "value"])));
    it("should fail compilation on an obviously bad key type", () =>
       assertFailCompile(
           "HashMap.of([[1], 'test'])", "Argument of type \'[number[], string]\' is not assignable to parameter"));
})

describe("hashmap - toString should be nicely formatted", () => {
    it("should format strings and numbers", () => assert.equal(
       "{key1: 6, key2: 7}",
         ""+HashMap.empty<string,number>().put("key1", 6).put("key2", 7)));
    it("should format custom classes", () => assert.equal(
       "{key1: {field1: test, field2: -1}}",
         ""+HashMap.empty<string,MyClass>().put("key1", new MyClass('test', -1))));
   it("should format cust class keys as well", () => assert.equal(
        "{{\"field1\":\"test\",\"field2\":-1}: 'value1'}",
        ""+HashMap.empty<any,string>().put({
            field1:'test',
            field2:-1,
            equals(this:any, b:any) { return this.field1===b.field1 && this.field2===b.field2 },
            hashCode(this:any) { return fieldsHashCode(this.field1, this.field2);}
        }, "value1")));
});

describe("hashmap extract values", () => {
    it("should retrieve values", () => assert.ok(
        HashMap.empty<string,number>().put("key1", 6).get("key1").contains(6)));
    it("should not find missing values", () => assert.ok(
        HashMap.empty<string,number>().put("key1", 6).get("key2").isNone()));
    it("should retrieve nulls", () => assert.ok(
        HashMap.empty<string,number|null>().put("key1", null).get("key1").contains(null)));
    it("should get empty keySet", () => assert.ok(
        HashSet.empty<string>().equals(HashMap.empty<string,string>().keySet())));
    it("should get non-empty keySet", () => assert.ok(
        HashSet.of("a","c").equals(HashMap.empty<string,string>().put("a","b").put("c","d").keySet())));
    it("should get empty valueIterable", () => assert.ok(
        HashSet.empty<string>().equals(HashSet.ofIterable(HashMap.empty<string,string>().valueIterable()))));
    it("should get non-empty valueIterable", () => assert.ok(
        HashSet.of("b","d").equals(HashSet.ofIterable(HashMap.empty<string,string>().put("a","b").put("c","d").valueIterable()))));
    it("supports iterator", () => {
        let total = 0;
        let letters = [];
        const iterator = HashMap.empty<string,number>()
            .put("a",1).put("b",6).put("c",3)[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            letters.push(curItem.value[0]);
            total += curItem.value[1];
            curItem = iterator.next();
        }
        assert.equal(10, total);
        letters.sort();
        assert.deepEqual(["a","b","c"], letters);
    });
    it("supports empty iterator", () => {
        let total = 0;
        let letters = [];
        const iterator = HashMap.empty<string,number>()[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            letters.push(curItem.value[0]);
            total += curItem.value[1];
            curItem = iterator.next();
        }
        assert.equal(0, total);
        assert.deepEqual([], letters);
    });
    it("correct returns single positive case", () => assert.deepEqual(
        [5,"a"], HashMap.of([5,"a"]).single().getOrThrow()));
    it("correct returns single negative case", () => assert.ok(
        HashMap.of([5,"a"],[6,"b"]).single().isNone()));
    it("correct returns single empty map", () => assert.ok(
        HashMap.empty<number,string>().single().isNone()));
});

describe("hashmap transformation", () => {
    it("should transform through map", () => assert.ok(
        HashMap.empty<number,string>().put(12,"key1").put(6,"key2").equals(
        HashMap.empty<string,number>().put("key1",6).put("key2", 3).map((k,v) => [v*2,k]))));
    it("should transform through empty map", () => assert.ok(
        HashMap.empty<number,string>().equals(
        HashMap.empty<string,number>().map((k,v) => [v*2,k]))));
    it("flatMap works", () => assert.deepEqual(
        [["a",1],["b",2],["c",3],["aa",5],["bb",6],["cc",7]],
            HashMap.of<string,number>(["a",1],["b",2],["c",3])
                .flatMap((k,v)=>HashMap.of<string,number>([k+k,v+4],[k,v])).toVector().sortOn(x=>x[1]).toArray()));
    it("should transform through mapValues", () => assert.ok(
        HashMap.empty<string,number>().put("key1",12).put("key2",6).equals(
        HashMap.empty<string,number>().put("key1",6).put("key2", 3).mapValues(v => v*2))));
    it("should transform through empty mapValues", () => assert.ok(
        HashMap.empty<string,number>().equals(
        HashMap.empty<string,number>().mapValues(v => v*2))));
    it("should transform non-empty to vector", () => assert.deepEqual(
        [["a",1], ["b",2]],
        HashMap.empty<string,number>().put("a",1).put("b",2).toVector().toArray()));
    it("should transform empty to vector", () => assert.deepEqual(
        [],
        HashMap.empty<string,number>().toVector().toArray()));
    it("should transform non-empty to array", () => assert.deepEqual(
        [["a",1], ["b",2]],
        HashMap.empty<string,number>().put("a",1).put("b",2).toArray()));
    it("should transform empty to array", () => assert.deepEqual(
        [],
        HashMap.empty<string,number>().toArray()));
    it("should transform non-empty to ObjectDictionary", () => assert.deepEqual(
        {"a":1, "b":2},
        HashMap.empty<string,number>().put("a",1).put("b",2).toObjectDictionary(x=>x)));
    it("should transform empty to ObjectDictionary", () => assert.deepEqual(
        {},
        HashMap.empty<string,number>().toObjectDictionary(x=>x)));
    it("should filter properly", () => assert.deepEqual(
        [[1,"a"],[3,"c"]], HashMap.empty<number,string>()
            .put(1,"a").put(2,"b").put(3,"c").put(4,"d").filter((k,v) => k%2!=0).toArray()));
    it("should filter empty properly", () => assert.deepEqual(
        [], HashMap.empty().toArray()));
    it("keeps the custom equality even after filter", () => assert.ok(
        HashMap.empty<MyClass,string>()
            .put(new MyClass("a", 1), "test")
            .put(new MyClass("a", 2), "test1").equals(
                HashMap.of<MyClass,string>([new MyClass("a", 1), "test1"])
                    .filter(x => true)
                    .put(new MyClass("a", 1), "test")
                    .put(new MyClass("a", 2), "test1"))));
    it("should support allMatch, positive case", () => assert.ok(
        HashMap.empty<number,string>().put(1,"a").put(2,"b").allMatch((k,v) => k > 0)));
    it("should support allMatch, negative case", () => assert.ok(
        !HashMap.empty<number,string>().put(1,"a").put(2,"b").allMatch((k,v) => k < 0)));
    it("should support allMatch, empty map", () => assert.ok(
        HashMap.empty<number,string>().allMatch((k,v) => k > 0)));
    it("should support anyMatch, positive case", () => assert.ok(
        HashMap.empty<number,string>().put(1,"a").put(-1,"b").anyMatch((k,v) => k > 0)));
    it("should support anyMatch, negative case", () => assert.ok(
        !HashMap.empty<number,string>().put(1,"a").put(2,"b").anyMatch((k,v) => k < 0)));
    it("should support anyMatch, empty map", () => assert.ok(
        !HashMap.empty<number,string>().anyMatch((k,v) => k > 0)));
    it("should support contains, positive case", () => assert.ok(
        HashMap.empty<number,string>().put(1,"a").put(2,"b").contains([2,"b"])));
    it("should support contains, negative case", () => assert.ok(
        !HashMap.empty<number,string>().put(1,"a").put(2,"b").contains([2,"c"])));
    it("should support contains, empty map", () => assert.ok(
        !HashMap.empty<number,string>().contains([2,"b"])));
    it("should fold correctly", () => assert.deepEqual(
        [6,"c"], HashMap.of<number,string>([1,"a"],[2,"b"],[3,"c"])
            .fold([0,""], ([a,b],[c,d])=>[a+c, b>d?b:d])));
    it("should foldLeft correctly", () => assert.equal(
        6, HashMap.of([1,"a"], [2,"bb"], [3,"ccc"])
            .foldLeft(0, (soFar,[item,val])=>soFar+val.length)));
    it("should foldRight correctly", () => assert.equal(
        6, HashMap.of([1,"a"], [2,"bb"], [3,"ccc"])
            .foldRight(0, ([item,value],soFar)=>soFar+value.length)));
    it("should convert to linked list correctly", () => assert.ok(
        LinkedList.of(Tuple2.of("a",5),Tuple2.of("b",6)).equals(
            HashMap.of<string,number>(["a",5],["b",6]).toLinkedList().map(Tuple2.ofPair))));
    it("reduce works", () => assert.deepEqual(
        [3,"c"], HashMap.of<number,string>([1,"a"],[2,"b"],[3,"c"])
            .reduce((kv1,kv2)=>kv1[0]>kv2[0]?kv1:kv2).getOrThrow()));
    it("reduce works on an empty collection", () => assert.ok(
        HashMap.empty<number,string>().reduce((kv1,kv2)=>kv1[0]>kv2[0]?kv1:kv2).isNone()));
});
