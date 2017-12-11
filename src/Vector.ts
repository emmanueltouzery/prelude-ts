import { Option } from "./Option";
import { HashMap } from "./HashMap";
import { IMap } from "./IMap";
import { Seq } from "./Seq";
import { WithEquality, areEqual, getHashCode,
         Ordering } from "./Comparison";
import { Collection } from "./Collection";
import * as SeqHelpers from "./SeqHelpers";

const nodeBits = 5;
const nodeSize = (1<<nodeBits); // 32
const nodeBitmask = nodeSize - 1;

/**
 * We can get a mutable vector besides the immutable one,
 * to enable faster performance in some scenarios (for instance
 * append in a loop). However this is not exported to users
 * of the library but purely for internal use.
 *
 * Note that since we can never modify nodes of an immutable vector,
 * we must consider long and hard before adding more operations besides
 * append to this interface.
 */
interface MutableVector<T> {
    append:(x:T)=>void;
    appendAll:(x:Iterable<T>)=>void;
    getVector(): Vector<T>;
    internalGet(idx:number): T|undefined;
}


/**
 * A general-purpose list class with all-around good performance.
 * quasi-O(1) (actually O(log32(n))) access, append, replace.
 * It's backed by a bit-mapped vector trie.
 * @param T the item type
 */
export class Vector<T> implements Seq<T> {
    // Based on https://github.com/graue/immutable-vector from Scott Feeney.

    /**
     * @hidden
     */
    // _contents will be undefined only if length===0
    protected constructor(private _contents: any[]|undefined,
                          private _length: number,
                          private _maxShift: number) {}

    /**
     * The empty vector.
     * @param T the item type
     */
    static empty<T>(): Vector<T> {
        return Vector.ofArray<T>([]);
    }

    /**
     * Build a vector from a series of items (any number, as parameters)
     * @param T the item type
     */
    static of<T>(...data: T[]): Vector<T> {
        return Vector.ofArray(data);
    }

    /**
     * Build a vector from any iterable, which means also
     * an array for instance.
     * @param T the item type
     */
    static ofIterable<T>(elts: Iterable<T>): Vector<T> {
        if (Array.isArray(elts)) {
            return Vector.ofArray(elts);
        }
        // I measure appendAll to be 2x faster than Array.from on my
        // machine (node 6.11.3+8.8.0)
        // return Vector.ofArray(Array.from(elts));
        return Vector.empty<T>().appendAll(elts);
    }

    private static ofArray<T>(data: T[]): Vector<T> {
        let nodes = [];

        let i=0;
        for (; i < data.length-(data.length%nodeSize); i += nodeSize) {
            const node = data.slice(i, i + nodeSize);
            nodes.push(node);
        }

        // potentially one non-full node to add.
        if (data.length-i>0) {
            const extraNode = new Array(nodeSize);
            for (let idx=0;i+idx<data.length;idx++) {
                extraNode[idx] = data[i+idx];
            }
            nodes.push(extraNode);
        }

        return Vector.fromLeafNodes(nodes, data.length);
    }

    /**
     * Build a new vector from the leaf nodes containing data.
     */
    private static fromLeafNodes<T>(nodes: T[][], length: number): Vector<T> {
        let depth = 1;
        while (nodes.length > 1) {
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
        return new Vector<T>(_contents, length, _maxShift);
    }

    /**
     * Get the length of the collection.
     */
    length(): number {
        return this._length;
    }

    /**
     * true if the collection is empty, false otherwise.
     */
    isEmpty(): boolean {
        return this._length === 0;
    }

    /**
     * Get an empty mutable vector. Append is much more efficient, and you can
     * get a normal vector from it.
     */
    private static emptyMutable<T>(): MutableVector<T> {
        return Vector.appendToMutable(Vector.empty<T>(), <any>undefined);
    }

    /**
     * Get a mutable vector from an immutable one, however you must add a
     * a value to the immutable vector at least once, so that the last
     * node is modified to a temporary vector, because we can't modify
     * the nodes from the original immutable vector.
     * Note that is only safe because the only modifying operation on
     * mutable vector is append at the end (so we know other tiles besides
     * the last one won't be modified).
     */
    private static appendToMutable<T>(vec: Vector<T>, toAppend:T): MutableVector<T> {
        // i don't want to offer even a private API to get a mutable vector from
        // an immutable one without adding a value to protect the last node, but
        // I need it for emptyMutable(), so I have this trick with undefined and any.
        if (typeof toAppend !== "undefined") {
            vec = vec.append(toAppend);
        }
        const append = (val:T) => {
            if (vec._length < (nodeSize << vec._maxShift)) {
                const index = vec._length;
                let node = vec._contents || (vec._contents = new Array(nodeSize));
                let shift = vec._maxShift;
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
                ++vec._length;
            } else {
                // We'll need a new root node.
                vec = Vector.setupNewRootNode(vec, val);
            }
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
            internalGet: (idx:number) => vec.internalGet(idx),
            getVector: () => vec
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
     *     Vector.unfoldRight(
     *          10, x=>Option.of(x)
     *              .filter(x => x!==0)
     *              .map<[number,number]>(x => [x,x-1]))
     *     => Vector.of(10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
     */
    static unfoldRight<T,U>(seed: T, fn: (x:T)=>Option<[U,T]>): Vector<U> {
        let nextVal = fn(seed);
        let r = Vector.emptyMutable<U>();
        while (nextVal.isSome()) {
            r.append(nextVal.getOrThrow()[0]);
            nextVal = fn(nextVal.getOrThrow()[1]);
        }
        return r.getVector();
    }

    private cloneVec(): Vector<T> {
        return new Vector<T>(this._contents, this._length, this._maxShift);
    }

    // WILL blow up if you give out of bounds index!
    // it's the caller's responsability to check bounds.
    private internalGet(index: number): T {
        let shift = this._maxShift;
        let node = this._contents;
        while (shift > 0) {
            node = (<any>node)[(index >> shift) & nodeBitmask];
            shift -= nodeBits;
        }
        return (<any>node)[index & nodeBitmask];
    }

    /**
     * Retrieve the element at index idx.
     * Returns an option because the collection may
     * contain less elements than the index.
     */
    get(index: number): Option<T> {
        if (index < 0 || index >= this._length) {
            return Option.none();
        }
        return Option.of(this.internalGet(index));
    }

    /**
     * If the collection contains a single element,
     * return Some of its value, otherwise return None.
     */
    single(): Option<T> {
        return this._length === 1 ?
            this.head() :
            Option.none<T>();
    }

    // OK to call with index === vec.length (an append) as long as vector
    // length is not a (nonzero) power of the branching factor (32, 1024, ...).
    // Cannot be called on the empty vector!! It would crash
    private internalSet(index: number, val: T|null): Vector<T> {
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

    /**
     * Replace the value of element at the index you give.
     * Will throw if the index is out of bounds!
     */
    replace(index: number, val: T): Vector<T> {
        if (index >= this._length || index < 0) {
            throw new Error('Vector.replace: index is out of range: ' + index);
        }
        return this.internalSet(index, val);
    }

    /**
     * Append an element at the end of the collection.
     */
    append(val:T): Vector<T> {
        if (this._length === 0) {
            return Vector.ofArray<T>([val]);
        } else if (this._length < (nodeSize << this._maxShift)) {
            const newVec = this.internalSet(this._length, val);
            newVec._length++;
            return newVec;
        } else {
            // We'll need a new root node.
            return Vector.setupNewRootNode(this,val);
        }
    }

    private static setupNewRootNode<T>(vec: Vector<T>, val:T): Vector<T> {
        const newVec = vec.cloneVec();
        newVec._length++;
        newVec._maxShift += nodeBits;
        let node:any[] = [];
        newVec._contents = [vec._contents, node];
        let depth = newVec._maxShift / nodeBits + 1;
        for (let i = 2; i < depth; i++) {
            const newNode: any[] = [];
            node.push(newNode);
            node = newNode;
        }
        node[0] = val;
        return newVec;
    }

    /**
     * Append multiple elements at the end of the collection.
     * Note that arrays are also iterables.
     */
    appendAll(elts: Iterable<T>): Vector<T> {
        const iterator = elts[Symbol.iterator]();
        let curItem = iterator.next();
        if (curItem.done) {
            return this;
        }
        // first need to create a new Vector through the first append
        // call, and then we can mutate that new Vector, otherwise
        // we'll mutate the receiver which is a big no-no!!
        const mutVec = Vector.appendToMutable(this, curItem.value);

        curItem = iterator.next();
        while (!curItem.done) {
            mutVec.append(curItem.value);
            curItem = iterator.next();
        }
        return mutVec.getVector();
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
        if (this._length === 0) {
            return Option.none();
        }
        return Option.of(this.internalGet(this._length-1));
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
        let popped;

        if (this._length === 0) {
            return this;
        }
        if (this._length === 1) {
            return Vector.empty<T>();
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
    dropWhile(predicate:(x:T)=>boolean): Vector<T> {
        let r = Vector.emptyMutable<T>();
        let skip = true;
        for (let i=0;i<this._length;i++) {
            const val = <T>this.internalGet(i);
            if (skip && !predicate(val)) {
                skip = false;
            }
            if (!skip) {
                r.append(val);
            }
        }
        return r.getVector();
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
     *     => [Vector.of(2,4),Vector.of(1,3)]
     */
    partition(predicate:(x:T)=>boolean): [Vector<T>,Vector<T>] {
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
     * also see [[Vector.arrangeBy]]
     */
    groupBy<C>(classifier: (v:T)=>C & WithEquality): HashMap<C,Vector<T>> {
        return this.foldLeft(
            HashMap.empty<C,MutableVector<T>>(),
            (acc: HashMap<C,MutableVector<T>>, v:T) =>
                acc.putWithMerge(
                    classifier(v), Vector.appendToMutable(Vector.empty<T>(), v),
                    (v1:MutableVector<T>,v2:MutableVector<T>)=> {
                        v1.append(<T>v2.internalGet(0));
                        return v1;
                    }))
            .mapValues(mutVec => mutVec.getVector());
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
        let _index = -1;
        let _stack: any[] = [];
        let _node = this._contents;
        const sz = nodeSize - 1;
        return {
            next: () => {
                // Iterator state:
                //  _node: "Current" leaf node, meaning the one we returned a value from
                //         on the previous call.
                //  _index: Index (within entire vector, not node) of value returned last
                //          time.
                //  _stack: Path we traveled to current node, as [node, local index]
                //          pairs, starting from root node, not including leaf.

                if (_index === this._length - 1) {
                    return {done: true, value: <any>undefined};
                }

                if (_index > 0 && (_index & nodeBitmask) === sz) {
                    // Using the stack, go back up the tree, stopping when we reach a node
                    // whose children we haven't fully iterated over.
                    let step;
                    while ((step = _stack.pop())[1] === sz) ;
                    step[1]++;
                    _stack.push(step);
                    _node = step[0][step[1]];
                }

                for (let shift = _stack.length * nodeBits; shift < this._maxShift;
                     shift += nodeBits) {
                    _stack.push([_node, 0]);
                    _node = (<any[]>_node)[0];
                }

                ++_index;
                return {value: (<any[]>_node)[_index & nodeBitmask], done: false};
            }
        };
    }

    /**
     * Call a function for element in the collection.
     */
    forEach(fun:(x:T)=>void):Vector<T> {
        for (let i = 0; i < this._length; i++) {
            fun(this.internalGet(i));
        }
        return this;
    }

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     */
    map<U>(fun:(x:T)=>U): Vector<U> {
        const mutVec = Vector.emptyMutable<U>();
        for (let i = 0; i < this._length; i++) {
            mutVec.append(fun(this.internalGet(i)));
        }
        return mutVec.getVector();
    }

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    filter(fun:(x:T)=>boolean): Vector<T> {
        const mutVec = Vector.emptyMutable<T>();
        for (let i = 0; i < this._length; i++) {
            const value = this.internalGet(i);
            if (fun(value)) {
                mutVec.append(value);
            }
        }
        return mutVec.getVector();
    }

    /**
     * Apply the mapper function on every element of this collection.
     * The mapper function returns an Option; if the Option is a Some,
     * the value it contains is added to the result Collection, if it's
     * a None, the value is discarded.
     */
    mapOption<U>(mapper:(v:T)=>Option<U>): Vector<U> {
        let mutVec = Vector.emptyMutable<U>();
        for (let i = 0; i < this._length; i++) {
            const v = mapper(this.internalGet(i));
            if (v.isSome()) {
                mutVec.append(v.getOrThrow());
            }
        }
        return mutVec.getVector();
    }

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     */
    flatMap<U>(mapper:(v:T)=>Vector<U>): Vector<U> {
        const mutVec = Vector.emptyMutable<U>();
        for (let i = 0; i < this._length; i++) {
            mutVec.appendAll(mapper(this.internalGet(i)));
        }
        return mutVec.getVector();
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
        let acc = zero;
        for (let i = 0; i < this._length; i++) {
            acc = fn(acc, this.internalGet(i));
        }
        return acc;
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
    shuffle(): Vector<T> {
        return Vector.ofArray(SeqHelpers.shuffle(this.toArray()));
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
        let r = "Vector(";
        for (let i=0;i<this._length;i++) {
            if (i>0) {
                r += ", ";
            }
            r += SeqHelpers.toStringHelper(this.internalGet(i));
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
     *     Vector.of(1,2,3).mkString(", ")
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
     * also see [[Vector.sortOn]]
     */
    sortBy(compare: (v1:T,v2:T)=>Ordering): Vector<T> {
        return Vector.ofArray<T>(this.toArray().sort(compare));
    }

    /**
     * Give a function associating a number or a string with
     * elements from the collection, and the elements
     * are sorted according to that value.
     *
     * also see [[Vector.sortBy]]
     */
    sortOn(getKey: ((v:T)=>number)|((v:T)=>string)): Vector<T> {
        return <Vector<T>>SeqHelpers.sortOn<T>(this, getKey);
    }

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     */
    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V]): HashMap<K,V> {
        return this.foldLeft(HashMap.empty<K,V>(), (acc,cur) => {
            const converted = converter(cur);
            return acc.put(converted[0], converted[1]);
        });
    }

    /**
     * Convert to array.
     */
    toArray(): T[] {
        let out = new Array(this._length);
        for (let i = 0; i < this._length; i++) {
            out[i] = <T>this.internalGet(i);
        }
        return out;
        // alternative implementation, measured slower
        // (concat is creating a new array everytime) =>
        //
        // const nodes = this.getLeafNodes(this._length);
        // return [].concat.apply([], nodes).slice(0,this._length);
    };


    /**
     * @hidden
     */
    hasTrueEquality(): boolean {
        return SeqHelpers.seqHasTrueEquality<T>(this);
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
     */
    zip<U>(other: Iterable<U>): Vector<[T,U]> {
        let r = Vector.emptyMutable<[T,U]>();
        const thisIterator = this[Symbol.iterator]();
        const otherIterator = other[Symbol.iterator]();
        let thisCurItem = thisIterator.next();
        let otherCurItem = otherIterator.next();

        while (!thisCurItem.done && !otherCurItem.done) {
            r.append([thisCurItem.value, otherCurItem.value]);
            thisCurItem = thisIterator.next();
            otherCurItem = otherIterator.next();
        }
        return r.getVector();
    }

    /**
     * Reverse the collection. For instance:
     *
     *     Vector.of(1,2,3).reverse();
     *     => Vector.of(3,2,1)
     */
    reverse(): Vector<T> {
        const mutVec = Vector.emptyMutable<T>();
        for (let i=this._length-1;i>=0;i--) {
            mutVec.append(<T>this.internalGet(i));
        }
        return mutVec.getVector();
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
        for (let i=0;i<this._length;i++) {
            if (!predicate(<T>this.internalGet(i))) {
                return this.take(i);
            }
        }
        return this;
    }

    /**
     * Split the collection at a specific index.
     *
     *     Vector.of(1,2,3,4,5).splitAt(3)
     *     => [Vector.of(1,2,3), Vector.of(4,5)]
     */
    splitAt(index:number): [Vector<T>,Vector<T>] {
        return [this.take(index),this.drop(index)];
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
        if (n<0) {
            return this;
        }
        if (n>=this._length) {
            return Vector.empty<T>();
        }
        const mutVec = Vector.emptyMutable<T>();
        for (let i=n;i<this._length;i++) {
            const val = <T>this.internalGet(i);
            mutVec.append(val);
        }
        return mutVec.getVector();
    }

    /**
     * Return a new collection containing the first n
     * elements from this collection
     *
     *     Vector.of(1,2,3,4).take(2)
     *     => Vector.of(1,2)
     */
    take(n:number): Vector<T> {
        if (n<=0 || this._length === 0) {
            return Vector.empty<T>();
        }
        if (n >= this._length) {
            // not only an optimization. we want to wipe from
            // the first item after the current one, but in case
            // the length is a multiple of nodeSize, and we want
            // to take the full array length, that next item is
            // on a node which doesn't exist currently. Trying to
            // go there to wipe that item would fail, so that's also
            // a fix for  that.
            return this;
        }
        // note that index actually points to the
        // first item we want to wipe (item after
        // the last item we want to keep)
        const index = Math.min(n, this._length);

        let newVec = this.cloneVec();
        newVec._length = index;
        // next line will crash on empty vector
        let node = newVec._contents = (<any[]>this._contents).slice();
        let shift = this._maxShift;
        let underRoot = true;
        while (shift > 0) {
            const childIndex = (index >> shift) & nodeBitmask;
            if (underRoot && childIndex === 0) {
                // root killing, skip this node, we don't want
                // root nodes with only 1 child
                newVec._contents = node[childIndex].slice();
                newVec._maxShift -= nodeBits;
                node = <any[]>newVec._contents;
            } else {
                underRoot = false;
                for (let i=childIndex+1;i<nodeSize;i++) {
                    // remove pointers if present, to enable GC
                    node[i] = undefined;
                }
                node[childIndex] = node[childIndex].slice();
                node = node[childIndex];
            }
            shift -= nodeBits;
        }
        for (let i=(index & nodeBitmask);i<nodeSize;i++) {
            // remove pointers if present, to enable GC
            node[i] = undefined;
        }
        return newVec;
    }

    /**
     * Prepend an element at the beginning of the collection.
     */
    prepend(elt: T): Vector<T> {
        // TODO must be optimized!!
        return this.prependAll([elt]);
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
        if (n>=this._length) {
            return Vector.empty<T>();
        }
        return this.take(this._length-n);
    }

    /**
     * Get all the elements in the collection but the first one.
     * If the collection is empty, return None.
     */
    tail(): Option<Vector<T>> {
        return this._length > 0 ? Option.of(this.drop(1)) : Option.none<Vector<T>>();
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
     * also see [[Vector.minBy]]
     */
    minOn(getNumber: (v:T)=>number): Option<T> {
        return SeqHelpers.minOn(this, getNumber);
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
     * also see [[Vector.maxBy]]
     */
    maxOn(getNumber: (v:T)=>number): Option<T> {
        return SeqHelpers.maxOn(this, getNumber);
    }

    /**
     * Call the function you give for each element in the collection
     * and sum all the numbers, return that sum.
     * Will return 0 if the collection is empty.
     */
    sumOn(getNumber: (v:T)=>number): number {
        return SeqHelpers.sumOn(this, getNumber);
    }
}
