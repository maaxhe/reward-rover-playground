// Small in-memory per-key limiter (sliding window). Enough for one pm2 process;
// entries are pruned so the map cannot grow without bound.
export const createRateLimiter = ({ windowMs, max }) => {
  const hits = new Map();

  const prune = () => {
    const now = Date.now();
    for (const [key, times] of hits) {
      const fresh = times.filter((t) => now - t < windowMs);
      if (fresh.length) hits.set(key, fresh);
      else hits.delete(key);
    }
  };
  setInterval(prune, windowMs).unref();

  /** Records one attempt for `key`. Returns false when the key is over the limit. */
  const take = (key) => {
    const now = Date.now();
    const fresh = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (fresh.length >= max) {
      hits.set(key, fresh);
      return false;
    }
    fresh.push(now);
    hits.set(key, fresh);
    return true;
  };

  return { take, size: () => hits.size };
};

/** Express middleware: limits by client IP, answers 429 when over the limit. */
export const limitByIp = ({ windowMs, max, message = "Too many requests, try again later" }) => {
  const limiter = createRateLimiter({ windowMs, max });
  return (req, res, next) => {
    if (limiter.take(req.ip)) return next();
    res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
    return res.status(429).json({ error: message });
  };
};
