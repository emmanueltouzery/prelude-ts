import { Option } from "./Option";
import { HashMap } from "./HashMap";
import { IMap } from "./IMap";
import { Seq } from "./Seq";
import { WithEquality, areEqual, getHashCode,
         toStringHelper, Ordering } from "./Comparison";
import { Collection } from "./Collection";
import * as SeqHelpers from "./SeqHelpers";

const nodeBits = 5;
const nodeSize = (1<<nodeBits); // 32
const nodeBitmask = nodeSize - 1;

interface MutableVector2<T> {
    append:(x:T)=>void;
    appendAll:(x:Iterable<T>)=>void;
    getVector2(): Vector2<T>;
    internalGet(idx:number): T|undefined;
}

// Implementation of a bit-mapped vector trie.
// Based on https://github.com/graue/immutable-vector from Scott Feeney.
// TODO optimize all the methods doing append() in a loop!
export class Vector2<T> implements Collection<T>, Seq<T> {

    // _contents will be undefined only if length===0
    protected constructor(private _contents: any[]|undefined,
                          private _length: number,
                          private _maxShift: number) {}

    static empty<T>(): Vector2<T> {
        return Vector2.ofArray<T>([]);
    }

    static of<T>(...data: T[]): Vector2<T> {
        return Vector2.ofArray(data);
    }

    /**
     * Build a vector from any iterable, which means also
     * an array for instance.
     * @type T the item type
     */
    static ofIterable<T>(elts: Iterable<T>): Vector2<T> {
        // I measure appendAll to be 2x faster than Array.from on my
        // machine (node 6.11.3)
        // return Vector2.ofArray(Array.from(elts));
        return Vector2.empty<T>().appendAll(elts);
    }

    static ofArray<T>(data: T[]): Vector2<T> {
        let nodes = [];

        for (let i = 0; i < data.length; i += nodeSize) {
            const node = data.slice(i, i + nodeSize);
            nodes.push(node);
        }
        return Vector2.fromLeafNodes(nodes, data.length);
    }

    /**
     * Build a new vector from the leaf nodes containing data.
     */
    private static fromLeafNodes<T>(nodes: T[][], length: number): Vector2<T> {
        let depth = 1;
        while(nodes.length > 1) {
            let lowerNodes:any[] = nodes;
            nodes = [];
            for (let i = 0; i < lowerNodes.length; i += nodeSize) {
                const node = lowerNodes.slice(i, i + nodeSize);
                nodes.push(node);
            }
            depth++;
        }

        const _contents = nodes[0];
        const _maxShift = _contents ? nodeBits * (depth - 1) : 0;
        return new Vector2<T>(_contents, length, _maxShift);
    }

    length(): number {
        return this._length;
    }

    isEmpty(): boolean {
        return this._length === 0;
    }

    private asMutable(): MutableVector2<T> {
        const append = (val:T) => {
            const index = this._length;
            let node = this._contents || (this._contents = new Array(nodeSize));
            let shift = this._maxShift;
            while (shift > 0) {
                let childIndex = (index >> shift) & nodeBitmask;
                if (!node[childIndex]) {
                    // Need to create new node. Can happen when appending element.
                    node[childIndex] = new Array(nodeSize);
                }
                node = node[childIndex];
                shift -= nodeBits;
            }
            node[index & nodeBitmask] = val;
            ++this._length;
        };
        return {
            append,
            appendAll: (elts: Iterable<T>) => {
                const iterator = elts[Symbol.iterator]();
                let curItem = iterator.next();
                while (!curItem.done) {
                    append(curItem.value);
                    curItem = iterator.next();
                }
            },
            internalGet: (idx:number) => this.internalGet(idx),
            getVector2: () => this
        };
    }

    /**
     * Dual to the foldRight function. Build a collection from a seed.
     * Takes a starting element and a function.
     * It applies the function on the starting element; if the
     * function returns None, it stops building the list, if it
     * returns Some of a pair, it adds the first element to the result
     * and takes the second element as a seed to keep going.
     *
     *     unfoldRight(
     *          10, x=>Option.of(x)
     *              .filter(x => x!==0)
     *              .map<[number,number]>(x => [x,x-1]))
     *     => [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
     */
    static unfoldRight<T,U>(seed: T, fn: (x:T)=>Option<[U,T]>): Vector2<U> {
        let nextVal = fn(seed);
        let r = Vector2.empty<U>();
        while (nextVal.isSome()) {
            r = r.append(nextVal.getOrThrow()[0]);
            nextVal = fn(nextVal.getOrThrow()[1]);
        }
        return r;
    }

    private cloneVec(): Vector2<T> {
        return new Vector2<T>(this._contents, this._length, this._maxShift);
    }

    private internalGet(index: number): T|undefined {
        if (index >= 0 && index < this._length) {
            let shift = this._maxShift;
            let node = this._contents;
            while (shift > 0 && node) {
                node = node[(index >> shift) & nodeBitmask];
                shift -= nodeBits;
            }
            // cast should be OK as we check bounds
            // at the beginning of the method
            return (<any>node)[index & nodeBitmask];
        }
        return undefined;
    }

    get(index: number): Option<T> {
        return Option.of(this.internalGet(index));
    }

    single(): Option<T> {
        return this._length === 1 ?
            this.head() :
            Option.none<T>();
    }

    // OK to call with index === vec.length (an append) as long as vector
    // length is not a (nonzero) power of the branching factor (32, 1024, ...).
    // Cannot be called on the empty vector!! It would crash
    //
    // TODO the action callback is costing lots of performance on node6.11.3 at least
    // on a loop calling append() which map() and groupBy() are doing for instance,
    // as evidenced by the poor benchmarks.
    private internalSet(index: number, val: T|null): Vector2<T> {
        let newVec = this.cloneVec();
        // next line will crash on empty vector
        let node = newVec._contents = (<any[]>this._contents).slice();
        let shift = this._maxShift;
        while (shift > 0) {
            let childIndex = (index >> shift) & nodeBitmask;
            if (node[childIndex]) {
                node[childIndex] = node[childIndex].slice();
            } else {
                // Need to create new node. Can happen when appending element.
                node[childIndex] = new Array(nodeSize);
            }
            node = node[childIndex];
            shift -= nodeBits;
        }
        node[index & nodeBitmask] = val;
        return newVec;
    }

    set(index: number, val: T): Vector2<T> {
        if (index >= this._length || index < 0) {
            throw new Error('setting past end of vector is not implemented');
        }
        return this.internalSet(index, val);
    }

    append(val:T): Vector2<T> {
        if (this._length === 0) {
            return Vector2.ofArray<T>([val]);
        } else if (this._length < (nodeSize << this._maxShift)) {
            const newVec = this.internalSet(this._length, val);
            newVec._length++;
            return newVec;
        } else {
            // We'll need a new root node.
            const newVec = this.cloneVec();
            newVec._length++;
            newVec._maxShift += nodeBits;
            let node:any[] = [];
            newVec._contents = [this._contents, node];
            let depth = newVec._maxShift / nodeBits + 1;
            for (let i = 2; i < depth; i++) {
                const newNode: any[] = [];
                node.push(newNode);
                node = newNode;
            }
            node[0] = val;
            return newVec;
        }
    }

    /**
     * Append multiple elements at the end of the collection.
     * Note that arrays are also iterables.
     */
    appendAll(elts: Iterable<T>): Vector2<T> {
        const iterator = elts[Symbol.iterator]();
        let curItem = iterator.next();
        if (curItem.done) {
            return this;
        }
        // first need to create a new Vector2 through the first append
        // call, and then we can mutate that new Vector2, otherwise
        // we'll mutate the receiver which is a big no-no!!
        const mutVec = this.append(curItem.value).asMutable();

        curItem = iterator.next();
        while (!curItem.done) {
            mutVec.append(curItem.value);
            curItem = iterator.next();
        }
        return mutVec.getVector2();
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
        return Option.of(this.internalGet(this._length-1));
    }

    init(): Vector2<T> {
        let popped;

        if (this._length === 0) {
            return this;
        }
        if (this._length === 1) {
            return Vector2.empty<T>();
        }

        if ((this._length & nodeBitmask) !== 1) {
            popped = this.internalSet(this._length - 1, null);
        }
        // If the length is a power of the branching factor plus one,
        // reduce the tree's depth and install the root's first child as
        // the new root.
        else if (this._length - 1 === nodeSize << (this._maxShift - nodeBits)) {
            popped = this.cloneVec();
            popped._contents = (<any[]>this._contents)[0]; // length>0 => _contents!==undefined
            popped._maxShift = this._maxShift - nodeBits;
        }
        // Otherwise, the root stays the same but we remove a leaf node.
        else {
            popped = this.cloneVec();

            // we know the vector is not empty, there is a if at the top
            // of the function => ok to cast to any[]
            let node = popped._contents = (<any[]>popped._contents).slice();
            let shift = this._maxShift;
            let removedIndex = this._length - 1;

            while (shift > nodeBits) { // i.e., Until we get to lowest non-leaf node.
                let localIndex = (removedIndex >> shift) & nodeBitmask;
                node = node[localIndex] = node[localIndex].slice();
                shift -= nodeBits;
            }
            node[(removedIndex >> shift) & nodeBitmask] = null;
        }
        popped._length--;
        return popped;
    }

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    dropWhile(predicate:(x:T)=>boolean): Vector2<T> {
        // TODO must be optimized!!!
        let r = Vector2.empty<T>();
        let skip = true;
        for (let i=0;i<this._length;i++) {
            const val = <T>this.internalGet(i);
            if (skip && !predicate(val)) {
                skip = false;
            }
            if (!skip) {
                r = r.append(val);
            }
        }
        return r;
    }

    /**
     * Search for an item matching the predicate you pass,
     * return Option.Some of that element if found,
     * Option.None otherwise.
     */
    find(predicate:(v:T)=>boolean): Option<T> {
        for (let i=0;i<this._length;i++) {
            const item = <T>this.internalGet(i);
            if (predicate(item)) {
                return Option.of(item);
            }
        }
        return Option.none<T>();
    }

    /**
     * Returns true if the predicate returns true for all the
     * elements in the collection.
     */
    allMatch(predicate:(v:T)=>boolean): boolean {
        return this.find(x => !predicate(x)).isNone();
    }

    /**
     * Returns true if there the predicate returns true for any
     * element in the collection.
     */
    anyMatch(predicate:(v:T)=>boolean): boolean {
        return this.find(predicate).isSome();
    }

    /**
     * Returns a pair of two collections; the first one
     * will only contain the items from this collection for
     * which the predicate you give returns true, the second
     * will only contain the items from this collection where
     * the predicate returns false.
     *
     *     Vector.of(1,2,3,4).partition(x => x%2===0)
     *     => [[2,4],[1,3]]
     */
    partition(predicate:(x:T)=>boolean): [Vector2<T>,Vector2<T>] {
        // TODO goes twice over the list, can be optimized...
        return [this.filter(predicate), this.filter(x => !predicate(x))];
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
     * also see [[Vector2.arrangeBy]]
     */
    groupBy<C>(classifier: (v:T)=>C & WithEquality): HashMap<C,Vector2<T>> {
        return this.foldLeft(
            HashMap.empty<C,MutableVector2<T>>(),
            (acc: HashMap<C,MutableVector2<T>>, v:T) =>
                acc.putWithMerge(
                    classifier(v), Vector2.of(v).asMutable(),
                    (v1:MutableVector2<T>,v2:MutableVector2<T>)=> {
                        v1.append(<T>v2.internalGet(0));
                        return v1;
                    }))
            .mapValues(mutVec => mutVec.getVector2());
    }

    /**
     * Matches each element with a unique key that you extract from it.
     * If the same key is present twice, the function will return None.
     *
     * also see [[Vector2.groupBy]]
     */
    arrangeBy<K>(getKey: (v:T)=>K&WithEquality): Option<IMap<K,T>> {
        return SeqHelpers.arrangeBy<T,K>(this, getKey);
    }

    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): Vector2<T> {
        return <Vector2<T>>SeqHelpers.distinctBy(this, keyExtractor);
    }

    // let ImmutableVectorSlice = require('./ImmutableVectorSlice');

    // slice(begin: number, end: number): Vector2<T> {
    //     if (typeof end !== 'number' || end > this.length) end = this.length;
    //     if (typeof begin !== 'number' || begin < 0) begin = 0;
    //     if (end < begin) end = begin;

    //     if (begin === 0 && end === this.length) {
    //         return this;
    //     }

    //     return new ImmutableVectorSlice(this, begin, end);
    // }

    [Symbol.iterator](): Iterator<T> {
        let _vec = this;
        let _index = -1;
        let _stack: any[] = [];
        let _node = this._contents;
        return {
            next: () => {
                // Iterator state:
                //  _vec: Vector we're iterating over.
                //  _node: "Current" leaf node, meaning the one we returned a value from
                //         on the previous call.
                //  _index: Index (within entire vector, not node) of value returned last
                //          time.
                //  _stack: Path we traveled to current node, as [node, local index]
                //          pairs, starting from root node, not including leaf.

                let vec = _vec;
                let shift;

                if (_index === vec._length - 1) {
                    return {done: true, value: <any>undefined};
                }

                if (_index > 0 && (_index & nodeBitmask) === nodeSize - 1) {
                    // Using the stack, go back up the tree, stopping when we reach a node
                    // whose children we haven't fully iterated over.
                    let step;
                    while ((step = _stack.pop())[1] === nodeSize - 1) ;
                    step[1]++;
                    _stack.push(step);
                    _node = step[0][step[1]];
                }

                for (shift = _stack.length * nodeBits; shift < _vec._maxShift;
                     shift += nodeBits) {
                    _stack.push([_node, 0]);
                    _node = (<any[]>_node)[0];
                }

                _index++;
                return {value: (<any[]>_node)[_index & nodeBitmask], done: false};
            }
        };
    }

    /**
     * get the leaf nodes, which contain the data, from the vector.
     * return only the leaf nodes containing the first n items from the vector.
     * (give n=_length to get all the data)
     */
    private getLeafNodes(n:number): T[][] {
        let _index = -1;
        let _stack: any[] = [];
        let _node = this._contents;
        let result:T[][] = [];
        if (!_node) {
            // empty vector
            return result;
        }

        while (_index*nodeSize < n) {

            if (_index > 0) {
                // Using the stack, go back up the tree, stopping when we reach a node
                // whose children we haven't fully iterated over.
                let step;
                while ((step = _stack.pop())[1] === nodeSize - 1) ;
                step[1]++;
                _stack.push(step);
                _node = step[0][step[1]];
            }

            let shift;
            for (shift=_stack.length*nodeBits; shift<this._maxShift; shift+=nodeBits) {
                _stack.push([_node, 0]);
                _node = (<any[]>_node)[0];
            }

            _index++;
            result.push(<any>_node);
        }
        return result;
    }

    forEach(fun:(x:T)=>void):Vector2<T> {
        let iter = this[Symbol.iterator]();
        let step;
        while (!(step = iter.next()).done) {
            fun(step.value);
        }
        return this;
    }

    map<U>(fun:(x:T)=>U): Vector2<U> {
        let iter = this[Symbol.iterator]();
        const mutVec = Vector2.empty<U>().asMutable();
        let step;
        while (!(step = iter.next()).done) {
            mutVec.append(fun(step.value));
        }
        return mutVec.getVector2();
    }

    filter(fun:(x:T)=>boolean): Vector2<T> {
        let iter = this[Symbol.iterator]();
        const mutVec = Vector2.empty<T>().asMutable();
        let step;
        while (!(step = iter.next()).done) {
            if (fun(step.value)) {
                mutVec.append(step.value);
            }
        }
        return mutVec.getVector2();
    }

    /**
     * Apply the mapper function on every element of this collection.
     * The mapper function returns an Option; if the Option is a Some,
     * the value it contains is added to the result Collection, if it's
     * a None, the value is discarded.
     */
    mapOption<U>(mapper:(v:T)=>Option<U>): Vector2<U> {
        let iter = this[Symbol.iterator]();
        let mutVec = Vector2.empty<U>().asMutable();
        let step;
        while (!(step = iter.next()).done) {
            const v = mapper(step.value);
            if (v.isSome()) {
                mutVec.append(v.getOrThrow());
            }
        }
        return mutVec.getVector2();
    }

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     */
    flatMap<U>(mapper:(v:T)=>Vector2<U>): Vector2<U> {
        let iter = this[Symbol.iterator]();
        const mutVec = Vector2.empty<U>().asMutable();
        let step;
        while (!(step = iter.next()).done) {
            mutVec.appendAll(mapper(step.value));
        }
        return mutVec.getVector2();
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

    foldLeft<U>(zero:U, fn:(soFar:U,cur:T)=>U):U {
        let iter = this[Symbol.iterator]();
        let step;
        let acc = zero;
        while (!(step = iter.next()).done) {
            acc = fn(acc, step.value);
        }
        return acc;
    }

    /**
     * Reduces the collection to a single value.
     * Right-associative.
     *
     * Example:
     *
     *     Vector.of("a", "b", "c").foldRight("!", (x,xs) => xs+x))
     *     => "!cba"
     *
     * @param zero The initial value
     * @param fn A function taking the current collection item and
     *           the previous value , and returning
     *           an updated value.
     */
    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        let r = zero;
        for (let i=this._length-1;i>=0;i--) {
            r = fn(<T>this.internalGet(i), r);
        }
        return r;
    }

    // indexOf(element:T, fromIndex:number): number {
    //     if (fromIndex === undefined) {
    //         fromIndex = 0;
    //     } else {
    //         fromIndex >>>= 0;
    //     }
    //     let isImmutableCollection = ImmutableVector.isImmutableVector(element);
    //     for (let index = fromIndex; index < this.length; index++) {
    //         let val = this.get(index);
    //         if (isImmutableCollection) {
    //             if (element.equals(this.get(index))) return index;
    //         } else {
    //             if (element === this.internalGet(index)) return index;
    //         }
    //     }
    //     return -1;
    // }

    /**
     * Randomly reorder the elements of the collection.
     */
    shuffle(): Vector2<T> {
        return Vector2.ofArray(SeqHelpers.shuffle(this.toArray()));
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:Vector2<T>)=>U): U {
        return converter(this);
    }

    // // TODO: See if equals and toArray are faster using a traversal.

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other:Vector2<T&WithEquality>): boolean {
        if (!other || (other._maxShift === undefined)) {
            return false;
        }
        if (this._length !== other._length) return false;
        for (let i = 0; i < this._length; i++) {
            const myVal: T & WithEquality|null|undefined = <T&WithEquality>this.internalGet(i);
            const hisVal: T & WithEquality|null|undefined = other.internalGet(i);
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
        for (let i=0;i<this._length;i++) {
            hash = 31 * hash + getHashCode(this.internalGet(i));
        }
        return hash;
    }

    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        let r = "Vector2(";
        for (let i=0;i<this._length;i++) {
            if (i>0) {
                r += ", ";
            }
            r += toStringHelper(this.internalGet(i));
        }
        return r + ")";
    }

    /**
     * Used by the node REPL to display values.
     * Most of the time should be the same as toString()
     */
    inspect(): string {
        return this.toString();
    }

    /**
     * Joins elements of the collection by a separator.
     * Example:
     *
     *     Vector2.of(1,2,3).mkString(", ")
     *     => "1, 2, 3"
     */
    mkString(separator: string): string {
        let r = "";
        for (let i=0;i<this._length;i++) {
            if (i>0) {
                r += separator;
            }
            r += (<T>this.internalGet(i)).toString();
        }
        return r;
    }

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     *
     * also see [[Vector2.sortOn]]
     */
    sortBy(compare: (v1:T,v2:T)=>Ordering): Vector2<T> {
        return Vector2.ofArray<T>(this.toArray().sort(compare));
    }

    /**
     * Give a function associating a number or a string with
     * elements from the collection, and the elements
     * are sorted according to that value.
     *
     * also see [[Vector2.sortBy]]
     */
    sortOn(getKey: ((v:T)=>number)|((v:T)=>string)): Vector2<T> {
        return <Vector2<T>>SeqHelpers.sortOn<T>(this, getKey);
    }

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     */
    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V]): IMap<K,V> {
        return this.foldLeft(HashMap.empty<K,V>(), (acc,cur) => {
            const converted = converter(cur);
            return acc.put(converted[0], converted[1]);
        });
    }

    toArray(): T[] {
        let out = [];
        for (let i = 0; i < this._length; i++) {
            out.push(<T>this.internalGet(i));
        }
        return out;
    };

    /**
     * Combine this collection with the collection you give in
     * parameter to produce a new collection which combines both,
     * in pairs. For instance:
     *
     *     Vector2.of(1,2,3).zip(["a","b","c"])
     *     => Vector2.of([1,"a"], [2,"b"], [3,"c"])
     *
     * The result collection will have the length of the shorter
     * of both collections. Extra elements will be discarded.
     */
    zip<U>(other: Iterable<U>): Vector2<[T,U]> {
        let r = Vector2.empty<[T,U]>();
        const thisIterator = this[Symbol.iterator]();
        const otherIterator = other[Symbol.iterator]();
        let thisCurItem = thisIterator.next();
        let otherCurItem = otherIterator.next();

        while (!thisCurItem.done && !otherCurItem.done) {
            r = r.append([thisCurItem.value, otherCurItem.value]);
            thisCurItem = thisIterator.next();
            otherCurItem = otherIterator.next();
        }
        return r;
    }

    /**
     * Reverse the collection. For instance:
     *
     *     [1,2,3] => [3,2,1]
     */
    reverse(): Vector2<T> {
        const mutVec = Vector2.empty<T>().asMutable();
        for (let i=this._length-1;i>=0;i--) {
            mutVec.append(<T>this.internalGet(i));
        }
        return mutVec.getVector2();
    }

    /**
     * Combine this collection with the index of the elements
     * in it. Handy if you need the index when you map on
     * the collection for instance:
     *
     *     Vector2.of("a","b").zipWithIndex().map([v,idx] => ...)
     */
    zipWithIndex(): Vector2<[T,number]> {
        return <Vector2<[T,number]>>SeqHelpers.zipWithIndex<T>(this);
    }

    // TODO must be optimized!!!
    takeWhile(predicate:(x:T)=>boolean): Vector2<T> {
        let r = Vector2.empty<T>();
        for (let i=0;i<this._length;i++) {
            const val = <T>this.internalGet(i);
            if (!predicate(val)) {
                break;
            }
            r = r.append(val);
        }
        return r;
    }

    /**
     * Split the collection at a specific index.
     *
     *     List.of(1,2,3,4,5).splitAt(3)
     *     => [List.of(1,2,3), List.of(4,5)]
     */
    splitAt(index:number): [Vector2<T>,Vector2<T>] {
        const r1 = Vector2.empty<T>().asMutable();
        const r2 = Vector2.empty<T>().asMutable();
        for (let i=0;i<this._length;i++) {
            const val = <T>this.internalGet(i);
            if (i<index) {
                r1.append(val);
            } else {
                r2.append(val);
            }
        }
        return [r1.getVector2(),r2.getVector2()];
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
    span(predicate:(x:T)=>boolean): [Vector2<T>,Vector2<T>] {
        // TODO must be optimized!!!
        const first = this.takeWhile(predicate);
        return [first, this.drop(first.length())];
    }

    /**
     * Returns a new collection with the first
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    drop(n:number): Vector2<T> {
        let r = Vector2.empty<T>();
        if (n>=this._length) {
            return r;
        }
        const mutVec = r.asMutable();
        for (let i=n;i<this._length;i++) {
            const val = <T>this.internalGet(i);
            mutVec.append(val);
        }
        return mutVec.getVector2();
    }

    take(n:number): Vector2<T> {
        const leafNodes = this.getLeafNodes(n);
        return Vector2.fromLeafNodes(leafNodes, n);
    }

    /**
     * Prepend an element at the beginning of the collection.
     */
    prepend(elt: T): Vector2<T> {
        // TODO must be optimized!!
        return this.prependAll([elt]);
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     *
     * This method requires Array.from()
     * You may need to polyfill it =>
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
     */
    prependAll(elts: Iterable<T>): Vector2<T> {
        // TODO must be optimized!!
        return Vector2.ofArray(Array.from(elts)).appendAll(this);
    }

    /**
     * Removes the first element matching the predicate
     * (use [[Seq.filter]] to remove all elements matching a predicate)
     */
    removeFirst(predicate: (v:T)=>boolean): Vector2<T> {
        // TODO must be optimized!!
        let r = Vector2.empty<T>();
        let i=0;
        for (;i<this._length;i++) {
            const val = <T>this.internalGet(i);
            if (predicate(val)) {
                break;
            }
            r = r.append(val);
        }
        return r.appendAll(this.drop(i+1));
    }

    /**
     * Returns a new collection with the last
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    dropRight(n:number): Vector2<T> {
        // TODO must be optimized!!
        if (n>=this._length) {
            return Vector2.empty<T>();
        }
        return this.take(this._length-n);
    }

    /**
     * Get all the elements in the collection but the first one.
     * If the collection is empty, return None.
     */
    tail(): Option<Vector2<T>> {
        return this._length > 0 ? Option.of(this.drop(1)) : Option.none<Vector2<T>>();
    }
}
