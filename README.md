# prelude-ts

[![NPM version][npm-image]][npm-url]
[![Tests][circleci-image]][circleci-url]
[![apidoc][apidoc-image]][apidoc-url]

## Intro

prelude-ts (previously prelude.ts) is a TypeScript library which aims to make functional programming
concepts accessible and productive in TypeScript. Note that even though it's
written in TypeScript, it's perfectly usable from JavaScript (including ES5)!

It provides [persistent](https://en.wikipedia.org/wiki/Persistent_data_structure)
immutable collections (Vector, Set, Map, Stream), and constructs such as Option,
Either, Predicate and Future.

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

The collections are also JavaScript iterables, so if you have an ES6 runtime,
you can use the `for .. of` construct on them. If you're not familiar with
immutable collections, `list.append(newItem)` keeps `list` unchanged; `append()`
returns a new list. Immutability helps reasoning about code.

You can check the **[User Guide](https://github.com/emmanueltouzery/prelude-ts/wiki/Prelude%E2%88%92ts-user-guide)**,
and browse the **[API documentation](http://emmanueltouzery.github.io/prelude.ts/latest/apidoc/globals.html)**,
or our **[blog](http://emmanueltouzery.github.io/blog/tags/prelude.ts.html)**.
Note that the constructors are private, and you should use static methods to build
items — for instance: `Option.of`, `Vector.of`, `Vector.ofIterable`, and so on.

`HashSet` and `HashMap` are implemented using the
[HAMT algorithm](http://en.wikipedia.org/wiki/Hash_array_mapped_trie),
and concretely the [hamt_plus library](https://www.npmjs.com/package/hamt_plus).
`Vector` is implemented through a
[bit-mapped vector trie](http://hypirion.com/musings/understanding-persistent-vector-pt-1)
and concretely the [list library](https://github.com/funkia/list/), as of 0.7.7.
In addition, the library is written in idiomatic JavaScript style, with loops
instead of recursion, so the performance should be good
([see benchmarks here comparing to immutable.js and more](https://github.com/emmanueltouzery/prelude-ts/wiki/Benchmarks)).
`list` and `hamt_plus` are the two only dependencies of prelude-ts.

## Set, Map and equality

JavaScript doesn't have structural equality, except for primitive types.
So `1 === 1` is true, but `[1] === [1]` is not, and neither is `{a:1} === {a:1}`.
This poses problems for collections, because if you have a `Set`, you don't
want duplicate elements because of this limited definition of equality.

For that reason, prelude-ts encourages you to define for your non-primitive types
methods `equals(other: any): boolean` and `hashCode(): number` (the same
methods that [immutable.js uses](https://immutable-js.github.io/immutable-js/docs/#/ValueObject)).
With these methods, structural equality is achievable, and indeed
`Vector.of(1,2,3).equals(Vector.of(1,2,3))` is `true`. However this can only
work if the values you put in collections have themselves properly defined equality
([see how prelude-ts can help](https://github.com/emmanueltouzery/prelude-ts/wiki/Equality)).
If these values don't have structural equality, then we can get no better than
`===` behavior.

prelude-ts attempts to assist the programmer with this; it tries to encourage
the developer to do the right thing. It'll refuse types without obviously properly
defined equality in Sets and in Maps keys, so `HashSet.of([1])`,
or `Vector.of([1]).equals(Vector.of([2]))` will not compile.
For both of these, you get (a longer version of) this message:

    Type 'number[]' is not assignable to type 'HasEquals'.
      Property 'equals' is missing in type 'number[]'.

See the [User Guide](https://github.com/emmanueltouzery/prelude-ts/wiki/Prelude%E2%88%92ts-user-guide#equality)
for more details.

## Installation

TypeScript must know about `Iterable`, an ES6 feature (but present in most browsers)
to compile prelude-ts. If you use TypeScript and target ES5, a minimum change to your tsconfig.json
could be to add:

```json
"lib": ["DOM", "ES5", "ScriptHost", "es2015.iterable"]
```

(compared to the default ES5 settings it only adds 'es2015.iterable')

### Using in Node.js

Just add the dependency in your `package.json` and start using it (like
`import { Vector } from "prelude-ts";`, or `const { Vector } = require("prelude-ts");`
if you use commonjs).
Everything should work, including type-checking if you use TypeScript. prelude-ts also provides
pretty-printing in the node REPL.

### Using in the browser

Add the dependency in your `package.json`; TypeScript should automatically
register the type definitions.

The npm package contains the files `dist/src/prelude_ts.js` and `dist/src/prelude_ts.min.js`,
which are UMD bundles; they work with other module systems and set `prelude_ts`
as a window global if no module system is found. Include the relevant one in your
index.html in script tags:

```html
<script src="node_modules/prelude-ts/dist/src/prelude_ts.min.js"></script>
```

You shouldn't have an issue to import prelude-ts in your application, but if you use
modules it gets a little more complicated. One solution if you use them is to create
an `imports.d.ts` file with the following contents:

```typescript
// https://github.com/Microsoft/TypeScript/issues/3180#issuecomment-283007750
import * as _P from 'prelude-ts';
export as namespace prelude_ts;
export = _P;
```

Then in a `.ts` file of your application, outside of a module, you can do:

```typescript
import Vector = prelude_ts.Vector;
```

\- to get values without the namespace.

Finally, if you also include `dist/src/chrome_dev_tools_formatters.js` through
a `script` tag, and [enable Chrome custom formatters](http://bit.ly/object-formatters),
then you can get
[a nice display of prelude-ts values in the Chrome debugger](https://raw.githubusercontent.com/wiki/emmanueltouzery/prelude-ts/chrome_formatters.png).

## Wishlist/upcoming features

* CharSeq, a string wrapper?
* Non-empty vector? (already have [non-empty linkedlist](http://emmanueltouzery.github.io/prelude.ts/latest/apidoc/classes/linkedlist.conslinkedlist.html))
* Make use of trampolining or a similar technique in `Stream` to avoid stack overflow exceptions on very large streams
* More functions on existing classes

## Out of scope for prelude-ts

* Free monads
* Monad transformers
* Effect tracking
* Higher-kinded types simulation

I think these concepts are not expressible in a good enough manner in a language
such as TypeScript.

## Alternatives and Influences

* [monet.js](https://monet.github.io/monet.js/) -- only has the `List` and
  `Option` collections, implemented in functional-style ES5. The implementation,
  using recursion, means its list type is noticeably slower than prelude-ts's.
* [immutable.js](https://immutable-js.github.io/immutable-js/) -- doesn't have the
  `Option` concept; the types can be clunky.
* [sanctuary](https://github.com/sanctuary-js/sanctuary)
  offers global functions like `S.filter(S.where(...))` while prelude-ts prefers a
  fluent-API style like `list.filter(..).sortBy(...)`. Also, sanctuary doesn't
  offer sets and maps. On the other hand, sanctuary has some JS runtime type system
  support, which prelude-ts doesn't have.
* [ramdajs](http://ramdajs.com/) offers global functions like
  `R.filter(R.where(...))` while prelude-ts prefers a
  fluent-API style like `list.filter(..).sortBy(...)`. Also, ramda doesn't offer
  sets and maps. Ramda also uses currying a lot out of the box, which may not
  be intuitive to a number of developers. In prelude,
  [currying](http://emmanueltouzery.github.io/prelude.ts/latest/apidoc/interfaces/function.function2.html#curried)
  & [partial application](http://emmanueltouzery.github.io/prelude.ts/latest/apidoc/interfaces/function.function2.html#apply1)
  are opt-in.
* [lodash](https://lodash.com) also has global functions, and many functions
  mutate the collections.
* [vavr](http://www.vavr.io/) -- it's a Java library, but it's the main inspiration for prelude-ts.
  Note that vavr is inspired by the Scala library, so prelude-ts also is,
  transitively.

## TypeScript version

As of 0.8.2, prelude requires TypeScript 3.1 or newer.

## Commands

    npm install

    npm test

    npm run-script docgen

    npm run benchmarks

[npm-image]: https://img.shields.io/npm/v/prelude-ts.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/prelude-ts
[circleci-image]: https://circleci.com/gh/emmanueltouzery/prelude-ts.svg?style=shield
[circleci-url]: https://circleci.com/gh/emmanueltouzery/prelude-ts
[apidoc-image]: http://emmanueltouzery.github.io/prelude.ts/apidoc.svg
[apidoc-url]: http://emmanueltouzery.github.io/prelude.ts/latest/apidoc/globals.html
