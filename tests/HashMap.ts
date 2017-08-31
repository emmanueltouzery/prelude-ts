import { HashMap } from "../src/HashMap";
import { stringHashCode } from "../src/Util";

import * as assert from 'assert'

describe("basic sanity tests", () => {
    it("should overwrite values with the same key", () => assert.ok(
        HashMap.empty<number,String>().put(5, "test").put(5, "test1")
            .equals(HashMap.empty<number,String>().put(5, "test1"))));

    class MyClass {
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
    it("should overwrite values with the same key with custom types", () => assert.ok(
        HashMap.empty<MyClass,string>()
            .put(new MyClass("a", 1), "test")
            .put(new MyClass("a", 1), "test1")
            .put(new MyClass("a", 2), "test1").equals(
                HashMap.empty<MyClass,string>()
                    .put(new MyClass("a", 1), "test1")
                    .put(new MyClass("a", 2), "test1"))));

    it("should support map as a key itself", () => assert.ok(
        HashMap.empty<HashMap<string,number>, number>()
            .put(HashMap.empty<string,number>().put("hello", 1), 6)
            .put(HashMap.empty<string,number>().put("hello", 1), 7)
            .put(HashMap.empty<string,number>().put("bye", 1), 7)
            .equals(
                HashMap.empty<HashMap<string,number>, number>()
                    .put(HashMap.empty<string,number>().put("hello", 1), 7)
                    .put(HashMap.empty<string,number>().put("bye", 1), 7))));

});
