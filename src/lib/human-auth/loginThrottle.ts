// ---------------------------------------------------------------------------
// Process-local bounded failed-attempt throttle for the single-operator human
// login (P1E.2 / R1-M1).
//
// Keying model: WorkOS currently has exactly ONE human operator, so a
// client-address key would add no security and could be trivially bypassed via
// spoofable forwarding headers. The limiter is keyed on the principal/global
// scope. Tradeoff (documented): a malicious caller can lock the single login
// for the bounded retry window (small, recoverable DoS). No dependency, no
// schema change, no Redis.
// ---------------------------------------------------------------------------

const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_RETRY_AFTER_MS = 60 * 1000;

export class LoginThrottle {
    private failures = 0;
    private windowStart = 0;
    private lockedUntil = 0;

    constructor(
        private readonly maxFailures = DEFAULT_MAX_FAILURES,
        private readonly windowMs = DEFAULT_WINDOW_MS,
        private readonly retryAfterMs = DEFAULT_RETRY_AFTER_MS,
    ) {}

    status(now: number): { throttled: boolean; retryAfterMs: number; failures: number } {
        if (now - this.windowStart > this.windowMs) {
            this.failures = 0;
            this.windowStart = 0;
            this.lockedUntil = 0;
        }
        if (now < this.lockedUntil) {
            return {
                throttled: true,
                retryAfterMs: this.lockedUntil - now,
                failures: this.failures,
            };
        }
        return { throttled: false, retryAfterMs: 0, failures: this.failures };
    }

    recordFailure(now: number): { throttled: boolean; retryAfterMs: number } {
        this.failures += 1;
        if (this.windowStart === 0) this.windowStart = now;
        if (now - this.windowStart > this.windowMs) {
            this.failures = 1;
            this.windowStart = now;
        }
        if (this.failures >= this.maxFailures) {
            this.lockedUntil = now + this.retryAfterMs;
            return { throttled: true, retryAfterMs: this.retryAfterMs };
        }
        return { throttled: false, retryAfterMs: 0 };
    }

    reset(now: number): void {
        void now;
        this.failures = 0;
        this.windowStart = 0;
        this.lockedUntil = 0;
    }
}

export const loginThrottle = new LoginThrottle();

export function checkLoginThrottle(now: number = Date.now()): {
    throttled: boolean;
    retryAfterMs: number;
} {
    const state = loginThrottle.status(now);
    return { throttled: state.throttled, retryAfterMs: state.retryAfterMs };
}

export function recordLoginFailure(now: number = Date.now()): { retryAfterMs: number } {
    return loginThrottle.recordFailure(now);
}

export function resetLoginThrottle(now: number = Date.now()): void {
    loginThrottle.reset(now);
}
