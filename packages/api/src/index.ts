// @digitaltwin/api — the framework-free half.
//
// The refresh POLICY, with no transport and no store attached. `./rtk` adapts it to RTK Query and
// `./server` carries the identity-forwarding client; neither is re-exported here, so an app that
// wants the policy does not pull @reduxjs/toolkit, and a client bundle cannot reach the server
// half by importing the package name.
export { createSingleFlight } from "./single-flight.js";
