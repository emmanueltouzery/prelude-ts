import { Option } from "./Option";
import { Vector } from "./Vector";
import { WithEquality } from "./Comparison";

// TODO extend seq?
/**
 * A lazy, potentially infinite, sequence of values.
 *
 * Use take() for instance to reduce it to a finite stream.
 */
export abstract class Stream<T> implements Iterable<T> {

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
     * If the collection is empty, return an empty collection.
     */
    abstract tail(): Stream<T>;

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

    isEmpty(): boolean {
        return true;
    }

    head(): Option<T> {
        return Option.none<T>();
    }

    tail(): Stream<T> {
        return this;
    }

    take(n: number): Stream<T> {
        return this;
    }

    takeWhile(predicate: (x:T)=>boolean): Stream<T> {
        return this;
    }

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     * No equality requirements.
     */
    mapStruct<U>(mapper:(v:T)=>U): Stream<U> {
        return <EmptyStream<U>>emptyStream;
    }

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     * Equality requirements.
     */
    map<U>(mapper:(v:T)=>U&WithEquality): Stream<U> {
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
                item = item.tail();
                return {done: false, value};
            }
        };
    }

    isEmpty(): boolean {
        return false;
    }

    head(): Option<T> {
        return Option.ofStruct(this.value);
    }

    tail(): Stream<T> {
        return this._tail();
    }

    take(n: number): Stream<T> {
        if (n < 1) {
            return <EmptyStream<T>>emptyStream;
        }
        return new ConsStream(this.value,
                              () => this.tail().take(n-1));
    }

    takeWhile(predicate: (x:T)=>boolean): Stream<T> {
        if (!predicate(this.value)) {
            return <EmptyStream<T>>emptyStream;
        }
        return new ConsStream(this.value,
                              () => this.tail().takeWhile(predicate));
    }

    mapStruct<U>(mapper:(v:T)=>U): Stream<U> {
        return new ConsStream(mapper(this.value),
                              () => this.tail().mapStruct(mapper));
    }

    map<U>(mapper:(v:T)=>U&WithEquality): Stream<U> {
        return this.mapStruct(mapper);
    }

    filter(predicate:(v:T)=>boolean): Stream<T> {
        return predicate(this.value) ?
            new ConsStream(this.value,
                           () => this.tail().filter(predicate)) :
            this.tail().filter(predicate);
    }

    toArray(): T[] {
        const r = this.tail().toArray();
        r.unshift(this.value);
        return r;
    }

    toVector(): Vector<T> {
        return Vector.ofIterableStruct<T>(this.toArray());
    }
}

const emptyStream = new EmptyStream();
