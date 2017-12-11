import { hasTrueEquality } from "./Comparison";
import { toStringHelper } from "./SeqHelpers";

let preludeTsContractViolationCb = (msg:string):void => { throw msg; };

/**
 * Some programmatic errors are only detectable at runtime
 * (for instance trying to setup a <code>HashSet</code> of <code>Option&lt;number[]&gt;</code>: you
 * can't reliably compare a <code>number[]</code> therefore you can't compare
 * an <code>Option&lt;number[]&gt;</code>.. but we can't detect this error at compile-time
 * in typescript). So when we detect them at runtime, prelude.ts throws
 * an exception by default.
 * This function allows you to change that default action
 * (for instance, you could display an error message in the console,
 * or log the error)
 *
 * You can reproduce the issue easily by running for instance:
 *
 *     HashSet.of(Option.of([1]))
 *     => throws
 */
export function setContractViolationAction(action: (msg:string)=>void) {
    preludeTsContractViolationCb = action;
}

/**
 * @hidden
 */
export function reportContractViolation(msg: string): void {
    preludeTsContractViolationCb(msg);
}

/**
 * @hidden
 */
export function contractTrueEquality(context: string, ...vals: Array<any>) {
    for (const val of vals) {
        if (val) {
            if (val.hasTrueEquality && (!val.hasTrueEquality())) {
                reportContractViolation(
                    context + ": element doesn't support true equality: " + toStringHelper(val));
            }
            if (!hasTrueEquality(val).getOrThrow()) {
                reportContractViolation(
                    context + ": element doesn't support equality: " + toStringHelper(val));
            }
            // the first element i find is looking good, aborting
            return;
        }
    }
}
