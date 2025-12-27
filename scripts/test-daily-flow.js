const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const USERNAME = process.env.TEST_USER || `qa_user_a_${Date.now()}`;
const PASSWORD = process.env.TEST_PASS || "qa_password_123";
const RATE_LIMIT_MS = 30_000;

if (typeof fetch !== "function") {
  console.error("FAIL: global fetch is not available. Use Node 18+.");
  process.exit(1);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const logPass = (step, detail = "") => {
  const suffix = detail ? ` - ${detail}` : "";
  console.log(`PASS: ${step}${suffix}`);
};

const logFail = (step, detail = "") => {
  const suffix = detail ? ` - ${detail}` : "";
  console.error(`FAIL: ${step}${suffix}`);
  process.exitCode = 1;
};

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
};

const registerOrLogin = async () => {
  const register = await fetchJson(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (register.response.ok) {
    return register.body?.token;
  }

  if (register.response.status !== 409) {
    throw new Error(register.body?.error || `Register failed (${register.response.status})`);
  }

  const login = await fetchJson(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (!login.response.ok) {
    throw new Error(login.body?.error || `Login failed (${login.response.status})`);
  }

  return login.body?.token;
};

const submitWithRetry = async (payload, token) => {
  const attempt = async () =>
    fetchJson(`${BASE_URL}/api/daily/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

  let result = await attempt();
  if (result.response.status !== 429) {
    return result;
  }

  await wait(RATE_LIMIT_MS + 500);
  result = await attempt();
  return result;
};

const run = async () => {
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test user: ${USERNAME}`);

  let token;
  try {
    token = await registerOrLogin();
    if (!token) {
      logFail("1) Login/User token", "Missing token in response");
      return;
    }
    logPass("1) Login/User token");
  } catch (error) {
    logFail("1) Login/User token", error.message);
    return;
  }

  let daily;
  try {
    const { response, body } = await fetchJson(`${BASE_URL}/api/daily/current`);
    if (!response.ok) {
      throw new Error(body?.error || `HTTP ${response.status}`);
    }
    if (typeof body?.seed !== "number" || !body?.config) {
      throw new Error("Missing seed or config");
    }
    daily = body;
    logPass("2) GET /api/daily/current");
  } catch (error) {
    logFail("2) GET /api/daily/current", error.message);
    return;
  }

  try {
    const payload = {
      challengeId: daily.id,
      score: 100,
      steps: 50,
      replayData: {
        actions: Array.from({ length: 50 }, () => "up"),
        initial_seed: daily.seed,
      },
    };
    const { response, body } = await submitWithRetry(payload, token);
    if (!response.ok) {
      throw new Error(body?.error || `HTTP ${response.status}`);
    }
    if (!body?.accepted) {
      throw new Error("Expected accepted=true for initial submit");
    }
    logPass("3) POST /api/daily/submit (100, 50)");
  } catch (error) {
    logFail("3) POST /api/daily/submit (100, 50)", error.message);
    return;
  }

  await wait(RATE_LIMIT_MS + 500);

  try {
    const payload = {
      challengeId: daily.id,
      score: 80,
      steps: 50,
      replayData: {
        actions: Array.from({ length: 50 }, () => "up"),
        initial_seed: daily.seed,
      },
    };
    const { response, body } = await submitWithRetry(payload, token);
    if (!response.ok) {
      throw new Error(body?.error || `HTTP ${response.status}`);
    }
    if (body?.accepted !== false) {
      throw new Error("Expected accepted=false for worse score");
    }
    logPass("4) POST /api/daily/submit (80, 50)");
  } catch (error) {
    logFail("4) POST /api/daily/submit (80, 50)", error.message);
    return;
  }

  await wait(RATE_LIMIT_MS + 500);

  try {
    const payload = {
      challengeId: daily.id,
      score: 100,
      steps: 40,
      replayData: {
        actions: Array.from({ length: 40 }, () => "up"),
        initial_seed: daily.seed,
      },
    };
    const { response, body } = await submitWithRetry(payload, token);
    if (!response.ok) {
      throw new Error(body?.error || `HTTP ${response.status}`);
    }
    if (!body?.accepted) {
      throw new Error("Expected accepted=true for better steps");
    }
    logPass("5) POST /api/daily/submit (100, 40)");
  } catch (error) {
    logFail("5) POST /api/daily/submit (100, 40)", error.message);
    return;
  }

  try {
    const { response, body } = await fetchJson(`${BASE_URL}/api/leaderboard/daily`);
    if (!response.ok) {
      throw new Error(body?.error || `HTTP ${response.status}`);
    }
    const entry = body?.items?.find((item) => item.username === USERNAME);
    if (!entry) {
      throw new Error("User not found on leaderboard");
    }
    if (entry.score !== 100 || entry.steps !== 40) {
      throw new Error(`Unexpected score/steps: ${entry.score}/${entry.steps}`);
    }
    logPass("6) GET /api/leaderboard/daily");
  } catch (error) {
    logFail("6) GET /api/leaderboard/daily", error.message);
  }
};

run();
