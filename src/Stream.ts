import { Option } from "./Option";
import { Vector } from "./Vector";
import { WithEquality, toStringHelper,
         getHashCode, areEqual } from "./Comparison";
import { Value } from "./Value";

// TODO extend seq?
/**
 * A lazy, potentially infinite, sequence of values.
 *
 * Use take() for instance to reduce it to a finite stream.
 */
export abstract class Stream<T> implements Iterable<T>, Value {

    /**
     * The empty stream
     */
    static empty<T>(): Stream<T> {
        return <EmptyStream<T>>emptyStream;
    }

    /**
     * Create a Stream with the elements you give.
     * No equality requirements.
     */
    static ofStruct<T>(...elts:T[]): Stream<T> {
        return Stream.ofArrayStruct(elts);
    }

    /**
     * Create a Stream with the elements you give.
     * Equality requirements.
     */
    static of<T>(...elts:Array<T&WithEquality>): Stream<T> {
        return Stream.ofArrayStruct(elts);
    }

    /**
     * Create a Stream from a javascript array.
     *
     * There is no function to create a Stream from a javascript iterator,
     * because iterators are stateful and Streams lazy.
     * If we would create two Streams working on the same iterator,
     * the streams would interact with one another.
     * It also breaks the cycle() function.
     * No equality requirements.
     */
    static ofArrayStruct<T>(elts:T[]): Stream<T> {
        const head = elts[0];
        if (!head) {
            return <EmptyStream<T>>emptyStream;
        }
        return new ConsStream(head, () => Stream.ofArrayStruct(elts.slice(1)));
    }
    
    /**
     * Create a Stream from a javascript array.
     *
     * There is no function to create a Stream from a javascript iterator,
     * because iterators are stateful and Streams lazy.
     * If we would create two Streams working on the same iterator,
     * the streams would interact with one another.
     * It also breaks the cycle() function.
     * Equality requirements.
     */
    static ofArray<T>(elts: Array<T&WithEquality>): Stream<T> {
        return Stream.ofArrayStruct(elts);
    }

    /**
     * Build an infinite stream from a seed and a transformation function.
     * No equality requirements.
     *
     *     Stream.iterate(1, x => x*2)
     *     => [1,2,4,8,...]
     */
    static iterateStruct<T>(seed:T, fn: (v:T)=>T): Stream<T> {
        return new ConsStream(seed, ()=>Stream.iterateStruct(fn(seed), fn));
    }

    /**
     * Build an infinite stream from a seed and a transformation function.
     * Equality requirements.
     *
     *     Stream.iterate(1, x => x*2)
     *     => [1,2,4,8,...]
     */
    static iterate<T>(seed:T&WithEquality, fn: (v:T)=>T&WithEquality): Stream<T> {
        return Stream.iterateStruct(seed, fn);
    }

    /**
     * Build an infinite stream by calling repeatedly a function.
     * Equality requirements.
     *
     *     Stream.continually(() => 1)
     *     => [1,1,1,1,...]
     *
     *     Stream.continually(Math.random)
     *     => [0.49884723907769635, 0.3226548779864311, ...]
     */
    static continuallyStruct<T>(fn: ()=>T): Stream<T> {
        return new ConsStream(fn(), () => Stream.continuallyStruct(fn));
    }

    /**
     * Build an infinite stream by calling repeatedly a function.
     * No equality requirements.
     *
     *     Stream.continually(() => 1)
     *     => [1,1,1,1,...]
     *
     *     Stream.continually(Math.random)
     *     => [0.49884723907769635, 0.3226548779864311, ...]
     */
    static continually<T>(fn: ()=>T&WithEquality): Stream<T> {
        return Stream.continuallyStruct(fn);
    }

    /**
     * Implementation of the Iterator interface.
     */
    abstract [Symbol.iterator](): Iterator<T>;

    /**
     * Get the length of the collection.
     */
    abstract length(): number;

    /**
     * true if the collection is empty, false otherwise.
     */
    abstract isEmpty(): boolean;

    /**
     * Get the first value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    abstract head(): Option<T>;

    /**
     * Get all the elements in the collection but the first one.
     * If the collection is empty, return None.
     */
    abstract tail(): Option<Stream<T>>;

    /**
     * Return a new stream keeping only the first n elements
     * from this stream.
     */
    abstract take(n: number): Stream<T>;

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate.
     */
    abstract takeWhile(predicate: (x:T)=>boolean): Stream<T>;

    /**
     * Reduces the collection to a single value.
     * Left-associative.
     *
     * Example:
     *
     *     Vector.of("a", "b", "c").foldLeft("!", (xs,x) => x+xs))
     *     => "cba!"
     *
     * @param zero The initial value
     * @param fn A function taking the previous value and
     *           the current collection item, and returning
     *           an updated value.
     */
    abstract foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U;

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
    abstract foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U;

    /**
     * Reverse the collection. For instance:
     *
     *     [1,2,3] => [3,2,1]
     */
    abstract reverse(): Stream<T>;

    /**
     * Append an element at the end of this Stream.
     * No equality requirements.
     */
    abstract appendStruct(v:T): Stream<T>;

    /**
     * Append an element at the end of this Stream.
     * Equality requirements.
     */
    append(v:T&WithEquality): Stream<T> {
        return this.appendStruct(v);
    }

    /*
     * Append multiple elements at the end of this Stream.
     *
     * There is no function taking a javascript iterator,
     * because iterators are stateful and Streams lazy.
     * If we would create two Streams working on the same iterator,
     * the streams would interact with one another.
     * It also breaks the cycle() function.
     * No equality requirements.
     */
    abstract appendAllStruct(elts:Array<T>): Stream<T>;

    /*
     * Append multiple elements at the end of this Stream.
     *
     * There is no function taking a javascript iterator,
     * because iterators are stateful and Streams lazy.
     * If we would create two Streams working on the same iterator,
     * the streams would interact with one another.
     * It also breaks the cycle() function.
     * Equality requirements.
     */
    appendAll(elts:Array<T>): Stream<T> {
        return this.appendAllStruct(elts);
    }

    /*
     * Append another Stream at the end of this Stream.
     *
     * There is no function taking a javascript iterator,
     * because iterators are stateful and Streams lazy.
     * If we would create two Streams working on the same iterator,
     * the streams would interact with one another.
     * It also breaks the cycle() function.
     * No equality requirements.
     */
    abstract appendStreamStruct(elts:Stream<T>): Stream<T>;

    /*
     * Append another Stream at the end of this Stream.
     *
     * There is no function taking a javascript iterator,
     * because iterators are stateful and Streams lazy.
     * If we would create two Streams working on the same iterator,
     * the streams would interact with one another.
     * It also breaks the cycle() function.
     * Equality requirements.
     */
    appendStream(elts:Stream<T>): Stream<T> {
        return this.appendStreamStruct(elts);
    }

    /**
     * Prepend an element at the beginning of the collection.
     * Equality requirements.
     */
    prepend(elt: T & WithEquality): Stream<T> {
        return this.prependStruct(elt);
    }

    /**
     * Prepend an element at the beginning of the collection.
     * No equality requirements.
     */
    abstract prependStruct(elt: T): Stream<T>;

    /**
     * Repeat infinitely this Stream.
     * For instance:
     *
     *     Stream.of(1,2,3).cycle()
     *     => [1,2,3,1,2,3,1,2...]
     */
    abstract cycle(): Stream<T>;

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     * No equality requirements.
     */
    abstract mapStruct<U>(mapper:(v:T)=>U): Stream<U>;

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     * Equality requirements.
     */
    abstract map<U>(mapper:(v:T)=>U&WithEquality): Stream<U>;

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     * No equality requirement
     */
    abstract flatMapStruct<U>(mapper:(v:T)=>Stream<U>): Stream<U>;

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     * Equality requirement
     */
    abstract flatMap<U>(mapper:(v:T)=>Stream<U&WithEquality>): Stream<U>;

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    abstract filter(predicate:(v:T)=>boolean): Stream<T>;

    /**
     * Convert to array.
     * Don't do it on an infinite stream!
     */
    abstract toArray(): T[];

    /**
     * Convert to vector.
     * Don't do it on an infinite stream!
     */
    abstract toVector(): Vector<T>;

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    abstract equals(other: Stream<T>): boolean;

    /**
     * Get a human-friendly string representation of that value.
     */
    abstract toString(): string;

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    abstract hashCode(): number;

    inspect(): string {
        return this.toString();
    }
}

class EmptyStream<T> extends Stream<T> implements Iterable<T> {

    [Symbol.iterator](): Iterator<T> {
        return {
            next(): IteratorResult<T> {
                return {
                    done: true,
                    value: <any>undefined
                };
            }
        }
    }

    length(): number {
        return 0;
    }

    isEmpty(): boolean {
        return true;
    }

    head(): Option<T> {
        return Option.none<T>();
    }

    tail(): Option<Stream<T>> {
        return Option.none<Stream<T>>();
    }

    take(n: number): Stream<T> {
        return this;
    }

    takeWhile(predicate: (x:T)=>boolean): Stream<T> {
        return this;
    }

    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        return zero;
    }

    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        return zero;
    }

    reverse(): Stream<T> {
        return this;
    }

    appendStruct(v:T): Stream<T> {
        return Stream.ofStruct(v);
    }

    appendAllStruct(elts:Array<T>): Stream<T> {
        return Stream.ofArrayStruct(elts);
    }

    appendStreamStruct(elts:Stream<T>): Stream<T> {
        return elts;
    }

    prependStruct(elt: T): Stream<T> {
        return Stream.ofStruct(elt);
    }

    cycle(): Stream<T> {
        return <EmptyStream<T>>emptyStream;
    }

    mapStruct<U>(mapper:(v:T)=>U): Stream<U> {
        return <EmptyStream<U>>emptyStream;
    }

    map<U>(mapper:(v:T)=>U&WithEquality): Stream<U> {
        return <EmptyStream<U>>emptyStream;
    }

    flatMapStruct<U>(mapper:(v:T)=>Stream<U>): Stream<U> {
        return <EmptyStream<U>>emptyStream;
    }

    flatMap<U>(mapper:(v:T)=>Stream<U&WithEquality>): Stream<U> {
        return <EmptyStream<U>>emptyStream;
    }

    filter(predicate:(v:T)=>boolean): Stream<T> {
        return this;
    }

    toArray(): T[] {
        return [];
    }

    toVector(): Vector<T> {
        return Vector.empty<T>();
    }

    equals(other: Stream<T>): boolean {
        if (!other) {
            return false;
        }
        return other.isEmpty();
    }

    hashCode(): number {
        return 1;
    }

    toString(): string {
        return "[]";
    }
}

class ConsStream<T> extends Stream<T> implements Iterable<T> {

    /**
     * @hidden
     */
    public constructor(protected value: T, protected _tail: ()=>Stream<T>) {
        super();
    }

    [Symbol.iterator](): Iterator<T> {
        let item: Stream<T> = this;
        return {
            next(): IteratorResult<T> {
                if (item.isEmpty()) {
                    return { done: true, value: <any>undefined };
                }
                const value = item.head().getOrThrow();
                item = item.tail().getOrThrow();
                return {done: false, value};
            }
        };
    }

    length(): number {
        return this.foldLeft(0, (n, ignored) => n + 1);
    }

    isEmpty(): boolean {
        return false;
    }

    head(): Option<T> {
        return Option.ofStruct(this.value);
    }

    tail(): Option<Stream<T>> {
        return Option.ofStruct(this._tail());
    }

    take(n: number): Stream<T> {
        if (n < 1) {
            return <EmptyStream<T>>emptyStream;
        }
        return new ConsStream(this.value,
                              () => this._tail().take(n-1));
    }

    takeWhile(predicate: (x:T)=>boolean): Stream<T> {
        if (!predicate(this.value)) {
            return <EmptyStream<T>>emptyStream;
        }
        return new ConsStream(this.value,
                              () => this._tail().takeWhile(predicate));
    }

    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        let r = zero;
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty()) {
            r = fn(r, (<ConsStream<T>>curItem).value);
            curItem = (<ConsStream<T>>curItem)._tail();
        }
        return r;
    }

    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        return this.reverse().foldLeft(zero, (xs,x)=>fn(x,xs));
    }

    reverse(): Stream<T> {
        return this.foldLeft(<Stream<T>><EmptyStream<T>>emptyStream, (xs,x) => xs.prependStruct(x));
    }

    appendStruct(v:T): Stream<T> {
        const tail = this._tail();
        return new ConsStream(
            this.value,
            () => tail.appendStruct(v));
    }

    appendAllStruct(elts:Array<T>): Stream<T> {
        const tail = this._tail();
        return new ConsStream(
            this.value,
            () => tail.appendAllStruct(elts));
    }

    appendStreamStruct(elts:Stream<T>): Stream<T> {
        const tail = this._tail();
        return new ConsStream(
            this.value,
            () => tail.appendStreamStruct(elts));
    }

    prependStruct(elt: T): Stream<T> {
        return new ConsStream(
            elt,
            () => this);
    }

    cycle(): Stream<T> {
        return this._cycle(this);
    }

    private _cycle(toRepeat: Stream<T>): Stream<T> {
        const tail = this._tail();
        return new ConsStream(
            this.value,
            () => tail.isEmpty() ? toRepeat.cycle() : (<ConsStream<T>>tail)._cycle(toRepeat));
    }

    mapStruct<U>(mapper:(v:T)=>U): Stream<U> {
        return new ConsStream(mapper(this.value),
                              () => this._tail().mapStruct(mapper));
    }

    map<U>(mapper:(v:T)=>U&WithEquality): Stream<U> {
        return this.mapStruct(mapper);
    }

    flatMapStruct<U>(mapper:(v:T)=>Stream<U>): Stream<U> {
        return mapper(this.value).appendStream(
            this._tail().flatMapStruct(mapper));
    }

    flatMap<U>(mapper:(v:T)=>Stream<U&WithEquality>): Stream<U> {
        return this.flatMapStruct(mapper);
    }

    filter(predicate:(v:T)=>boolean): Stream<T> {
        return predicate(this.value) ?
            new ConsStream(this.value,
                           () => this._tail().filter(predicate)) :
            this._tail().filter(predicate);
    }

    toArray(): T[] {
        const r = this._tail().toArray();
        r.unshift(this.value);
        return r;
    }

    toVector(): Vector<T> {
        return Vector.ofIterableStruct<T>(this.toArray());
    }

    equals(other: Stream<T>): boolean {
        if (!other || !other.tail) {
            return false;
        }
        let myVal: Stream<T> = this;
        let hisVal = other;
        while (true) {
            if (myVal.isEmpty() !== hisVal.isEmpty()) {
                return false;
            }
            if (myVal.isEmpty()) {
                // they are both empty, end of the stream
                return true;
            }
            const myHead = (<ConsStream<T>>myVal).value;
            const hisHead = (<ConsStream<T>>hisVal).value;

            if ((myHead === undefined) !== (hisHead === undefined)) {
                return false;
            }
            if (myHead === undefined || hisHead === undefined) {
                // they are both undefined, the || is for TS's flow analysis
                // so he realizes none of them is undefined after this.
                continue;
            }
            if (!areEqual(myHead, hisHead)) {
                return false;
            }
            myVal = (<ConsStream<T>>myVal)._tail();
            hisVal = (<ConsStream<T>>hisVal)._tail();
        }
    }

    hashCode(): number {
        let hash = 1;
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty()) {
            hash = 31 * hash + getHashCode((<ConsStream<T>>curItem).value);
            curItem = (<ConsStream<T>>curItem)._tail();
        }
        return hash;
    }

    toString(): string {
        let curItem: Stream<T> = this;
        let result = "[";

        while (!curItem.isEmpty()) {
            result += toStringHelper((<ConsStream<T>>curItem).value);
            curItem = (<ConsStream<T>>curItem)._tail();
            if (!curItem.isEmpty()) {
                result += ", ";
            }
        }

        return result + "]";
    }
}

const emptyStream = new EmptyStream();
