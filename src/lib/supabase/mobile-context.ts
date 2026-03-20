import { AsyncLocalStorage } from "node:async_hooks";

/**
 * AsyncLocalStorage to pass mobile JWT tokens through server actions.
 * When a mobile API route needs to call a server action, it wraps the
 * call in mobileTokenStorage.run(token, fn) so that createClient()
 * can detect the mobile context and use the token instead of cookies.
 */
export const mobileTokenStorage = new AsyncLocalStorage<string>();
