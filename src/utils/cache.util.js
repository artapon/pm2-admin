// Tiny TTL cache for expensive, argument-free lookups (PM2 CLI spawns, WMI queries).
//
// Three behaviours that matter here:
//   * in-flight de-duplication — concurrent callers share one pending promise instead of
//     each spawning their own `pm2 jlist`
//   * optional stale-while-revalidate — within `staleMs` past expiry the cached value is
//     returned immediately and refreshed in the background, so a read never waits on a
//     1.3 s process spawn; past that window the caller waits for fresh data
//   * a rejected lookup is never cached, so an error cannot stick for the whole TTL
//
// `invalidate()` after every mutation keeps this honest: the next read is always fresh.
const cached = (fn, { freshMs, staleMs = 0 } = {}) => {
    let value;
    let hasValue = false;
    let expiresAt = 0;
    let inFlight = null;

    const refresh = () => {
        if (!inFlight) {
            inFlight = Promise.resolve()
                .then(fn)
                .then(result => {
                    value = result;
                    hasValue = true;
                    expiresAt = Date.now() + freshMs;
                    return result;
                })
                .finally(() => { inFlight = null; });
        }
        return inFlight;
    };

    const wrapper = async () => {
        const now = Date.now();
        if (hasValue && now < expiresAt) return value;
        // Serve slightly stale data instantly, but only up to staleMs — beyond that the
        // value is too old to show without checking.
        if (hasValue && staleMs > 0 && now < expiresAt + staleMs) {
            refresh().catch(() => {});
            return value;
        }
        return refresh();
    };

    wrapper.invalidate = () => {
        value = undefined;
        hasValue = false;
        expiresAt = 0;
    };

    return wrapper;
};

module.exports = { cached };
