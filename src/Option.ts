export abstract class Option<T> {
    /**
     * T gives a some
     * undefined gives a none
     * null (for now?) gives a some
     */
    static of<T>(v: T|null|undefined): Option<T> {
        if (v === undefined) {
            return <Option<T>>none;
        }
        return new Some(v);
    }

    static none<T>(): Option<T> {
        return <Option<T>>none;
    }

    abstract isSome(): boolean;
    abstract isNone(): boolean;
    abstract contains(v: T|null): boolean;
    abstract getOrUndefined(): T|null|undefined;
}

export class Some<T> extends Option<T> {
    constructor(private value: T|null) {
        super();
    }

    isSome(): boolean {
        return true;
    }
    isNone(): boolean {
        return false;
    }
    contains(v: T|null): boolean {
        return v === this.value;
    }
    getOrUndefined(): T|null|undefined {
        return this.value;
    }
}

export class None<T> extends Option<T> {
    isSome(): boolean {
        return false;
    }
    isNone(): boolean {
        return true;
    }
    contains(v: T|null): boolean {
        return false;
    }
    getOrUndefined(): T|null|undefined {
        return undefined;
    }
}

export const none = new None();
