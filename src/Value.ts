export interface Value {
    equals(other: any /*TODO*/): boolean;
    hashCode(): number;
    toString(): string;
}
