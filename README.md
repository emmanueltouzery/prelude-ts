# prelude.ts
[![NPM version][npm-image]][npm-url]
[![Tests][circleci-image]][circleci-url]

## Intro

Prelude.ts is a typescript library which aims to make functional programming
concepts accessible and productive in typescript.

It provides [persistent](https://en.wikipedia.org/wiki/Persistent_data_structure)
immutable collections (Vector, Set, Map, Stream), and constructs such as Option.

```typescript
Vector.of(1,2,3)
  .map(x => x*2)
  .head()
// => Option.of(2)

Option.sequence(
  Vector.of(Option.of(1), Option.of(2)))
// => Option.of(Vector.of(1,2))

Vector.of(1,2,3,4).groupBy(x => x%2)
// => HashMap.of([0, Vector.of(2,4)],[1, Vector.of(1,3)])

Vector.of(1,2,3).zip("a", "b", "c").takeWhile(([k,v]) => k<3)
// Vector.of([1,"a"],[2,"b"])

HashMap.of(["a",1],["b",2]).get("a")
// Option.of(1)
```

The collections are also javascript iterables, so if you have an ES6 runtime,
you can use the `for .. of` construct on them. If you're not familiar with
immutable collections, `list.append(newItem)` keeps `list` unchanged; `append()`
returns a new list. Immutability helps reasonning about code.

You can check the tests for examples of use, and browse the
**[API documentation](http://emmanueltouzery.github.io/prelude.ts/apidoc/globals.html)**.
Note that the constructors are private, and you should use static methods to build
items, for instance `Option.of`, `Vector.of`, `Vector.ofIterable`, and so on.

At this time most of the collections are implemented using the
[HAMT algorithm](http://en.wikipedia.org/wiki/Hash_array_mapped_trie),
and concretely the [hamt_plus library](https://www.npmjs.com/package/hamt_plus).
Besides this dependency, I'll try to limit the number of dependencies.
In addition the library is written in idiomatic javascript style, with loops
instead of recursion, so the performance should be reasonable.

## Set, Map and equality

Javascript doesn't have structural equality, except for primitive types.
So, `1 === 1` is true. But `[1] === [1]` is not, and neither `{a:1} === {a:1}`.
This poses problems for collections, because if you have a `Set`, you don't
want duplicate elements because of this limited definition of equality.

For that reason, prelude.ts encourages you to define for your non-primitive types
methods `equals(other: any): boolean` and `hashCode(): number` (the same
methods that [immutable.js uses](https://facebook.github.io/immutable-js/docs/#/ValueObject)).
With these methods, structural equality is achievable, and indeed
`Vector.of(1,2,3).equals(Vector.of(1,2,3))` is `true`. However this can only
work if the values you put in collections have themselves properly defined equality
([see how prelude.ts can help](https://github.com/emmanueltouzery/prelude.ts/wiki/Equality)).
If these values don't have structural equality, then we can get no better than
`===` behavior.

prelude.ts attempts to assist the programmer with this; it tries to encourage
the developer to do the right thing. First, it'll refuse types without obviously properly
defined equality in Sets and in Maps keys, so `HashSet.of([1])`,
or `Vector.of([1]).equals(Vector.of([2]))` will not compile.
For both of these, you get (a longer version of) this message:

    Type 'number[]' is not assignable to type 'HasEquals'.
      Property 'equals' is missing in type 'number[]'.

But in some less obvious cases, we can't detect the issue at compile-time, so
prelude.ts will reject the code at runtime; for instance if you call
`HashSet.of(Vector.of([1]))` you'll get an exception at runtime:

    Error building a HashSet: element doesn't support true equality: Vector([1])

(this behavior is [customizable](http://emmanueltouzery.github.io/prelude.ts/apidoc/globals.html#setcontractviolationaction)).

## Installation

Typescript must know about `Iterable`, an ES6 feature (but present in most browsers)
to compile prelude.ts. If you target ES5, a minimum change to your tsconfig.json
could be to add:

```json
"lib": ["DOM", "ES5", "ScriptHost", "es2015.iterable"]
```

(compared to the default es5 settings it only adds 'es2015.iterable')

### Using in nodejs

Just add the dependency in your `package.json` and start using it (like
`import { Vector } from "prelude.ts";`).
Everything should work, including type-checking. Prelude.ts also provides
pretty-printing in the node REPL.

You shouldn't have an issue to import prelude.ts in your application, but if you use
modules it gets a little more complicated; One solution if you use them is to create
an `imports.d.ts` file with the following contents:

```typescript
// https://github.com/Microsoft/TypeScript/issues/3180#issuecomment-283007750
import * as _P from 'prelude.ts';
export as namespace prelude_ts;
export = _P;
```

Then in a `.ts` file of your application, outside of a module, you can do:
```typescript
import Vector = prelude_ts.Vector;
```

To get the values without namespace.

### Using in the browser

Add the dependency in your `package.json`; Typescript should automatically
register the type definitions.

The npm package contains the files `dist/src/prelude_ts.js`, `dist/src/prelude_ts.min.js`,
which are UMD bundles; they work with other module systems and set `prelude_ts`
as a window global if no module system is found.
include the relevant one in your index.html in script tags:
```html
<script src="node_modules/prelude.ts/dist/src/prelude_ts.min.js"></script>
```

Finally, if you also include `dist/src/chrome_dev_tools_formatters.js` through
a `script` tag, and [enable Chrome custom formatters](http://bit.ly/object-formatters),
then you can get
[a nice display of prelude.ts values in the chrome debugger](https://raw.githubusercontent.com/wiki/emmanueltouzery/prelude.ts/chrome_formatters.png).

## Wishlist/upcoming features

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

    npm run benchmarks

[npm-image]: https://img.shields.io/npm/v/prelude.ts.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/prelude.ts
[circleci-image]: https://circleci.com/gh/emmanueltouzery/prelude.ts.svg?style=shield&circle-token=6d8b74ef7ea7d1c204e77c4f88b05348682b4161
[circleci-url]: https://circleci.com/gh/emmanueltouzery/prelude.ts
