# prelude.ts
[![NPM version][npm-image]][npm-url]

## Intro

Prelude.ts is a typescript library which aims to make functional programming
concepts accessible and productive in typescript.

It provides immutable collections (Vector, Set, Map), and constructs such as
Option.

```typescript
Vector.of(1,2,3)
  .map(x => x*2)
  .head() 
// => Option.of(2)

Option.sequence(
  Vector.of(Option.of(1), Option.of(2)))
// => Option.of(Vector.of(1,2))

Vector.of(1,2,3,4).groupBy(x => x%2) 
// => HashMap.empty().put(0, Vector.of(2,4)).put(1, Vector.of(1,3))

Vector.of(1,2,3).zip("a", "b", "c").takeWhile(([k,v]) => k<3)
// Vector.of([1,"a"],[2,"b"])
```

The collections are also javascript iterables, so if you have an ES6 runtime,
you can use the `for .. of` construct on them.

You can check the tests for examples of use, and browse the
[API documentation](http://emmanueltouzery.github.io/prelude.ts/apidoc/globals.html).

At this time most of the collections are implemented using the
[HAMT algorithm](http://en.wikipedia.org/wiki/Hash_array_mapped_trie),
and concretely the [hamt_plus library](https://www.npmjs.com/package/hamt_plus).
Besides this dependency, I'll try to limit the number of dependencies.
In addition the library is written in idiomatic javascript style, with loops
instead of recursion, so the performance should be reasonable.

## Structs and equality

Javascript doesn't have structural equality, except for primitive types.
So, `1 === 1` is true. But `[1] === [1]` is not, and neither `{a:1} === {a:1}`.
This poses problems for collections, because if you have a `Set`, you don't
want duplicate elements because of this limited definition of equality.

For that reason, prelude.ts encourages you to define for your non-primitive types
methods `equals(other: any): boolean` and `hashCode(): number` (the same
methods that [immutable.js uses](https://facebook.github.io/immutable-js/docs/#/ValueObject)).
With these methods, structural equality is achievable, and indeed
`Vector.of(1,2,3).equals(Vector.of(1,2,3))` is `true`. However this can only
work if the values you put in collections have themselves properly defined equality.
If these values don't have structural equality, then we can get no better than
`===` behavior.

prelude.ts attempts to assist the programmer with this; it tries to encourage
the developer to do the right thing. First, it'll refuse types without properly
defined equality in Sets and in Maps keys. Second, it has a special terminology
for types without properly defined equality: 'structs'.
When you operate with for instance a `Vector`, you'll have to explicitely say
when you deal with structs. So `Vector.of([1])` will not compile.
You get (a longer version of) this message:

    Type 'number[]' is not assignable to type 'HasEquals'.
      Property 'equals' is missing in type 'number[]'.

So the solution is to use a struct-oriented function: `Vector.ofStruct([1])`.
That version compiles just fine. But now you've been warned that you can't use
this value in a Set or as a Map key, and that equality features are not provided.
Similary, functions such a `map` have alternate implementations such as `mapStruct`
to warn the programmer in these cases.

prelude.ts also offers some helper functions to implement the `equals` and
`hashCode` functions for your own objects:
[fieldsHashCode](http://emmanueltouzery.github.io/prelude.ts/apidoc/globals.html#fieldshashcode)
and [areEqual](http://emmanueltouzery.github.io/prelude.ts/apidoc/globals.html#areequal).

Here is an example of object using these helpers:

```typescript
class MyClass {
    constructor(private field1:string, private field2:number) {}
    equals(other: MyClass): boolean {
        return areEqual(this.field1, other.field1) &&
            areEqual(this.field2, other.field2);
    }
    hashCode(): number {
        return fieldsHashCode(this.field1, this.field2);
    }
    toString(): string {
        return `{field1: ${this.field1}, field2: ${this.field2}}`;
    }
}
```

## Wishlist/upcoming features

* Stream (including infinite streams)
* Either
* Future, wrapping promises?
* Non-empty vector probably
* many more functions on existing classes

## Out of scope for prelude.ts

* Free monads
* Monad transformers
* Effect tracking
* Higher-kinded types simulation

I think these concepts are not expressible in a good enough manner on a language
such as typescript.

## Alternatives and Influences

* [monet.js](https://monet.github.io/monet.js/) -- only has the `List` and 
  `Option` collections, implemented in functional-style ES5.
* [immutables.js](https://facebook.github.io/immutable-js/) -- doesn't have the
  `Option` concept, the types can be clunky.
* [sanctuary](https://github.com/sanctuary-js/sanctuary) and [ramdajs](http://ramdajs.com/)
  push global functions like `R.filter(R.where(...))` while prelude.ts prefers a
  fluent-api style like `list.filter(..).sortBy(...)`
* [lodash](https://lodash.com) also has the global functions, and many functions
  mutate the collections.
* [vavr](http://www.vavr.io/) -- it's a java library, but it's the main inspiration for prelude.ts.

## Caveats

* the API may change in the future (but types should protect you)
* there could still be bugs, it's still early days

## Commands

    npm install

    npm test

    npm run-script docgen

[npm-image]: https://img.shields.io/npm/v/prelude.ts.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/prelude.ts
