/**
 * Represent a lazily evaluated value. You give a function which
 * will return a value; that function is only called when the value
 * is requested from Lazy, but it will be computed at most once.
 * If the value is requested again, the previously computed result
 * will be returned: Lazy is memoizing.
 */
export class Lazy<T> {

    private thunk: (()=>T)|undefined;
    private value: T|undefined;

    private constructor(thunk: ()=>T) {
        this.thunk = thunk;
    }
    
    /**
     * Build a Lazy from a computation returning a value.
     * The computation will be called at most once.
     */
    static of<T>(thunk: ()=>T) {
        return new Lazy(thunk);
    }

    /**
     * Evaluate the value, cache its value, and return it, or return the
     * previously computed value.
     */
    get(): T {
        if (this.thunk) {
            this.value = this.thunk();
            this.thunk = undefined;
        }
        return <T>this.value;
    }

    /**
     * Returns true if the computation underlying this Lazy was already
     * performed, false otherwise.
     */
    isEvaluated(): boolean {
        return this.thunk === undefined;
    }

    /**
     * Return a new lazy where the element was transformed
     * by the mapper function you give.
     */
    map<U>(mapper:(v:T)=>U): Lazy<U> {
        return new Lazy(()=>mapper(this.get()));
    }
}
