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

  it("player view trains, shows leaderboard and submits a Q-table", async () => {
    localStorage.setItem("rr-class-player-1234", JSON.stringify({ playerId: "a", token: "t" }));
    const submits: unknown[] = [];
    mockFetch((url, init) => {
      if (url.includes("/submit")) { submits.push(JSON.parse(String(init?.body))); return { totalReward: 5, steps: 10, reachedGoal: false, improved: true, bestReward: 5 }; }
      return roomPayload();
    });
    render(<MemoryRouter initialEntries={["/klasse/play/1234"]}><Routes><Route path="/klasse/play/:code" element={<ClassroomPlay />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Anna")).toBeTruthy());
    fireEvent.click(screen.getByText("▶ Trainieren"));
    await waitFor(() => expect(screen.getByText(/Episoden:/).textContent).toMatch(/Episoden:\s*[1-9]/), { timeout: 3000 });
    fireEvent.click(screen.getByText("✓ Jetzt werten"));
    await waitFor(() => expect(submits.length).toBeGreaterThan(0));
    expect(Object.keys((submits[0] as { qTable: object }).qTable).length).toBeGreaterThan(0);
  });

  it("player view stops at the episode budget", async () => {
    localStorage.setItem("rr-class-player-1234", JSON.stringify({ playerId: "a", token: "t" }));
    mockFetch((url) => (url.includes("/submit") ? { totalReward: 0, steps: 1, reachedGoal: false, improved: false, bestReward: 0 } : roomPayload({ episodeBudget: 10 })));
    render(<MemoryRouter initialEntries={["/klasse/play/1234"]}><Routes><Route path="/klasse/play/:code" element={<ClassroomPlay />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("▶ Trainieren")).toBeTruthy());
    fireEvent.click(screen.getByText("▶ Trainieren"));
    await waitFor(() => expect(screen.getByText("Budget aufgebraucht")).toBeTruthy(), { timeout: 5000 });
    expect(screen.getByText(/Episoden:/).textContent).toMatch(/10\s*\/\s*10/);
  });

  it("host view shows the code and the start button in the lobby", async () => {
    localStorage.setItem("rr-class-host-1234", JSON.stringify("hostkey"));
    mockFetch(() => roomPayload({ phase: "lobby", trainingEndsAt: 0 }));
    render(<MemoryRouter initialEntries={["/klasse/host/1234"]}><Routes><Route path="/klasse/host/:code" element={<ClassroomHost />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("1234")).toBeTruthy());
    expect(screen.getByText("▶ Training starten")).toBeTruthy();
    // QR code pointing at the join link with the room code prefilled
    expect(screen.getByLabelText(/QR-Code zum Beitreten.*klasse\?code=1234/)).toBeTruthy();
    await act(async () => {});
  });
});
