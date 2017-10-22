import { Option } from "./Option";

const nodeBits = 5;
const nodeSize = (1<<nodeBits); // 32
const nodeBitmask = nodeSize - 1;


// Implementation of a bit-mapped vector trie.
// Based on https://github.com/graue/immutable-vector from Scott Feeney.
export class Vector2<T> {

    // _contents will be undefined only if length===0
    protected constructor(private _contents: any[]|undefined,
                          private _length: number,
                          private _maxShift: number) {}

    static empty<T>(): Vector2<T> {
        return Vector2.ofArray([]);
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

    // OK to call with index === vec.length (an append) as long as vector
    // length is not a (nonzero) power of the branching factor (32, 1024, ...).
    // Cannot be called on the empty vector!! It would crash
    //
    // TODO the action callback is costing lots of performance on node6.11.3 at least
    // on a loop calling append() which map() is doing for instance, as evidenced by the poor benchmarks.
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

    tail(): Vector2<T> {
        let popped;

        if (this._length === 0) {
            return this;
        }
        if (this._length === 1) {
            return Vector2.empty<T>();
        }

        // If the last leaf node will remain non-empty after popping,
        // simply set last element to null (to allow GC).
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
            fun.call(step.value);
        }
        return this;
    }

    map<U>(fun:(x:T)=>U): Vector2<U> {
        let iter = this[Symbol.iterator]();
        let out = Vector2.empty<U>();
        let step;
        while (!(step = iter.next()).done) {
            out = out.append(fun.call(step.value));
        }
        return out;
    }

    filter(fun:(x:T)=>boolean): Vector2<T> {
        let iter = this[Symbol.iterator]();
        let out = Vector2.empty<T>();
        let step;
        while (!(step = iter.next()).done) {
            if (fun.call(step.value)) {
                out = out.append(step.value);
            }
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

    // // TODO: See if equals and toArray are faster using a traversal.

    // equals(other:Vector2<T>): boolean {
    //     let val;
    //     if (this.length !== other.length) return false;
    //     for (let i = 0; i < this.length; i++) {
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
        let out = [];
        for (let i = 0; i < this._length; i++) {
            out.push(<T>this.internalGet(i));
        }
        return out;
    };
}
