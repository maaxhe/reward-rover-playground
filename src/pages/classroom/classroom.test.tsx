import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { buildWorld } from "../../../server/lib/competition.js";
import ClassroomHome from "./ClassroomHome";
import ClassroomPlay from "./ClassroomPlay";
import ClassroomHost from "./ClassroomHost";

const world = buildWorld(5);

const roomPayload = (over: Record<string, unknown> = {}) => ({
  code: "1234",
  phase: "training",
  serverNow: Date.now(),
  trainingEndsAt: Date.now() + 120000,
  trainingMs: 120000,
  episodeBudget: 40,
  round: 1,
  seed: 5,
  settings: { trainingMinutes: 2, episodeBudget: 40, size: 8, obstacles: 11, rewards: 6, punishments: 5, minDistance: 8 },
  world,
  playerCount: 2,
  leaderboard: [
    { id: "a", name: "Anna", episodes: 3, submitted: true, totalReward: 20, steps: 9, reachedGoal: true, rank: 1 },
    { id: "b", name: "Ben", episodes: 0, submitted: false, totalReward: null, steps: null, reachedGoal: false, rank: null },
  ],
  me: { id: "a", name: "Anna", rank: 1 },
  ...over,
});

const mockFetch = (handler: (url: string, init?: RequestInit) => unknown) => {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const body = handler(url, init);
    return { ok: true, json: async () => body } as Response;
  }));
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

describe("classroom pages", () => {
  it("home shows join and create forms", () => {
    render(<MemoryRouter initialEntries={["/klasse"]}><Routes><Route path="/klasse" element={<ClassroomHome />} /></Routes></MemoryRouter>);
    expect(screen.getByText("Beitreten")).toBeTruthy();
    expect(screen.getByText("Raum erstellen")).toBeTruthy();
  });

  it("QR link shows only a name field, no room creation", () => {
    render(<MemoryRouter initialEntries={["/klasse?code=4821"]}><Routes><Route path="/klasse" element={<ClassroomHome />} /></Routes></MemoryRouter>);
    expect(screen.getByText("4821")).toBeTruthy();
    expect(screen.getByPlaceholderText("Dein Name")).toBeTruthy();
    expect(screen.queryByText("Raum erstellen")).toBeNull();
    fireEvent.click(screen.getByText("Anderer Code oder Raum erstellen"));
    expect(screen.getByText("Raum erstellen")).toBeTruthy();
  });

  it("guide opens from the classroom header and shows live demos", () => {
    render(<MemoryRouter initialEntries={["/klasse"]}><Routes><Route path="/klasse" element={<ClassroomHome />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getAllByText(/Erklärung/)[0]);
    expect(screen.getAllByText(/Von vorn/).length).toBeGreaterThanOrEqual(4);
  });

  it("player view trains, shows leaderboard and submits a Q-table", async () => {
    localStorage.setItem("rr-class-player-1234", JSON.stringify({ playerId: "a", token: "t" }));
    const submits: unknown[] = [];
    mockFetch((url, init) => {
      if (url.includes("/submit")) { submits.push(JSON.parse(String(init?.body))); return { totalReward: 5, steps: 10, reachedGoal: false, improved: true, bestReward: 5 }; }
      return roomPayload();
    });
    render(<MemoryRouter initialEntries={["/klasse/play/1234"]}><Routes><Route path="/klasse/play/:code" element={<ClassroomPlay />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Anna")).toBeTruthy());
    // "Schnell" must start switched off, otherwise the episode budget is gone in seconds.
    const fastSwitch = screen.getByRole("switch", { name: /Schnell/ });
    expect(fastSwitch.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(fastSwitch); // normal speed is too slow for a unit test
    fireEvent.click(screen.getByText("▶ Trainieren"));
    await waitFor(() => expect(screen.getByText(/Episoden:/).textContent).toMatch(/Episoden:\s*[1-9]/), { timeout: 12000 });
    // the statistics card fills with the learning curve once episodes are done
    expect(screen.getByText("Deine Statistik")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("img", { name: /Schritte pro Episode\. Letzte Episode: \d+ Schritte/ })).toBeTruthy(), { timeout: 12000 });
    fireEvent.click(screen.getByText("✓ Jetzt werten"));
    // The periodic auto-submit can fire before the first episode ends (no paramLog yet), so look at the manual one.
    type Submit = { qTable: object; paramLog?: number[][] };
    await waitFor(() => expect((submits as Submit[]).some((x) => x.paramLog?.length)).toBe(true));
    const last = (submits as Submit[]).filter((x) => x.paramLog?.length).pop()!;
    expect(Object.keys(last.qTable).length).toBeGreaterThan(0);
    // which ε/α/γ the episodes ran with travels along: [[fromEpisode, ε, α, γ], …]
    expect(last.paramLog?.[0]).toEqual([0, 0.3, 0.3, 0.9]);
  }, 30000);

  it("first start shows a short tour that can be skipped for good", async () => {
    localStorage.setItem("rr-class-player-1234", JSON.stringify({ playerId: "a", token: "t" }));
    mockFetch(() => roomPayload());
    const { unmount } = render(<MemoryRouter initialEntries={["/klasse/play/1234"]}><Routes><Route path="/klasse/play/:code" element={<ClassroomPlay />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Kurz-Tour" })).toBeTruthy());
    fireEvent.click(screen.getByText("Weiter"));
    expect(screen.getByText("Die Pfeile")).toBeTruthy();
    fireEvent.click(screen.getByText("Überspringen"));
    expect(screen.queryByRole("dialog", { name: "Kurz-Tour" })).toBeNull();
    unmount();
    render(<MemoryRouter initialEntries={["/klasse/play/1234"]}><Routes><Route path="/klasse/play/:code" element={<ClassroomPlay />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Anna")).toBeTruthy());
    expect(screen.queryByRole("dialog", { name: "Kurz-Tour" })).toBeNull();
  });

  it("player can vote in the lobby only once the teacher opened the vote; totals show from round 2", async () => {
    localStorage.setItem("rr-class-player-1234", JSON.stringify({ playerId: "a", token: "t" }));
    localStorage.setItem("rr-class-tour-done", "1");
    const votes: unknown[] = [];
    const vote = { open: true, minutesOptions: [3, 5, 8, 12], budgetOptions: [30, 60, 100, 200], tally: { minutes: { 3: 0, 5: 1, 8: 0, 12: 0 }, budget: { 30: 0, 60: 0, 100: 0, 200: 0 } }, voters: 1, mine: null };
    mockFetch((url, init) => {
      if (url.endsWith("/vote")) { votes.push(JSON.parse(String(init?.body))); return { ok: true }; }
      return roomPayload({ phase: "lobby", trainingEndsAt: 0, round: 2, vote, totals: [{ id: "a", name: "Anna", total: 10, rank: 1, rounds: [10] }] });
    });
    render(<MemoryRouter initialEntries={["/klasse/play/1234"]}><Routes><Route path="/klasse/play/:code" element={<ClassroomPlay />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Stimmt ab!")).toBeTruthy());
    fireEvent.click(screen.getByText("8 Min"));
    await waitFor(() => expect(votes).toEqual([expect.objectContaining({ minutes: 8 })]));
    expect(screen.getByText("Gesamtwertung")).toBeTruthy();
  });

  it("player view stops at the episode budget", async () => {
    localStorage.setItem("rr-class-player-1234", JSON.stringify({ playerId: "a", token: "t" }));
    mockFetch((url) => (url.includes("/submit") ? { totalReward: 0, steps: 1, reachedGoal: false, improved: false, bestReward: 0 } : roomPayload({ episodeBudget: 10 })));
    render(<MemoryRouter initialEntries={["/klasse/play/1234"]}><Routes><Route path="/klasse/play/:code" element={<ClassroomPlay />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("▶ Trainieren")).toBeTruthy());
    fireEvent.click(screen.getByRole("switch", { name: /Schnell/ })); // normal speed would take minutes
    fireEvent.click(screen.getByText("▶ Trainieren"));
    await waitFor(() => expect(screen.getByText("Budget aufgebraucht")).toBeTruthy(), { timeout: 25000 });
    expect(screen.getByText(/Episoden:/).textContent).toMatch(/10\s*\/\s*10/);
    // restarting gives the whole budget back
    fireEvent.click(screen.getByText("↺ Neu starten"));
    await waitFor(() => expect(screen.getByText(/Episoden:/).textContent).toMatch(/0\s*\/\s*10/));
    expect(screen.getByText("▶ Trainieren")).toBeTruthy();
  }, 40000);

  it("host view shows the code and the start button in the lobby", async () => {
    localStorage.setItem("rr-class-host-1234", JSON.stringify("hostkey"));
    mockFetch(() => roomPayload({ phase: "lobby", trainingEndsAt: 0 }));
    render(<MemoryRouter initialEntries={["/klasse/host/1234"]}><Routes><Route path="/klasse/host/:code" element={<ClassroomHost />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("1234")).toBeTruthy());
    expect(screen.getByText("▶ Training starten")).toBeTruthy();
    // QR code pointing at the join link with the room code prefilled
    expect(screen.getByLabelText(/QR-Code zum Beitreten.*klasse\?code=1234/)).toBeTruthy();
    expect(screen.getByText("Einstellungen")).toBeTruthy();
    expect(screen.getByText("Welt neu würfeln")).toBeTruthy();
    await act(async () => {});
  });

  it("host picks a level world and opens the vote in the lobby", async () => {
    localStorage.setItem("rr-class-host-1234", JSON.stringify("hostkey"));
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const vote = { open: false, minutesOptions: [3, 5, 8, 12], budgetOptions: [30, 60, 100, 200], tally: { minutes: {}, budget: {} }, voters: 0, mine: null };
    mockFetch((url, init) => {
      if (init?.method && init.method !== "GET") calls.push({ url, body: JSON.parse(String(init.body ?? "{}")) });
      return roomPayload({ phase: "lobby", trainingEndsAt: 0, vote, levelId: null });
    });
    render(<MemoryRouter initialEntries={["/klasse/host/1234"]}><Routes><Route path="/klasse/host/:code" element={<ClassroomHost />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByLabelText("Welt")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Welt"), { target: { value: "3" } });
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/settings") && c.body.levelId === 3 && (c.body.customWorld as { size: number }).size === 6)).toBe(true));
    fireEvent.click(screen.getByText("Abstimmung freigeben"));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/vote/open") && c.body.open === true)).toBe(true));
    expect(screen.getByText("Beamer-Ansicht öffnen")).toBeTruthy();
  });

  it("host can restart a finished round (same or new world)", async () => {
    localStorage.setItem("rr-class-host-1234", JSON.stringify("hostkey"));
    const calls: Array<{ url: string; body: unknown }> = [];
    mockFetch((url, init) => {
      if (init?.method === "POST") calls.push({ url, body: JSON.parse(String(init.body ?? "{}")) });
      return roomPayload({ phase: "finished" });
    });
    render(<MemoryRouter initialEntries={["/klasse/host/1234"]}><Routes><Route path="/klasse/host/:code" element={<ClassroomHost />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Nochmal – neue Welt")).toBeTruthy());
    expect(screen.queryByText("Einstellungen")).toBeNull();
    fireEvent.click(screen.getByText("↻ Nochmal – gleiche Welt"));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/restart") && (c.body as { newWorld: boolean }).newWorld === false)).toBe(true));
    fireEvent.click(screen.getByText("Nochmal – neue Welt"));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/restart") && (c.body as { newWorld: boolean }).newWorld === true)).toBe(true));
  });
});
