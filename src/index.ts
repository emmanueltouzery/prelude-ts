// Not re-exporting the abstract types such as Seq, Collection and so on,
// on purpose. Right now they are more an help to design the library, not meant
// for the user.
// Seq<T>.equals is a lot less type-precise than Vector<T>.equals, so I'd rather
// the users use concrete types.
export * from "./Option";
export * from "./Either";
export * from "./Lazy";
export * from "./Vector";
export * from "./LinkedList";
export * from "./HashMap";
export * from "./HashSet";
export * from "./Tuple2";
export * from "./Value";
export * from "./Comparison";
export * from "./Stream";
export * from "./Contract";
export * from "./Predicate";
export * from "./Function";
