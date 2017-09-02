import { stringHashCode } from "../src/Util";

export class MyClass {
    constructor(private field1:string, private field2:number) {}
    equals(other: MyClass): boolean {
        return this.field1 === other.field1 &&
            this.field2 === other.field2;
    }
    hashCode(): number {
        return stringHashCode("" + this.field1 + this.field2);
    }
    toString(): string {
        return `{field1: ${this.field1}, field2: ${this.field2}}`
    }
}
