import { inspect } from './Value';
import { Option } from "./Option";
import { HashMap } from "./HashMap";
import { HashSet } from "./HashSet";
import { Stream } from "./Stream";
import { Seq, IterableArray } from "./Seq";
import { WithEquality, areEqual, getHashCode,
         Ordering, ToOrderable } from "./Comparison";
import * as SeqHelpers from "./SeqHelpers";
import * as L from "list";

/**
 * A general-purpose list class with all-around good performance.
 * quasi-O(1) (actually O(log32(n))) access, append, replace.
 * It's backed by a bit-mapped vector trie.
 * @param T the item type
 */
export class Vector<T> implements Seq<T> {

    /**
     * @hidden
     */
    // _contents will be undefined only if length===0
    protected constructor(private _list: L.List<T>) {}

    /**
     * The empty vector.
     * @param T the item type
     */
    static empty<T>(): Vector<T> {
        return new Vector(L.empty());
    }

    /**
     * Build a vector from a series of items (any number, as parameters)
     * @param T the item type
     */
    static of<T>(...data: T[]): Vector<T> {
        return Vector.ofIterable(data);
    }

    /**
     * Build a vector from any iterable, which means also
     * an array for instance.
     * @param T the item type
     */
    static ofIterable<T>(elts: Iterable<T>): Vector<T> {
        return new Vector(L.from(elts));
    }

    /**
     * Curried predicate to find out whether the vector is empty.
     *
     *     LinkedList.of(Vector.of(1), Vector.empty<number>())
     *         .filter(Vector.isEmpty)
     *     => LinkedList.of(Vector.empty<number>())
     */
    static isEmpty<T>(v: Vector<T>): boolean {
        return v.isEmpty();
    }

    /**
     * Curried predicate to find out whether the vector is empty.
     *
     *     LinkedList.of(Vector.of(1), Vector.empty<number>())
     *         .filter(Vector.isNotEmpty)
     *     => LinkedList.of(Vector.of(1))
     */
    static isNotEmpty<T>(v: Vector<T>): boolean {
        return !v.isEmpty();
    }

    /**
     * Get the length of the collection.
     */
    length(): number {
        return L.length(this._list);
    }

    /**
     * true if the collection is empty, false otherwise.
     */
    isEmpty(): boolean {
        return L.length(this._list) === 0;
    }

    /**
     * Dual to the foldRight function. Build a collection from a seed.
     * Takes a starting element and a function.
     * It applies the function on the starting element; if the
     * function returns None, it stops building the list, if it
     * returns Some of a pair, it adds the first element to the result
     * and takes the second element as a seed to keep going.
     *
     *     Vector.unfoldRight(
     *          10, x=>Option.of(x)
     *              .filter(x => x!==0)
     *              .map<[number,number]>(x => [x,x-1]))
     *     => Vector.of(10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
     */
    static unfoldRight<T,U>(seed: T, fn: (x:T)=>Option<[U,T]>): Vector<U> {
        let nextVal = fn(seed);
        let r = L.empty();
        while (nextVal.isSome()) {
            r = L.append(nextVal.get()[0], r);
            nextVal = fn(nextVal.get()[1]);
        }
        return new Vector(r);
    }

    /**
     * Retrieve the element at index idx.
     * Returns an option because the collection may
     * contain less elements than the index.
     */
    get(index: number): Option<T> {
        return Option.of(L.nth(index, this._list));
    }

    /**
     * If the collection contains a single element,
     * return Some of its value, otherwise return None.
     */
    single(): Option<T> {
        return L.length(this._list) === 1 ?
            this.head() :
            Option.none<T>();
    }

    /**
     * Replace the value of element at the index you give.
     * Will throw if the index is out of bounds!
     */
    replace(index: number, val: T): Vector<T> {
        if (index >= this.length() || index < 0) {
            throw new Error('Vector.replace: index is out of range: ' + index);
        }
        return new Vector(L.update(index, val, this._list));
    }

    /**
     * Append an element at the end of the collection.
     */
    append(val:T): Vector<T> {
        return new Vector(L.append(val, this._list));
    }

    /**
     * Append multiple elements at the end of the collection.
     * Note that arrays are also iterables.
     */
    appendAll(elts: Iterable<T>): Vector<T> {
        if ((<any>elts)._list && (<any>elts).replace) {
            // elts is a vector too
            return new Vector(L.concat(this._list, (<Vector<T>>elts)._list));
        }
        return new Vector(L.concat(this._list, L.from(elts)));
    }

    /**
     * Remove multiple elements from a vector
     *
     *     Vector.of(1,2,3,4,3,2,1).removeAll([2,4])
     *     => Vector.of(1,3,3,1)
     */
    removeAll(elts:Iterable<T&WithEquality>): Vector<T> {
        return <Vector<T>><any>SeqHelpers.removeAll(this, elts);
    }

    /**
     * Get the first value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    head(): Option<T> {
        return this.get(0);
    }

    /**
     * Get the last value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    last(): Option<T> {
        return Option.of(L.last(this._list));
    }

    /**
     * Return a new vector containing all the elements in this
     * vector except the last one, or the empty vector if this
     * is the empty vector.
     *
     *     Vector.of(1,2,3).init()
     *     => Vector.of(1,2)
     */
    init(): Vector<T> {
        return new Vector(L.pop(this._list));
    }

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    dropWhile(predicate:(x:T)=>boolean): Vector<T> {
        return new Vector(L.dropWhile(predicate, this._list));
    }

    /**
     * Search for an item matching the predicate you pass,
     * return Option.Some of that element if found,
     * Option.None otherwise.
     */
    find(predicate:(v:T)=>boolean): Option<T> {
        return Option.of(L.find(predicate, this._list));
    }

    /**
     * Returns true if the predicate returns true for all the
     * elements in the collection.
     */
    allMatch(predicate:(v:T)=>boolean): boolean {
        return L.every(predicate, this._list);
    }

    /**
     * Returns true if there the predicate returns true for any
     * element in the collection.
     */
    anyMatch(predicate:(v:T)=>boolean): boolean {
        return L.some(predicate, this._list);
    }

    /**
     * Returns a pair of two collections; the first one
     * will only contain the items from this collection for
     * which the predicate you give returns true, the second
     * will only contain the items from this collection where
     * the predicate returns false.
     *
     *     Vector.of(1,2,3,4).partition(x => x%2===0)
     *     => [Vector.of(2,4),Vector.of(1,3)]
     */
    partition<U extends T>(predicate:(v:T)=>v is U): [Vector<U>,Vector<Exclude<T,U>>];
    partition(predicate:(x:T)=>boolean): [Vector<T>,Vector<T>];
    partition(predicate:(v:T)=>boolean): [Vector<T>,Vector<T>] {
        return <[Vector<T>,Vector<T>]>L.partition(predicate, this._list)
            .map(x => new Vector(x));
    }

    /**
     * Returns true if the item is in the collection,
     * false otherwise.
     */
    contains(v:T&WithEquality): boolean {
        return this.find(x => areEqual(x,v)).isSome();
    }

    /**
     * Group elements in the collection using a classifier function.
     * Elements are then organized in a map. The key is the value of
     * the classifier, and in value we get the list of elements
     * matching that value.
     *
     * also see [[Vector.arrangeBy]]
     */
    groupBy<C>(classifier: (v:T)=>C & WithEquality): HashMap<C,Vector<T>> {
        return this.foldLeft(
            HashMap.empty<C,Vector<T>>(),
            (acc: HashMap<C,Vector<T>>, v:T) =>
                acc.putWithMerge(
                    classifier(v), Vector.of(v), // !!! DOUBLE CHECK THIS
                    (v1:Vector<T>,v2:Vector<T>) => v1.append(<T>L.nth(0, v2._list))));
    }

    /**
     * Matches each element with a unique key that you extract from it.
     * If the same key is present twice, the function will return None.
     *
     * also see [[Vector.groupBy]]
     */
    arrangeBy<K>(getKey: (v:T)=>K&WithEquality): Option<HashMap<K,T>> {
        return SeqHelpers.arrangeBy<T,K>(this, getKey);
    }

    /**
     * Remove duplicate items; elements are mapped to keys, those
     * get compared.
     *
     *     Vector.of(1,1,2,3,2,3,1).distinctBy(x => x);
     *     => Vector.of(1,2,3)
     */
    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): Vector<T> {
        return <Vector<T>>SeqHelpers.distinctBy(this, keyExtractor);
    }

    [Symbol.iterator](): Iterator<T> {
        return this._list[Symbol.iterator]();
    }

    /**
     * Call a function for element in the collection.
     */
    forEach(fun:(x:T)=>void):Vector<T> {
        L.forEach(fun, this._list);
        return this;
    }

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     */
    map<U>(fun:(x:T)=>U): Vector<U> {
        return new Vector(L.map(fun, this._list));
    }

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    filter<U extends T>(fun:(v:T)=>v is U): Vector<U>;
    filter(fun:(v:T)=>boolean): Vector<T>;
    filter(fun:(v:T)=>boolean): Vector<T> {
        return new Vector(L.filter(fun, this._list));
    }

    /**
     * Apply the mapper function on every element of this collection.
     * The mapper function returns an Option; if the Option is a Some,
     * the value it contains is added to the result Collection, if it's
     * a None, the value is discarded.
     *
     *     Vector.of(1,2,6).mapOption(x => x%2===0 ?
     *         Option.of(x+1) : Option.none<number>())
     *     => Vector.of(3, 7)
     */
    mapOption<U>(mapper:(v:T)=>Option<U>): Vector<U> {
        let vec = L.empty();
        for (let i = 0; i < this.length(); i++) {
            const v = mapper(<T>L.nth(i, this._list));
            if (v.isSome()) {
                vec = L.append(v.get(), vec);
            }
        }
        return new Vector(vec);
    }

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     */
    flatMap<U>(mapper:(v:T)=>Vector<U>): Vector<U> {
        return new Vector(L.chain(x => mapper(x)._list, this._list));
    }

    /**
     * Reduces the collection to a single value using the
     * associative binary function you give. Since the function
     * is associative, order of application doesn't matter.
     *
     * Example:
     *
     *     Vector.of(1,2,3).fold(0, (a,b) => a + b);
     *     => 6
     */
    fold(zero:T, fn:(v1:T,v2:T)=>T): T {
        return this.foldLeft(zero, fn);
    }

    /**
     * Reduces the collection to a single value.
     * Left-associative.
     *
     * Example:
     *
     *     Vector.of("a", "b", "c").foldLeft("!", (xs,x) => x+xs);
     *     => "cba!"
     *
     * @param zero The initial value
     * @param fn A function taking the previous value and
     *           the current collection item, and returning
     *           an updated value.
     */
    foldLeft<U>(zero:U, fn:(soFar:U,cur:T)=>U):U {
        return L.foldl(fn, zero, this._list);
    }

    /**
     * Reduces the collection to a single value.
     * Right-associative.
     *
     * Example:
     *
     *     Vector.of("a", "b", "c").foldRight("!", (x,xs) => xs+x);
     *     => "!cba"
     *
     * @param zero The initial value
     * @param fn A function taking the current collection item and
     *           the previous value , and returning
     *           an updated value.
     */
    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        return L.foldr(fn, zero, this._list);
    }

    // indexOf(element:T, fromIndex:number): number {
    // }

    /**
     * Randomly reorder the elements of the collection.
     */
    shuffle(): Vector<T> {
        return Vector.ofIterable(SeqHelpers.shuffle(this.toArray()));
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:Vector<T>)=>U): U {
        return converter(this);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other:Vector<T&WithEquality>): boolean {
        if (<any>other === this) {
            return true;
        }
        if (!other || (!other._list) || (!L.isList(other._list))) {
            return false;
        }
        if (this.length() !== other.length()) return false;
        for (let i = 0; i < this.length(); i++) {
            const myVal: T & WithEquality|null|undefined = <T&WithEquality>L.nth(i, this._list);
            const hisVal: T & WithEquality|null|undefined = L.nth(i, other._list);
            if ((myVal === undefined) !== (hisVal === undefined)) {
                return false;
            }
            if (myVal === undefined || hisVal === undefined) {
                // they are both undefined, the || is for TS's flow analysis
                // so he realizes none of them is undefined after this.
                continue;
            }
            if (!areEqual(myVal, hisVal)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    hashCode(): number {
        let hash = 1;
        for (let i=0;i<this.length();i++) {
            hash = 31 * hash + getHashCode(L.nth(i, this._list));
        }
        return hash;
    }

    /**
     * Get a human-friendly string representation of that value.
     *
     * Also see [[Vector.mkString]]
     */
    toString(): string {
        let r = "Vector(";
        for (let i=0;i<this.length();i++) {
            if (i>0) {
                r += ", ";
            }
            r += SeqHelpers.toStringHelper(L.nth(i, this._list));
        }
        return r + ")";
    }

    /**
     * Used by the node REPL to display values.
     * Most of the time should be the same as toString()
     */
    [inspect](): string {
        return this.toString();
    }

    /**
     * Joins elements of the collection by a separator.
     * Example:
     *
     *     Vector.of(1,2,3).mkString(", ")
     *     => "1, 2, 3"
     */
    mkString(separator: string): string {
        let r = "";
        for (let i=0;i<this.length();i++) {
            if (i>0) {
                r += separator;
            }
            r += SeqHelpers.toStringHelper(<T>L.nth(i, this._list), {quoteStrings:false});
        }
        return r;
    }

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     *
     * also see [[Vector.sortOn]]
     */
    sortBy(compare: (v1:T,v2:T)=>Ordering): Vector<T> {
        return Vector.ofIterable<T>(this.toArray().sort(compare));
    }

    /**
     * Give a function associating a number or a string with
     * elements from the collection, and the elements
     * are sorted according to that value.
     *
     *     Vector.of({a:3,b:"b"},{a:1,b:"test"},{a:2,b:"a"}).sortOn(elt=>elt.a)
     *     => Vector.of({a:1,b:"test"},{a:2,b:"a"},{a:3,b:"b"})
     *
     * You can also sort by multiple criteria, and request 'descending'
     * sorting:
     *
     *     Vector.of({a:1,b:"b"},{a:1,b:"test"},{a:2,b:"a"}).sortOn(elt=>elt.a,{desc:elt=>elt.b})
     *     => Vector.of({a:1,b:"test"},{a:1,b:"b"},{a:2,b:"a"})
     *
     * also see [[Vector.sortBy]]
     */
    sortOn(...getKeys: Array<ToOrderable<T>|{desc:ToOrderable<T>}>): Vector<T> {
        return <Vector<T>>SeqHelpers.sortOn<T>(this, getKeys);
    }

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     *
     *     Vector.of(1,2,3).toMap(x=>[x.toString(), x])
     *     => HashMap.of(["1",1], ["2",2], ["3",3])
     */
    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V]): HashMap<K,V> {
        return this.foldLeft(HashMap.empty<K,V>(), (acc,cur) => {
            const converted = converter(cur);
            return acc.put(converted[0], converted[1]);
        });
    }

    /**
     * Convert this collection to a set. Since the elements of the
     * Seq may not support equality, you must pass a function returning
     * a value supporting equality.
     *
     *     Vector.of(1,2,3,3,4).toSet(x=>x)
     *     => HashSet.of(1,2,3,4)
     */
    toSet<K>(converter:(x:T)=>K&WithEquality): HashSet<K> {
        return this.foldLeft(HashSet.empty<K>(), (acc,cur) => {
            return acc.add(converter(cur));
        });
    }

    /**
     * Convert to array.
     */
    toArray(): T[] {
        return L.toArray(this._list);
    };

    /**
     * @hidden
     */
    hasTrueEquality(): boolean {
        return SeqHelpers.seqHasTrueEquality<T>(this);
    }

    /**
     * Combine any number of iterables you give in as
     * parameters to produce a new collection which combines all,
     * in tuples. For instance:
     *
     *     Vector.zip(Vector.of(1,2,3), ["a","b","c"], LinkedList.of(8,9,10))
     *     => Vector.of([1,"a",8], [2,"b",9], [3,"c",10])
     *
     * The result collection will have the length of the shorter
     * of the input iterables. Extra elements will be discarded.
     *
     * Also see [the non-static version](#zip), which only combines two
     * collections.
     * @param A A is the type of the tuple that'll be generated
     *          (`[number,string,number]` for the code sample)
     */
    static zip<A extends any[]>(...iterables: IterableArray<A>): Vector<A> {
        let r = <L.List<A>>L.empty();
        const iterators = iterables.map(i => i[Symbol.iterator]());
        let items = iterators.map(i => i.next());

        while (!items.some(item => item.done)) {
            r = L.append<A>(<any>items.map(item => item.value), r);
            items = iterators.map(i => i.next());
        }
        return new Vector(r);
    }

    /**
     * Combine this collection with the collection you give in
     * parameter to produce a new collection which combines both,
     * in pairs. For instance:
     *
     *     Vector.of(1,2,3).zip(["a","b","c"])
     *     => Vector.of([1,"a"], [2,"b"], [3,"c"])
     *
     * The result collection will have the length of the shorter
     * of both collections. Extra elements will be discarded.
     *
     * Also see [[Vector.zip]] (static version which can more than two
     * iterables)
     */
    zip<U>(other: Iterable<U>): Vector<[T,U]> {
        let r = <L.List<[T,U]>>L.empty();
        const thisIterator = this[Symbol.iterator]();
        const otherIterator = other[Symbol.iterator]();
        let thisCurItem = thisIterator.next();
        let otherCurItem = otherIterator.next();

        while (!thisCurItem.done && !otherCurItem.done) {
            r = L.append<[T,U]>([thisCurItem.value, otherCurItem.value], r);
            thisCurItem = thisIterator.next();
            otherCurItem = otherIterator.next();
        }
        return new Vector(r);
    }

    /**
     * Reverse the collection. For instance:
     *
     *     Vector.of(1,2,3).reverse();
     *     => Vector.of(3,2,1)
     */
    reverse(): Vector<T> {
        return new Vector(L.reverse(this._list));
    }

    /**
     * Combine this collection with the index of the elements
     * in it. Handy if you need the index when you map on
     * the collection for instance:
     *
     *     Vector.of("a","b").zipWithIndex().map(([v,idx]) => v+idx)
     *     => Vector.of("a0", "b1")
     */
    zipWithIndex(): Vector<[T,number]> {
        return <Vector<[T,number]>>SeqHelpers.zipWithIndex<T>(this);
    }

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate.
     */
    takeWhile(predicate:(x:T)=>boolean): Vector<T> {
        return new Vector(L.takeWhile(predicate, this._list));
    }

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate,
     * but starting from the end of the collection.
     *
     *     Vector.of(1,2,3,4).takeRightWhile(x => x > 2)
     *     => Vector.of(3,4)
     */
    takeRightWhile(predicate:(x:T)=>boolean): Vector<T> {
        return new Vector(L.takeLastWhile(predicate, this._list));
    }

    /**
     * Split the collection at a specific index.
     *
     *     Vector.of(1,2,3,4,5).splitAt(3)
     *     => [Vector.of(1,2,3), Vector.of(4,5)]
     */
    splitAt(index:number): [Vector<T>,Vector<T>] {
        if (index < 0) {
            return [Vector.empty<T>(), this];
        }
        return <[Vector<T>,Vector<T>]>L.splitAt(index, this._list).map(x => new Vector(x));
    }

    /**
     * Takes a predicate; returns a pair of collections.
     * The first one is the longest prefix of this collection
     * which satisfies the predicate, and the second collection
     * is the remainder of the collection.
     *
     *    Vector.of(1,2,3,4,5,6).span(x => x <3)
     *    => [Vector.of(1,2), Vector.of(3,4,5,6)]
     */
    span(predicate:(x:T)=>boolean): [Vector<T>,Vector<T>] {
        // could be potentially faster using splitAt.
        const first = this.takeWhile(predicate);
        return [first, this.drop(first.length())];
    }

    /**
     * Returns a new collection with the first
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    drop(n:number): Vector<T> {
        return new Vector(L.drop(n, this._list));
    }

    /**
     * Return a new collection containing the first n
     * elements from this collection
     *
     *     Vector.of(1,2,3,4).take(2)
     *     => Vector.of(1,2)
     */
    take(n:number): Vector<T> {
        if (n<0) {
            return Vector.empty<T>();
        }
        return new Vector(L.take(n, this._list));
    }

    /**
     * Prepend an element at the beginning of the collection.
     */
    prepend(elt: T): Vector<T> {
        return new Vector(L.prepend(elt, this._list));
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     */
    prependAll(elts: Iterable<T>): Vector<T> {
        return Vector.ofIterable(elts).appendAll(this);
    }

    /**
     * Removes the first element matching the predicate
     * (use [[Seq.filter]] to remove all elements matching a predicate)
     */
    removeFirst(predicate: (v:T)=>boolean): Vector<T> {
        const v1 = this.takeWhile(x => !predicate(x));
        return v1.appendAll(this.drop(v1.length()+1));
    }

    /**
     * Returns a new collection with the last
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    dropRight(n:number): Vector<T> {
        if (n>=this.length()) {
            return Vector.empty<T>();
        }
        return new Vector(L.dropLast(n, this._list));
    }

    /**
     * Returns a new collection, discarding the last elements
     * until one element fails the predicate. All elements
     * before that point are retained.
     */
    dropRightWhile(predicate:(x:T)=>boolean): Vector<T> {
        let i=this.length()-1;
        for (;i>=0;i--) {
            if (!predicate(<T>L.nth(i, this._list))) {
                return this.take(i+1);
            }
        }
        return Vector.empty<T>();
    }

    /**
     * Get all the elements in the collection but the first one.
     * If the collection is empty, return None.
     */
    tail(): Option<Vector<T>> {
        if (this.isEmpty()) {
            return Option.none<Vector<T>>();
        }
        return Option.of(new Vector(L.tail(this._list)));
    }

    /**
     * Reduces the collection to a single value by repeatedly
     * calling the combine function.
     * No starting value. The order in which the elements are
     * passed to the combining function is undetermined.
     */
    reduce(combine: (v1:T,v2:T)=>T): Option<T> {
        return SeqHelpers.reduce(this, combine);
    }

    /**
     * Compare values in the collection and return the smallest element.
     * Returns Option.none if the collection is empty.
     *
     * also see [[Vector.minOn]]
     */
    minBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return SeqHelpers.minBy(this, compare);
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the smallest.
     * Returns Option.none if the collection is empty.
     *
     *     Vector.of({name:"Joe", age:12}, {name:"Paula", age:6}).minOn(x=>x.age)
     *     => Option.of({name:"Paula", age:6})
     *
     * also see [[Vector.minBy]]
     */
    minOn(getOrderable: ToOrderable<T>): Option<T> {
        return SeqHelpers.minOn(this, getOrderable);
    }

    /**
     * Compare values in the collection and return the largest element.
     * Returns Option.none if the collection is empty.
     *
     * also see [[Vector.maxOn]]
     */
    maxBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return SeqHelpers.maxBy(this, compare);
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the largest.
     * Returns Option.none if the collection is empty.
     *
     *     Vector.of({name:"Joe", age:12}, {name:"Paula", age:6}).maxOn(x=>x.age)
     *     => Option.of({name:"Joe", age:12})
     *
     * also see [[Vector.maxBy]]
     */
    maxOn(getOrderable: ToOrderable<T>): Option<T> {
        return SeqHelpers.maxOn(this, getOrderable);
    }

    /**
     * Call the function you give for each element in the collection
     * and sum all the numbers, return that sum.
     * Will return 0 if the collection is empty.
     *
     *     Vector.of(1,2,3).sumOn(x=>x)
     *     => 6
     */
    sumOn(getNumber: (v:T)=>number): number {
        return SeqHelpers.sumOn(this, getNumber);
    }

    /**
     * Slides a window of a specific size over the sequence.
     * Returns a lazy stream so memory use is not prohibitive.
     *
     *     Vector.of(1,2,3,4,5,6,7,8).sliding(3)
     *     => Stream.of(Vector.of(1,2,3), Vector.of(4,5,6), Vector.of(7,8))
     */
    sliding(count:number): Stream<Vector<T>> {
        return <Stream<Vector<T>>>SeqHelpers.sliding(this, count);
    }

    /**
     * Apply the function you give to all elements of the sequence
     * in turn, keeping the intermediate results and returning them
     * along with the final result in a list.
     * The last element of the result is the final cumulative result.
     *
     *     Vector.of(1,2,3).scanLeft(0, (soFar,cur)=>soFar+cur)
     *     => Vector.of(0,1,3,6)
     */
    scanLeft<U>(init:U, fn:(soFar:U,cur:T)=>U): Vector<U> {
        return new Vector(L.scan(fn, init, this._list));
    }

    /**
     * Apply the function you give to all elements of the sequence
     * in turn, keeping the intermediate results and returning them
     * along with the final result in a list.
     * The first element of the result is the final cumulative result.
     *
     *     Vector.of(1,2,3).scanRight(0, (cur,soFar)=>soFar+cur)
     *     => Vector.of(6,5,3,0)
     */
    scanRight<U>(init:U, fn:(cur:T,soFar:U)=>U): Vector<U> {
        const r:U[] = [];
        r.unshift(init);
        let cur = init;
        for (let i = this.length()-1; i>=0; i--) {
            cur = fn(<T>L.nth(i, this._list), cur);
            r.unshift(cur);
        }
        return Vector.ofIterable(r);
    }
}
