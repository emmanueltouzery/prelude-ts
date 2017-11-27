import { Lazy } from "../src/Lazy";
import * as assert from 'assert'

describe("lazy basics", () => {
    it("should be lazy", () => {
        let evaluated = false;
        const val = () => {
            evaluated = true;
            return 2;
        }
        const l = Lazy.of(val);
        assert.equal(false, evaluated);
        assert.equal(2, l.get());
        assert.equal(true, evaluated);
        // should get the same when it's cashed
        // but shouldn't evaluate again
        evaluated = false;
        assert.equal(2, l.get());
        assert.equal(false, evaluated);
    });
    it("map should be lazy", () => {
        let evaluated = false;
        const val = () => {
            evaluated = true;
            return 2;
        }
        const l = Lazy.of(val);
        const l2 = l.map(x => x*2);
        assert.equal(false, evaluated);
        assert.equal(4, l2.get());
        assert.equal(true, evaluated);
    });
    it("should convert to string properly, value not present", () =>
       assert.equal("Lazy(?)", Lazy.of(() => 5).toString()));
    it("should convert to string properly, value present", () => {
        const l = Lazy.of(() => 5);
        l.get();
        assert.equal("Lazy(5)", l.toString())
    });
});
