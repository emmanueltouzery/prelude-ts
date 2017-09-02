export type WithEquality
    = string
    | number
    | boolean
    | null
    | HasEquals;

export type HasEquals = {equals(other: any): boolean; hashCode(): number;};

export function hasEquals(v: WithEquality): v is HasEquals {
    return ((<HasEquals>v).equals !== undefined);
}

// https://stackoverflow.com/a/7616484/516188
export function stringHashCode(str: string): number {
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr   = str.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export function withEqEquals(obj: WithEquality|null, obj2: WithEquality|null): boolean {
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

export function withEqHashCode(obj: WithEquality): number {
    if (hasEquals(obj)) {
        return obj.hashCode();
    }
    if (Number.isInteger(<any>obj)) {
        return <number>obj;
    }
    return stringHashCode(obj+"");
}

export const enum Ordering { LT=-1, EQ=0, GT=1 };
