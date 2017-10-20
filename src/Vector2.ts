import { Option } from "./Option";

export class Vector2<T> {

    private static readonly nodeBits = 5;
    private static readonly nodeSize = (1<<exports.Vector2.nodeBits); // 32
    private static readonly nodeBitmask = exports.Vector2.nodeSize - 1;

    // _contents will be undefined only if length===0
    protected constructor(private _contents: any[]|undefined,
                          private length: number,
                          private _maxShift: number) {}

    static empty<T>(): Vector2<T> {
        return Vector2.ofArray([]);
    }

    static ofArray<T>(data: T[]): Vector2<T> {
        var nodes = [];
        var lowerNodes;
        var node;
        var i;
        var depth = 1;

        for (i = 0; i < data.length; i += Vector2.nodeSize) {
            node = data.slice(i, i + Vector2.nodeSize);
            nodes.push(node);
        }

        while(nodes.length > 1) {
            lowerNodes = nodes;
            nodes = [];
            for (i = 0; i < lowerNodes.length; i += Vector2.nodeSize) {
                node = lowerNodes.slice(i, i + Vector2.nodeSize);
                nodes.push(node);
            }
            depth++;
        }

        const _contents = nodes[0];
        const length = data ? data.length : 0;
        const _maxShift = _contents ? Vector2.nodeBits * (depth - 1) : 0;
        return new Vector2<T>(_contents, length, _maxShift);
    }

    fromArray(arrayLike:T[]): Vector2<T> {
        const len = arrayLike.length >>> 0;
        let vec = Vector2.empty<T>();
        for (var i = 0; i < len; i++) {
            vec = vec.push(arrayLike[i]);
        }
        return vec;
    }

    private cloneVec(): Vector2<T> {
        return new Vector2<T>(this._contents, this.length, this._maxShift);
    }

    internalGet(index: number): T|undefined {
        if (index >= 0 && index < this.length) {
            let shift = this._maxShift;
            let node = this._contents;
            if (!node) {
                return undefined;
            }
            while (shift > 0 && node) {
                node = node[(index >> shift) & Vector2.nodeBitmask];
                shift -= Vector2.nodeBits;
            }
            if (!node) {
                return undefined;
            }
            return node[index & Vector2.nodeBitmask];
        }
        return undefined;
    }

    get(index: number): Option<T> {
        return Option.of(this.internalGet(index));
    }

    // OK to call with index === vec.length (an append) as long as vector
    // length is not a (nonzero) power of the branching factor (32, 1024, ...).
    // Cannot be called on the empty vector!! It would crash
    private internalSet(index: number, val: T): Vector2<T> {
        var newVec = this.cloneVec();
        // next line will crash on empty vector
        var node = newVec._contents = (<any[]>this._contents).slice();
        var shift = this._maxShift;
        while (shift > 0) {
            var childIndex = (index >> shift) & Vector2.nodeBitmask;
            if (node[childIndex]) {
                node[childIndex] = node[childIndex].slice();
            } else {
                // Need to create new node. Can happen when appending element.
                node[childIndex] = new Array(Vector2.nodeSize);
            }
            node = node[childIndex];
            shift -= Vector2.nodeBits;
        }
        node[index & Vector2.nodeBitmask] = val;
        return newVec;
    }

    set(index: number, val: T): Vector2<T> {
        if (index >= this.length || index < 0) {
            throw new Error('setting past end of vector is not implemented');
        }
        return this.internalSet(index, val);
    }

    push(val:T): Vector2<T> {
        if (this.length === 0) {
            return Vector2.ofArray<T>([val]);
        } else if (this.length < (Vector2.nodeSize << this._maxShift)) {
            const newVec = this.internalSet(this.length, val);
            newVec.length++;
            return newVec;
        } else {
            // We'll need a new root node.
            const newVec = this.cloneVec();
            newVec.length++;
            newVec._maxShift += Vector2.nodeBits;
            let node:any[] = [];
            newVec._contents = [this._contents, node];
            var depth = newVec._maxShift / Vector2.nodeBits + 1;
            for (var i = 2; i < depth; i++) {
                const newNode: any[] = [];
                node.push(newNode);
                node = newNode;
            }
            node[0] = val;
            return newVec;
        }
    }

    pop(): Vector2<T> {
        var popped;

        if (this.length === 0) {
            return this;
        }
        if (this.length === 1) {
            return Vector2.empty<T>();
        }

        // If the last leaf node will remain non-empty after popping,
        // simply set last element to null (to allow GC).
        if ((this.length & Vector2.nodeBitmask) !== 1) {
            popped = this.internalSet(this.length - 1, null);
        }
        // If the length is a power of the branching factor plus one,
        // reduce the tree's depth and install the root's first child as
        // the new root.
        else if (this.length - 1 === Vector2.nodeSize << (this._maxShift - Vector2.nodeBits)) {
            popped = this.cloneVec();
            popped._contents = (<any[]>this._contents)[0]; // length>0 => _contents!==undefined
            popped._maxShift = this._maxShift - Vector2.nodeBits;
        }
        // Otherwise, the root stays the same but we remove a leaf node.
        else {
            popped = this.cloneVec();

            // we know the vector is not empty, there is a if at the top
            // of the function => ok to cast to any[]
            var node = popped._contents = (<any[]>popped._contents).slice();
            var shift = this._maxShift;
            var removedIndex = this.length - 1;

            while (shift > Vector2.nodeBits) { // i.e., Until we get to lowest non-leaf node.
                var localIndex = (removedIndex >> shift) & Vector2.nodeBitmask;
                node = node[localIndex] = node[localIndex].slice();
                shift -= Vector2.nodeBits;
            }
            node[(removedIndex >> shift) & Vector2.nodeBitmask] = null;
        }
        popped.length--;
        return popped;
    }

    // var ImmutableVectorSlice = require('./ImmutableVectorSlice');

    slice(begin: number, end: number): Vector2<T> {
        if (typeof end !== 'number' || end > this.length) end = this.length;
        if (typeof begin !== 'number' || begin < 0) begin = 0;
        if (end < begin) end = begin;

        if (begin === 0 && end === this.length) {
            return this;
        }

        return new ImmutableVectorSlice(this, begin, end);
    }

    // var ImmutableVectorIterator = require('./ImmutableVectorIterator');

    // Non-standard API. Returns an iterator compatible with the ES6 draft,
    // but we can't (apparently) make a custom object iterable without the
    // new Symbol object and new ES6 syntax :(
    iterator() {
        return new ImmutableVectorIterator(this);
    }

    forEach(fun:(x:T)=>void):Vector2<T> {
        var iter = this.iterator();
        var step;
        var index = 0;
        while (!(step = iter.next()).done) {
            fun.call(step.value);
        }
        return this;
    }

    map<U>(fun:(x:T)=>U): Vector2<U> {
        var iter = this.iterator();
        var out = Vector2.empty<U>();
        var step;
        var index = 0;
        while (!(step = iter.next()).done) {
            out = out.push(fun.call(step.value));
        }
        return out;
    }

    filter(fun:(x:T)=>boolean): Vector2<T> {
        let iter = this.iterator();
        let out = Vector2.empty<T>();
        let step;
        let index = 0;
        while (!(step = iter.next()).done) {
            if (fun.call(step.value)) {
                out = out.push(step.value);
            }
        }
        return out;
    }

    reduce<U>(fun:(soFar:U,cur:T)=>U, init:U):U {
        let iter = this.iterator();
        let step;
        let index = 0;
        let acc = init;
        while (!(step = iter.next()).done) {
            acc = fun(acc, step.value);
        }
        return acc;
    }

    // indexOf(element:T, fromIndex:number): number {
    //     if (fromIndex === undefined) {
    //         fromIndex = 0;
    //     } else {
    //         fromIndex >>>= 0;
    //     }
    //     var isImmutableCollection = ImmutableVector.isImmutableVector(element);
    //     for (var index = fromIndex; index < this.length; index++) {
    //         var val = this.get(index);
    //         if (isImmutableCollection) {
    //             if (element.equals(this.get(index))) return index;
    //         } else {
    //             if (element === this.internalGet(index)) return index;
    //         }
    //     }
    //     return -1;
    // }

    // // TODO: See if equals and toArray are faster using a traversal.

    // equals(other:Vector2<T>): boolean {
    //     var val;
    //     if (this.length !== other.length) return false;
    //     for (var i = 0; i < this.length; i++) {
    //         val = this.get(i);
    //         if (ImmutableVector.isImmutableVector(val)) {
    //             if (!val.equals(other.get(i))) return false;
    //         } else {
    //             if (val !== other.get(i)) return false;
    //         }
    //     }
    //     return true;
    // }

    toArray(): T[] {
        var out = [];
        for (var i = 0; i < this.length; i++) {
            out.push(<T>this.internalGet(i));
        }
        return out;
    };
}
