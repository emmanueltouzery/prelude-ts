export interface Value {

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: any /*TODO*/): boolean;

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    hashCode(): number;

    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string;
}
