/**
 * List of types which provide equality semantics:
 * some builtin JS types, for which === provides
 * proper semantics, and then types providing HasEquals.
 */
export type WithEquality
    = string
    | number
    | boolean
    | null
    | HasEquals;

/**
 * A type with semantic equality relationships
 */
export type HasEquals = {equals(other: any): boolean; hashCode(): number;};

/**
 * Type guard for HasEquals: find out for a type with
 * semantic equality, whether you should call .equals
 * or ===
 */
export function hasEquals(v: WithEquality): v is HasEquals {
    return ((<HasEquals>v).equals !== undefined);
}

/**
 * Helper function for your objects so you can compute
 * a hashcode. You can pass to this function all the fields
 * of your object that should be taken into account for the
 * hash, and the function will return a reasonable hash code.
 *
 * @param fields the fields of your object to take
 *        into account for the hashcode
 */
export function fieldsHashCode(...fields: any[]): number {
    // https://stackoverflow.com/a/113600/516188
    // https://stackoverflow.com/a/18066516/516188
    let result = 1;
    for (const value of fields) {
        result = 37*result + getHashCode(value);
    }
    return result;
}

/**
 * Helper function to compute a reasonable hashcode for strings.
 */
export function stringHashCode(str: string): number {
    // https://stackoverflow.com/a/7616484/516188
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr   = str.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

/**
 * Equality function which tries semantic equality (using .equals())
 * if possible, degrades to === if not available, and is also null-safe.
 */
export function areEqual(obj: any|null, obj2: any|null): boolean {
    if (obj === null != obj2 === null) {
        return false;
    }
    if (obj === null || obj2 === null) {
        return true;
    }
    if (hasEquals(obj)) {
        return obj.equals(obj2);
    }
    return obj === obj2;
}

/**
 * Hashing function which tries to call hashCode()
 * and uses the object itself for numbers, then degrades
 * for stringHashCode of the string representation if
 * not available.
 */
export function getHashCode(obj: any|null): number {
    if (!obj) {
        return 0;
    }
    if (hasEquals(obj)) {
        return obj.hashCode();
    }
    if (typeof obj === 'number') {
        return obj;
    }
    return stringHashCode(obj+"");
}

/**
 * Enumeration used to express ordering relationships.
 * it's a const enum, is replaced by integers in the source.
 */
export const enum Ordering {
    /**
     * Lower Than
     */
    LT=-1,
    /**
     * EQuals
     */
    EQ=0,
    /**
     * Greater Than
     */
    GT=1
};
