// @digitaltwin/api — one API client instance for the whole app, browser and server.
//
// A single entry point, deliberately. The subpaths this package used to have (`./rtk`, `./server`)
// existed to keep two things apart that no longer exist: an RTK-specific refresh adapter, and
// server-only identity forwarding. The backend owns the session now, so there is no refresh to
// adapt and no identity to forward — what is left runs the same in both environments and has no
// reason to be split.
export {
  ApiError,
  createApiClient,
  DEFAULT_TIMEOUT_MS,
  type ApiClient,
  type ApiClientConfig,
  type ApiErrorKind,
  type ApiRequestInit,
  type ApiSession,
} from "./client.js";
