import { Option } from "./Option";
import { HashMap } from "./HashMap";
import { HashSet } from "./HashSet";
import { IMap } from "./IMap";
import { Stream } from "./Stream";
import { Seq } from "./Seq";
import { WithEquality, areEqual, getHashCode,
         Ordering, ToOrderable } from "./Comparison";
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
 * @hidden
 * this is accessible only within the library because index.ts
 * doesn't export it.
 */
export interface MutableVector<T> {
    append:(x:T)=>void;
    appendAll:(x:Iterable<T>)=>void;
    getVector(): Vector<T>;
    internalGet(idx:number): T|undefined;
}

// We store a bit field in list. From right to left, the first five
// bits are suffix length, the next five are prefix length and the
// rest is depth. The functions below are for working with the bits in
// a sane way.

const affixBits = 6;
const affixMask = 0b111111;

// https://github.com/Microsoft/TypeScript/issues/15807#issuecomment-301196459
// is this even doing anything? check it.
type DepthHeadTailLength = number & {_type: "__DEPTHHEADTAILLENGTH__"};

function dhtlInit(depth: number, headLength: number, tailLength: number): DepthHeadTailLength {
    return <any>((depth << (affixBits * 2)) | (headLength << affixBits) | tailLength);
}

function dhtlIncrementDepth(dhtl: DepthHeadTailLength): DepthHeadTailLength {
    return <any>(dhtl + (1 << (affixBits * 2)));
}

function dhtlDecrementDepth(dhtl: DepthHeadTailLength): DepthHeadTailLength {
    return <any>(dhtl - (1 << (affixBits * 2)));
}

function dhtlSetTailLength(dhtl: DepthHeadTailLength, length: number): DepthHeadTailLength {
    return <any>(length | (dhtl & ~affixMask));
}

function dhtlSetHeadLength(dhtl: DepthHeadTailLength, length: number): DepthHeadTailLength {
    return <any>((length << affixBits) | (dhtl & ~(affixMask << affixBits)));
}

function dhtlIncrementTailLength(dhtl: DepthHeadTailLength): DepthHeadTailLength {
    return <any>(dhtl+1);
}

function dhtlIncrementHeadLength(dhtl: DepthHeadTailLength): DepthHeadTailLength {
    return <any>(dhtl+(1 << affixBits));
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
    // _trie will be undefined only if length===0
    // we want to fill in the contents in this order:
    // 1. _head
    // 2. _tail
    // 3. _trie
    // the reason being that access to _head and _tail are faster.
    protected constructor(private _trie: any[]|undefined,
                          private _length: number,
                          private _depthHeadTailLength: DepthHeadTailLength,
                          private _head: T[],
                          private _tail: T[]) {}

    getDepth(): number {
        return this._depthHeadTailLength >> (affixBits * 2);
    }

    private getShift(): number {
        return nodeBits * (this._depthHeadTailLength >> (affixBits * 2));
    }

    private getHeadLength(): number {
        return (this._depthHeadTailLength >> affixBits) & affixMask;
    }

    private getTailLength(): number {
        return this._depthHeadTailLength & affixMask;
    }

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
            const tail = [];
            for (let idx=0;i+idx<data.length;idx++) {
                tail.push(data[i+idx]);
            }
            nodes.push(tail);
        }

        return Vector.fromLeafNodes(nodes, data.length);
    }

    /**
     * Build a new vector from the leaf nodes containing data.
     */
    private static fromLeafNodes<T>(nodesHeadTail: T[][], length: number): Vector<T> {
        let nodes: T[][], head: T[], tail: T[];
        if (nodesHeadTail.length >= 3) {
            nodes = nodesHeadTail.slice(1, -1);
            head = nodesHeadTail[0];
            tail = nodesHeadTail[nodesHeadTail.length - 1];
        } else if (nodesHeadTail.length === 2) {
            nodes = [];
            head = nodesHeadTail[0];
            tail = nodesHeadTail[1];
        } else if (nodesHeadTail.length === 1) {
            nodes = [];
            head = [];
            tail = nodesHeadTail[0];
        } else {
            nodes = [];
            head = [];
            tail = [];
        }

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

        const _trie = nodes[0];
        const _depth = _trie ? depth - 1 : 0;
        return new Vector<T>(_trie, length,
                             dhtlInit(_depth, head.length, tail.length),
                             head, tail);
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
        let vecShift = vec.getShift();
        let headLength = vec.getHeadLength();
        let tailLength = vec.getTailLength();
        const newTail = new Array(nodeSize);
        for (let i=0;i<tailLength;i++) {
            newTail[i] = vec._tail[i];
        }
        vec._tail = newTail;
        const mergeTailNewRootNode = () => {
            let node:any[] = vec._tail;
            for (let i = 2*nodeBits; i < vecShift; i+=nodeBits) {
                const newNode = [node];
                node = newNode;
            }
            vec._trie = [vec._trie, node];
            vecShift += nodeBits;
        }
        const append = (val:T):void => {
            if (tailLength < nodeSize) {
                vec._tail[tailLength] = val;
                ++tailLength;
                ++vec._length;
            } else {
                // the tail is full
                const effectiveLength = vec._length - headLength - tailLength;
                if (vecShift === 0) {
                    vec._trie = [vec._tail];
                    vecShift += nodeBits;
                } else if (effectiveLength < (nodeSize << vecShift)) {
                    // no need to add a new root node
                    var index = effectiveLength;
                    let node = vec._trie || (vec._trie = new Array(nodeSize));
                    let shift = vecShift;
                    while (shift > nodeBits) {
                        let childIndex = (index >> shift) & nodeBitmask;
                        if (!node[childIndex]) {
                            // Need to create new node. Can happen when appending element.
                            node[childIndex] = new Array(nodeSize);
                        }
                        node = node[childIndex];
                        shift -= nodeBits;
                    }
                    node[(index >> shift) & nodeBitmask] = vec._tail;
                } else {
                    // We'll need a new root node.
                    mergeTailNewRootNode();
                }
                vec._tail = new Array(nodeSize);
                vec._tail[0] = val;
                tailLength = 1;
                ++vec._length;
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
            internalGet: (idx:number) => {
                vec._depthHeadTailLength = dhtlInit(vecShift/nodeBits, headLength, tailLength);
                return vec.internalGet(idx);
            },
            getVector: () => {
                vec._depthHeadTailLength = dhtlInit(vecShift/nodeBits, headLength, tailLength);
                vec._tail = vec._tail.slice(0, tailLength);
                return vec;
            }
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
            r.append(nextVal.get()[0]);
            nextVal = fn(nextVal.get()[1]);
        }
        return r.getVector();
    }

    private cloneVec(): Vector<T> {
        return new Vector<T>(this._trie, this._length,
                             this._depthHeadTailLength, this._head, this._tail);
    }

    // WILL blow up if you give out of bounds index!
    // it's the caller's responsability to check bounds.
    private internalGet(index: number): T {
        const headLength = this.getHeadLength();
        if (index < headLength) {
            return this._head[index];
        }

        const tailStart = this._length - this.getTailLength();
        if (index >= tailStart) {
            return this._tail[index - tailStart];
        }

        return this.trieGet(index - headLength, this.getShift())
    }

    private trieGet(correctedIndex:number, shift: number): T {
        let node = this._trie;
        while (shift > 0) {
            node = (<any>node)[(correctedIndex >> shift) & nodeBitmask];
            shift -= nodeBits;
        }
        return (<any>node)[correctedIndex & nodeBitmask];
    }

    private trieGetNode(correctedIndex:number, shift: number): T[] {
        let node = this._trie;
        while (shift > 0) {
            node = (<any>node)[(correctedIndex >> shift) & nodeBitmask];
            shift -= nodeBits;
        }
        return <T[]>node;
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
    private internalSet(rawIndex: number, val: T|null): Vector<T> {
        const newVec = this.cloneVec();
        if (rawIndex < this.getHeadLength()) {
            newVec._head = this._head.slice();
            newVec._head[rawIndex] = <T>val;
            return newVec;
        }
        if (rawIndex >= this._length - this.getTailLength()) {
            newVec._tail = this._tail.slice();
            newVec._tail[rawIndex - (this._length - this.getTailLength())] = <T>val;
            return newVec;
        }
        // next line will crash on empty vector
        let node = newVec._trie = (<any[]>this._trie).slice();
        let shift = this.getShift();
        const index = rawIndex - this.getHeadLength();
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
        if (this._tail.length !== this.getTailLength()) {
            this._tail = this._tail.slice(0, this.getTailLength());
        }

        if (this._tail.length < nodeSize) {
            this._tail.push(val);
            return new Vector(this._trie, this._length+1, dhtlIncrementTailLength(this._depthHeadTailLength), this._head, this._tail);
        } else {
            // the tail is full
            const withTailMerged = this.appendNode(this._tail);
            withTailMerged._tail = [val];
            withTailMerged._depthHeadTailLength = dhtlSetTailLength(withTailMerged._depthHeadTailLength, 1);
            ++withTailMerged._length;
            return withTailMerged;
        }
    }

    // does not update the vector _length
    private appendNode(val:T[]): Vector<T> {
        const newVec = this.cloneVec();
        const effectiveLength = this._length - this.getHeadLength() - this.getTailLength();
        if (!this._trie) {
            newVec._trie = val;
            return newVec;
        } else if (effectiveLength < (nodeSize << this.getShift())) { // here i know the this._length is a multiple of nodeSize so < is enough
            let node;
            if (this._trie) {
                node = newVec._trie = (<any[]>this._trie).slice();
            } else {
                node = newVec._trie = new Array(nodeSize);
                newVec._depthHeadTailLength = dhtlIncrementDepth(newVec._depthHeadTailLength);
            }
            let shift = this.getShift();
            while (shift > nodeBits) {
                let childIndex = (effectiveLength >> shift) & nodeBitmask;
                if (node[childIndex]) {
                    node[childIndex] = node[childIndex].slice();
                } else {
                    // Need to create new node. Can happen when appending element.
                    node[childIndex] = new Array(nodeSize);
                }
                node = node[childIndex];
                shift -= nodeBits
            }
            node[(effectiveLength >> shift) & nodeBitmask] = val;
            return newVec;
        } else {
            // We'll need a new root node.
            return Vector.setupNewRootNode(this, val);
        }
    }

    private static setupNewRootNode<T>(vec: Vector<T>, nodeToAdd:T[]): Vector<T> {
        const newVec = vec.cloneVec();
        newVec._depthHeadTailLength = dhtlIncrementDepth(vec._depthHeadTailLength);
        let depth = newVec.getDepth();
        let node:any[] = nodeToAdd;
        for (let i = 2; i < depth; i++) {
            const newNode = [node];
            node = newNode;
        }
        newVec._trie = [vec._trie, node];
        return newVec;
    }

    /**
     * Append multiple elements at the end of the collection.
     * Note that arrays are also iterables.
     */
    appendAll(elts: Iterable<T>): Vector<T> {
        if (Number.isInteger((<any>elts)._depthHeadTailLength) && (<any>elts).sortOn) {
            // elts is a Vector too!
            if ((<Vector<T>>elts).isEmpty()) {
                return this;
            }
            return this.appendAllArrays(
                { [Symbol.iterator]: () => (<Vector<T>>elts).iterateLeafNodes() },
                (<Vector<T>>elts).length());
        }
        if (Array.isArray(elts)) {
            return this.appendAllArrays([elts], elts.length);
        }
        return this.appendAllIterable(elts);
    }

    private static iteratorPrepend<T>(it: Iterator<T>, toPrepend: T): Iterator<T> {
        let gaveFirst = false;
        return {
            next: () => {
                const v = gaveFirst ?
                    it.next() :
                    { value: toPrepend, done: false};
                gaveFirst = true;
                return v;
            }
        };
    }

    private appendAllArrays(_arrays: Iterable<T[]>, length: number): Vector<T> {
        if (length === 0) {
            return this;
        }
        // first need to create a new Vector through the first append
        // call, and then we can mutate that new Vector, otherwise
        // we'll mutate the receiver which is a big no-no!!
        // also, make sure 'baseVec' is never empty as the rest
        // of the code won't know what do with an empty array
        const _it = _arrays[Symbol.iterator]();
        const firstArray = _it.next().value; // I know the iterable of arrays is not empty
        let [baseVec, it, copied] = this.isEmpty()
            ? [Vector.ofArray(firstArray.slice(0, Math.min(length, firstArray.length))),
               _it,
               Math.min(length, firstArray.length)]
            : [this.append(firstArray[0]),
               Vector.iteratorPrepend(_it, firstArray.slice(1)),
               1];

        // first finish the tail
        const tail = baseVec._tail;
        let idxInNode = baseVec.getTailLength();
        let curInArrayIdx = 0;
        let curArray = it.next().value;
        while (copied < length && idxInNode > 0 && idxInNode < nodeSize) {
            tail[idxInNode++] = curArray[curInArrayIdx++];
            ++copied;
            ++baseVec._length;
            baseVec._depthHeadTailLength = dhtlIncrementTailLength(baseVec._depthHeadTailLength);
            if (curInArrayIdx === curArray.length) {
                curInArrayIdx = 0;
                curArray = it.next().value;
            }
        }
        if (copied === length) {
            // already done, didn't need to add new nodes!
            return baseVec;
        }

        // right now the tail should be full, merge it
        // in the vector
        baseVec = baseVec.appendNode(baseVec._tail);
        baseVec._depthHeadTailLength = dhtlSetTailLength(baseVec._depthHeadTailLength, 0);

        // we're now at node boundary, add remaining array items
        // by adding nodes one by one
        let curNewVec = new Array(nodeSize);
        idxInNode = 0;
        while (copied < length && idxInNode < nodeSize) {
            curNewVec[idxInNode++] = curArray[curInArrayIdx++];
            ++copied;
            if (idxInNode === nodeSize) {
                baseVec = baseVec.appendNode(curNewVec);
                baseVec._length += nodeSize;
                idxInNode = 0;
                curNewVec = new Array(nodeSize);
            }
            if (curInArrayIdx === curArray.length) {
                curInArrayIdx = 0;
                curArray = it.next().value;
            }
        }
        baseVec._tail = curNewVec.slice(0, idxInNode);
        baseVec._length += baseVec._tail.length;
        baseVec._depthHeadTailLength = dhtlInit(
            baseVec.getDepth(), baseVec.getHeadLength(), idxInNode);
        return baseVec;
    }

    /**
     * Append multiple elements at the end of the collection.
     * Note that arrays are also iterables.
     */
    private appendAllIterable(elts: Iterable<T>): Vector<T> {
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
        if (this._length === 0) {
            return this;
        }
        if (this._length === 1) {
            return Vector.empty<T>();
        }

        const popped = this.cloneVec();
        if (this.getTailLength() > 1) {
            popped._depthHeadTailLength = dhtlSetTailLength(
                this._depthHeadTailLength, this.getTailLength()-1);
            popped._length--;
            return popped;
        }

        // the tail has only 1 element. must remove the last
        // node & set it as the tail.
        popped._depthHeadTailLength = dhtlSetTailLength(this._depthHeadTailLength, nodeSize);

        if (popped._trie) {
            popped._tail = this.getTrieLastNode().slice();

            if (popped.getHeadLength() + popped.getTailLength() === popped._length -1) {
                popped._trie = undefined;
            } else {
                // If the length is a power of the branching factor plus one,
                // reduce the tree's depth and install the root's first child as
                // the new root.
                if (this._length - 1 === nodeSize << (this.getShift() - nodeBits)) {
                    popped._trie = (<any[]>this._trie)[0]; // length>0 => _trie!==undefined
                    popped._depthHeadTailLength = dhtlDecrementDepth(this._depthHeadTailLength);
                }
                // Otherwise, the root stays the same but we remove a leaf node.
                else {
                    // we know the vector is not empty, there is a if at the top
                    // of the function => ok to cast to any[]
                    let node = popped._trie = (<any[]>popped._trie).slice();
                    let shift = this.getShift();
                    let removedIndex = this._length - 1;

                    while (shift > nodeBits) { // i.e., Until we get to lowest non-leaf node.
                        let localIndex = (removedIndex >> shift) & nodeBitmask;
                        node = node[localIndex] = node[localIndex].slice();
                        shift -= nodeBits;
                    }
                    node[(removedIndex >> shift) & nodeBitmask] = null;
                }
            }
        } else {
            // no contents but I know the length is >1
            // => the rest is in the head.
            popped._tail = popped._head;
            popped._depthHeadTailLength = dhtlSetHeadLength(popped._depthHeadTailLength, 0);
            popped._head = [];
        }
        popped._length--;
        return popped;
    }

    // will blow on an empty vector
    private getTrieLastNode(): T[] {
        let shift = this.getShift();
        let node = this._trie;
        const trieLength = this._length - this.getHeadLength() - this.getTailLength();
        while (shift > 0) {
            node = (<any>node)[(trieLength >> shift) & nodeBitmask];
            shift -= nodeBits;
        }
        return <any[]>node;
    }

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    dropWhile(predicate:(x:T)=>boolean): Vector<T> {
        for (let i=0;i<this._length-1;i++) {
            if (!predicate(<T>this.internalGet(i))) {
                return this.drop(i);
            }
        }
        return Vector.empty<T>();
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
    partition<U extends T>(predicate:(v:T)=>v is U): [Vector<U>,Vector<Exclude<T,U>>];
    partition(predicate:(x:T)=>boolean): [Vector<T>,Vector<T>];
    partition(predicate:(v:T)=>boolean): [Vector<T>,Vector<T>] {
        const fst = Vector.emptyMutable<T>();
        const snd = Vector.emptyMutable<T>();
        for (let i=0;i<this._length;i++) {
            const val = this.internalGet(i);
            if (predicate(val)) {
                fst.append(val);
            } else {
                snd.append(val);
            }
        }
        return [fst.getVector(), snd.getVector()];
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

    // TODO lots of duplication between iterateLeafNodes & [Symbol.iterator],
    // but don't know how merge some code while keeping performance.
    [Symbol.iterator](): Iterator<T> {
        let _index = -1;
        let _stack: any[] = [];
        let _node = this._trie;
        const sz = nodeSize - 1;
        const headLength = this.getHeadLength();
        const tailLength = this.getTailLength();
        return {
            next: () => {
                // Iterator state:
                //  _node: "Current" leaf node, meaning the one we returned a value from
                //         on the previous call.
                //  _index: Index (within entire vector, not node) of value returned last
                //          time.
                //  _stack: Path we traveled to current node, as [node, local index]
                //          pairs, starting from root node, not including leaf.

                if (_index < headLength - 1) {
                    return {done: false, value: this._head[++_index]};
                }
                if (_index === this._length - 1) {
                    return {done: true, value: <any>undefined};
                }
                if (_index >= this._length - tailLength - 1) {
                    return {done: false, value: this._tail[(++_index) - (this._length - tailLength)]};
                }

                if (_index - headLength > 0 && ((_index - headLength) & nodeBitmask) === sz) {
                    // Using the stack, go back up the tree, stopping when we reach a node
                    // whose children we haven't fully iterated over.
                    let step;
                    while ((step = _stack.pop())[1] === sz) ;
                    step[1]++;
                    _stack.push(step);
                    _node = step[0][step[1]];
                }

                for (let shift = _stack.length * nodeBits; shift < this.getShift();
                     shift += nodeBits) {
                    _stack.push([_node, 0]);
                    _node = (<any[]>_node)[0];
                }

                ++_index;
                return {value: (<any[]>_node)[(_index - headLength) & nodeBitmask], done: false};
            }
        };
    }

    // TODO lots of duplication between iterateLeafNodes & [Symbol.iterator],
    // but don't know how merge some code while keeping performance.
    private iterateLeafNodes(): Iterator<T[]> {
        let _index = -1;
        let _stack: any[] = [];
        let _node = this._trie;
        const sz = nodeSize - 1;
        const headLength = this.getHeadLength();
        const tailLength = this.getTailLength();
        return {
            next: () => {
                // Iterator state:
                //  _node: "Current" leaf node, meaning the one we returned a value from
                //         on the previous call.
                //  _index: Index (within entire vector, not node) of value returned last
                //          time.
                //  _stack: Path we traveled to current node, as [node, local index]
                //          pairs, starting from root node, not including leaf.

                if (_index < headLength - 1) {
                    _index = headLength;
                    return {done: false, value: this._head};
                }
                if (_index === this._length - 1) {
                    return {done: true, value: <any>undefined};
                }
                if (_index >= this._length - tailLength - 1) {
                    return {done: true, value: this._tail};
                }

                if (_index - headLength > 0 && ((_index - headLength) & nodeBitmask) === sz) {
                    // Using the stack, go back up the tree, stopping when we reach a node
                    // whose children we haven't fully iterated over.
                    let step;
                    while ((step = _stack.pop())[1] === sz) ;
                    step[1]++;
                    _stack.push(step);
                    _node = step[0][step[1]];
                }

                for (let shift = _stack.length * nodeBits; shift < this.getShift();
                     shift += nodeBits) {
                    _stack.push([_node, 0]);
                    _node = (<any[]>_node)[0];
                }

                _index += nodeSize;
                return {value: _node, done: false};
            }
        };
    }

    /**
     * Call a function for element in the collection.
     */
    forEach(fun:(x:T)=>void):Vector<T> {
        const headLength = this.getHeadLength();
        const tailLength = this.getTailLength();
        let i;
        for (i = 0; i < headLength; i++) {
            fun(this._head[i]);
        }
        const shift = this.getShift();
        for (i = 0; i < this._length-headLength-tailLength; i++) {
            fun(this.trieGet(i, shift));
        }
        for (i = 0; i < tailLength; i++) {
            fun(this._tail[i]);
        }
        return this;
    }

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     */
    map<U>(fun:(x:T)=>U): Vector<U> {
        const leafNodes = this.getLeafNodes(
            this._length - this.getHeadLength() - this.getTailLength());
        const newLeafNodes: U[][] = [];
        newLeafNodes.length = leafNodes.length;
        for (let i=0;i<leafNodes.length;i++) {
            // TODO try and just use Array.map here, benchmark it
            newLeafNodes[i] = [];
            newLeafNodes[i].length = nodeSize;
            const curLeafNode = leafNodes[i];
            const curNewLeafNode = newLeafNodes[i];
            for (let j=0;j<nodeSize;j++) {
                curNewLeafNode[j] = fun(curLeafNode[j]);
            }
        }
        newLeafNodes.unshift(this._head.map(fun));
        newLeafNodes.push(this._tail.map(fun));
        return Vector.fromLeafNodes(newLeafNodes, this._length);
    }

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    filter<U extends T>(fun:(v:T)=>v is U): Vector<U>;
    filter(fun:(v:T)=>boolean): Vector<T>;
    filter(fun:(v:T)=>boolean): Vector<T> {
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
                mutVec.append(v.get());
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
        const headLength = this.getHeadLength();
        const tailLength = this.getTailLength();
        let i;
        for (i = 0; i < headLength; i++) {
            acc = fn(acc, this._head[i]);
        }
        const shift = this.getShift();
        for (i = 0; i < this._length-headLength-tailLength; i+=nodeSize) {
            const node = this.trieGetNode(i, shift);
            for (let j = 0; j < nodeSize; j++) {
                acc = fn(acc, node[j]);
            }
        }
        for (i = 0; i < tailLength; i++) {
            acc = fn(acc, this._tail[i]);
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
        let acc = zero;
        const headLength = this.getHeadLength();
        const tailLength = this.getTailLength();
        let i;
        for (i = tailLength-1; i >= 0; i--) {
            acc = fn(this._tail[i], acc);
        }
        const shift = this.getShift();
        for (i = this._length-headLength-tailLength-1; i>=0; i-=nodeSize) {
            const node = this.trieGetNode(i, shift);
            for (let j = nodeSize-1; j >= 0; j--) {
                acc = fn(node[j], acc);
            }
        }
        for (i = headLength-1; i >= 0; i--) {
            acc = fn(this._head[i], acc);
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
        if (!other || (other._depthHeadTailLength === undefined)) {
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
            r += SeqHelpers.toStringHelper(<T>this.internalGet(i), {quoteStrings:false});
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
        const out = new Array(this._length);
        let i=0;
        this.forEach(v => out[i++] = v);
        return out;
        // alternative implementation, measured slower
        // (concat is creating a new array everytime) =>
        //
        // const nodes = this.getLeafNodes(this._length);
        // return [].concat.apply([], nodes).slice(0,this._length);
    }

    /**
     * get the leaf nodes, which contain the data, from the vector.
     * return only the leaf nodes containing the first n items from the vector.
     * (give n=_length to get all the data)
     */
    private getLeafNodes(_n:number): T[][] {
        if (_n<=0) {
            return [];
        }
        const n = Math.min(
            _n,
            this._length - this.getHeadLength() - this.getTailLength());
        let _index = 0;
        let _stack: any[] = [];
        let _node = this._trie;
        let result:T[][] = new Array(Math.floor(n/nodeSize));
        if (!_node) {
            // empty trie
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

            let depth;
            for (depth=_stack.length; depth<this.getDepth(); ++depth) {
                _stack.push([_node, 0]);
                _node = (<any[]>_node)[0];
            }

            result[_index++] = <any>_node;
        }
        return result;
    }

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
        const headLength = this.getHeadLength();
        if (n <= headLength) {
            return new Vector(
                this._trie, this._length-n,
                dhtlSetHeadLength(this._depthHeadTailLength, headLength-n),
                this._head.slice(n), this._tail);
        }
        const tailLength = this.getTailLength();
        if (n >= this._length - tailLength) {
            // need to drop the whole head, the trie and possibly
            // part of the tail.
            return new Vector(
                undefined, this._length-n,
                dhtlInit(0, 0, this._length - n),
                [], this._tail.slice(n));
        }
        // need to drop the whole head and modify the trie...
        const indexInTrie = n - headLength;
        const newVec = this.cloneVec();
        newVec._length = newVec._length - n;
        let node = newVec._trie = (<any[]>this._trie).slice();
        let shift = this.getShift();
        let underRoot = true;
        while (shift > nodeBits) {
            const childIndex = (indexInTrie >> shift) & nodeBitmask;
            if (underRoot && childIndex === node.length-1) {
                // root killing, skip this node, we don't want
                // root nodes with only 1 child
                newVec._trie = node[childIndex].slice();
                newVec._depthHeadTailLength = dhtlDecrementDepth(newVec._depthHeadTailLength);
                node = <any[]>newVec._trie;
            } else {
                underRoot = false;
                node[childIndex] = node[childIndex].slice();
                node.splice(0, childIndex); // remove previous pointers
                node = node[0];
            }
            shift -= nodeBits;
        }

        // we are now at the parent of the nodes containing the data.
        // the index at which we want to cut is probably not a multiple
        // of nodeSize, and we don't want to have trie nodes with less
        // than nodeSize items. So if we must split the node, we'll put
        // the bit that must be kept in the vector _head.
        const childIndex = (indexInTrie >> shift) & nodeBitmask;
        const child = node[childIndex];
        // remove previous pointers and the child
        node.splice(0, childIndex+1);
        // remove previous values in the node & store it in the head.
        newVec._head = child.slice(indexInTrie & nodeBitmask);

        newVec._depthHeadTailLength = dhtlSetHeadLength(
            newVec._depthHeadTailLength, newVec._head.length);
        return newVec;
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

        const newVec = this.cloneVec();
        newVec._length = index;
        const thisHeadLength = this.getHeadLength();
        const thisTailLength = this.getTailLength();
        if (index < thisHeadLength) {
            newVec._depthHeadTailLength = dhtlInit(0, index, 0);
            newVec._head = this._head.slice(0, index); // wouldn't have to copy, but remove elts to enable GC
            newVec._tail = [];
            return newVec;
        }
        if (this._trie) {
            const indexInTrie = index - thisHeadLength;
            if (indexInTrie < this._length - thisHeadLength - thisTailLength) {
                let node = newVec._trie = (<any[]>this._trie).slice();
                let shift = this.getShift();
                let underRoot = true;
                while (shift > nodeBits) {
                    const childIndex = (indexInTrie >> shift) & nodeBitmask;
                    if (underRoot && childIndex === 0) {
                        // root killing, skip this node, we don't want
                        // root nodes with only 1 child
                        newVec._trie = node[childIndex].slice();
                        newVec._depthHeadTailLength = dhtlDecrementDepth(newVec._depthHeadTailLength);
                        node = <any[]>newVec._trie;
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
                // the last node which should be truncated will be taken
                // out of the trie and moved to be the tail of the new vector.
                const childIndex = (indexInTrie >> shift) & nodeBitmask;
                newVec._tail = (shift === 0 ? node : node[childIndex]).slice(0, index & nodeBitmask);
                newVec._depthHeadTailLength = dhtlSetTailLength(newVec._depthHeadTailLength, newVec._tail.length);

                if (newVec.getHeadLength() + newVec.getTailLength() === newVec._length) {
                    newVec._trie = undefined;
                } else {
                    node[childIndex] = undefined;
                }
            }
        }
        if (index >= this._length - thisTailLength) {
            const newTailLength = index - (this._length - thisTailLength);
            newVec._depthHeadTailLength = dhtlSetTailLength(this._depthHeadTailLength, newTailLength);
            newVec._tail = this._tail.slice(0, newTailLength); // wouldn't have to copy, but remove elts to enable GC
        } else if (index - newVec.getHeadLength() % nodeSize === 0) {
            // wipe the tail entirely
            newVec._depthHeadTailLength = dhtlSetTailLength(newVec._depthHeadTailLength, 0);
            newVec._tail = [];
        }
        return newVec;
    }

    /**
     * Prepend an element at the beginning of the collection.
     */
    prepend(elt: T): Vector<T> {
        if (this._head.length !== this.getHeadLength()) {
            this._head = this._head.slice(0, this.getHeadLength());
        }

        if (this._head.length < nodeSize) {
            this._head.unshift(elt);
            return new Vector(this._trie, this._length+1, dhtlIncrementHeadLength(this._depthHeadTailLength), this._head, this._tail);
        } else {
            // the head is full
            const withTailMerged = this.prependNode(this._tail, this._length);
            withTailMerged._head = [elt];
            withTailMerged._depthHeadTailLength = dhtlSetHeadLength(withTailMerged._depthHeadTailLength, 1);
            ++withTailMerged._length;
            return withTailMerged;
        }
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     */
    prependAll(elts: Iterable<T>): Vector<T> {
        // TODO prepend in a loop is probably faster, measure it
        return Vector.ofIterable(elts).appendAll(this);
    }

    private prependNode(val:T[], length: number): Vector<T> {
        const leafNodes = this.getLeafNodes(this._length);
        leafNodes.unshift(this._head.slice(0, this.getHeadLength()));
        leafNodes.unshift(val);
        leafNodes.push(this._tail.slice(0, this.getTailLength()));
        return Vector.fromLeafNodes(leafNodes, this._length);
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
     * Returns a new collection, discarding the last elements
     * until one element fails the predicate. All elements
     * before that point are retained.
     */
    dropRightWhile(predicate:(x:T)=>boolean): Vector<T> {
        let i=this._length-1;
        for (;i>=0;i--) {
            if (!predicate(<T>this.internalGet(i))) {
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
     * also see [[Vector.maxBy]]
     */
    maxOn(getOrderable: ToOrderable<T>): Option<T> {
        return SeqHelpers.maxOn(this, getOrderable);
    }

    /**
     * Call the function you give for each element in the collection
     * and sum all the numbers, return that sum.
     * Will return 0 if the collection is empty.
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
        const mutVec = Vector.emptyMutable<U>();
        mutVec.append(init);
        let cur = init;
        for (let i = 0; i < this._length; i++) {
            cur = fn(cur, this.internalGet(i));
            mutVec.append(cur);
        }
        return mutVec.getVector();
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
        for (let i = this._length-1; i>=0; i--) {
            cur = fn(this.internalGet(i), cur);
            r.unshift(cur);
        }
        return Vector.ofIterable(r);
    }
}

/**
 * even though emptyMutable is private, we can in fact read it
 * https://stackoverflow.com/a/12827621/516188
 * this is accessible only within the library because index.ts
 * doesn't export it.
 * @hidden
 */
export const vectorEmptyMutable: <T> ()=>MutableVector<T> = (<any>Vector).emptyMutable;
