import { Vector2 } from "../src/Vector2";
import * as SeqTest from "./Seq";
import * as assert from 'assert'

SeqTest.runTests("Vector2",
                 Vector2.ofIterable,
                 Vector2.of,
                 Vector2.empty,
                 Vector2.unfoldRight);
