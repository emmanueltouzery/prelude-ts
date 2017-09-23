import { Vector } from "../src/Vector";
import { HashMap } from "../src/HashMap";
import { Option } from "../src/Option";
import { Stream } from "../src/Stream";
import { MyClass } from "./SampleData";
import * as SeqTest from "./Seq";
import * as assert from 'assert'

SeqTest.runTests("Vector",
                 Vector.ofIterable,
                 Vector.of,
                 Vector.empty,
                 Vector.unfoldRight);
