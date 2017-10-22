import { Option } from "./Option";
import { HashMap } from "./HashMap";
import { IMap } from "./IMap";
import { WithEquality, areEqual, getHashCode,
         toStringHelper, Ordering } from "./Comparison";
import { Collection } from "./Collection";
import * as SeqHelpers from "./SeqHelpers";

const nodeBits = 5;
const nodeSize = (1<<nodeBits); // 32
const nodeBitmask = nodeSize - 1;


// Implementation of a bit-mapped vector trie.
// Based on https://github.com/graue/immutable-vector from Scott Feeney.
export class Vector2<T> implements Collection<T> {

    // _contents will be undefined only if length===0
    protected constructor(private _contents: any[]|undefined,
                          private _length: number,
                          private _maxShift: number) {}

    static empty<T>(): Vector2<T> {
        return Vector2.ofArray([]);
    }

    static of<T>(...data: T[]): Vector2<T> {
        return Vector2.ofArray(data);
    }

    static ofArray<T>(data: T[]): Vector2<T> {
        let nodes = [];
        let depth = 1;

        for (let i = 0; i < data.length; i += nodeSize) {
            const node = data.slice(i, i + nodeSize);
            nodes.push(node);
        }

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
        const length = data ? data.length : 0;
        const _maxShift = _contents ? nodeBits * (depth - 1) : 0;
        return new Vector2<T>(_contents, length, _maxShift);
    }

    length(): number {
        return this._length;
    }

    isEmpty(): boolean {
        return this._length === 0;
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
    private internalSet(index: number, action: (ar:T[],idx:number)=>void): Vector2<T> {
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
        action(node, index & nodeBitmask);
        return newVec;
    }

    set(index: number, val: T): Vector2<T> {
        if (index >= this._length || index < 0) {
            throw new Error('setting past end of vector is not implemented');
        }
        return this.internalSet(index, (ar,idx)=>ar[idx]=val);
    }

    append(val:T): Vector2<T> {
        if (this._length === 0) {
            return Vector2.ofArray<T>([val]);
        } else if (this._length < (nodeSize << this._maxShift)) {
            const newVec = this.internalSet(this._length, (ar,idx)=>ar[idx]=val);
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
        // TODO performance disaster
        const iterator = elts[Symbol.iterator]();
        let curItem = iterator.next();
        let result: Vector2<T> = this;
        while (!curItem.done) {
            result = result.append(curItem.value);
            curItem = iterator.next();
        }
        return result;
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

    tail(): Vector2<T> {
        let popped;

        if (this._length === 0) {
            return this;
        }
        if (this._length === 1) {
            return Vector2.empty<T>();
        }

        if ((this._length & nodeBitmask) !== 1) {
            popped = this.internalSet(this._length - 1, (ar,idx)=>ar.pop());
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
     * Returns a new collection with the first
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    drop(n:number): Vector2<T> {
        let r: Vector2<T> = this;
        for (let i=0;i<n;i++) {
            r = r.tail();
        }
        return r;
    }

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    dropWhile(predicate:(x:T)=>boolean): Vector2<T> {
        let r: Vector2<T> = this;
        while (r._length > 0 && predicate(<T>r.internalGet(0))) {
            r = r.tail();
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
            HashMap.empty<C,Vector2<T>>(),
            (acc: HashMap<C,Vector2<T>>, v:T) =>
                acc.putWithMerge(
                    classifier(v), Vector2.of(v),
                    (v1:Vector2<T>,v2:Vector2<T>)=>
                        v1.append(v2.single().getOrThrow())));
    }

    /**
     * Matches each element with a unique key that you extract from it.
     * If the same key is present twice, the function will return None.
     *
     * also see [[Vector2.groupBy]]
     */
    // arrangeBy<K>(getKey: (v:T)=>K&WithEquality): Option<IMap<K,T>> {
    //     return SeqHelpers.arrangeBy<T,K>(this, getKey);
    // }

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
        let out = Vector2.empty<U>();
        let step;
        while (!(step = iter.next()).done) {
            out = out.append(fun(step.value));
        }
        return out;
    }

    filter(fun:(x:T)=>boolean): Vector2<T> {
        let iter = this[Symbol.iterator]();
        let out = Vector2.empty<T>();
        let step;
        while (!(step = iter.next()).done) {
            if (fun(step.value)) {
                out = out.append(step.value);
            }
        }
        return out;
    }

    /**
     * Apply the mapper function on every element of this collection.
     * The mapper function returns an Option; if the Option is a Some,
     * the value it contains is added to the result Collection, if it's
     * a None, the value is discarded.
     */
    mapOption<U>(mapper:(v:T)=>Option<U>): Vector2<U> {
        let iter = this[Symbol.iterator]();
        let out = Vector2.empty<U>();
        let step;
        while (!(step = iter.next()).done) {
            const v = mapper(step.value);
            if (v.isSome()) {
                out = out.append(v.getOrThrow());
            }
        }
        return out;
    }

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     */
    flatMap<U>(mapper:(v:T)=>Vector2<U>): Vector2<U> {
        let iter = this[Symbol.iterator]();
        let out = Vector2.empty<U>();
        let step;
        while (!(step = iter.next()).done) {
            const v = mapper(step.value);
            out = out.appendAll(v);
        }
        return out;
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
        let index = 0;
        let acc = zero;
        while (!(step = iter.next()).done) {
            acc = fn(acc, step.value);
        }
        return acc;
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
        if (!other || !other._maxShift) {
            return false;
        }
        if (this.length !== other.length) return false;
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
    // sortOn(getKey: ((v:T)=>number)|((v:T)=>string)): Vector2<T> {
    //     return <Vector2<T>>SeqHelpers.sortOn<T>(this, getKey);
    // }

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
}
