import { areEqual, fieldsHashCode } from "../src/Comparison";

/**
 * @hidden
 */
export class MyClass {
    constructor(private field1:string, private field2:number) {}
    equals(other: MyClass): boolean {
        if (!other) {
            return false;
        }
        return areEqual(this.field1, other.field1) &&
            areEqual(this.field2, other.field2);
    }
    getField1(): string {
        return this.field1;
    }
    getField2(): number {
        return this.field2;
    }
    hashCode(): number {
        return fieldsHashCode(this.field1, this.field2);
    }
    toString(): string {
        return `{field1: ${this.field1}, field2: ${this.field2}}`;
    }
}
