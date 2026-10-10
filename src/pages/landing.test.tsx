import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Landing from "./Landing";
import Impressum from "./Impressum";
import { DEMO_WORLD } from "@/components/landing/LiveRover";
import { shortestPathLength } from "@/lib/levelObjectives";
import { worldToState } from "@/lib/competition/world";

afterEach(cleanup);

const Where = () => {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
};

const renderLanding = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe("landing page", () => {
  it("states what the game is and offers the three ways in", () => {
    renderLanding();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Rover.*lernt/);
    expect(screen.getByText("Level")).toBeTruthy();
    expect(screen.getByText("Freies Spiel")).toBeTruthy();
    expect(screen.getByText("Klassen-Challenge", { selector: "h3" })).toBeTruthy();
  });

  it("joins a classroom with the typed code", () => {
    renderLanding();
    fireEvent.change(screen.getByLabelText("Raum-Code"), { target: { value: "12a34" } });
    fireEvent.click(screen.getByText("Beitreten"));
    expect(screen.getByTestId("where").textContent).toBe("/klasse?code=1234");
  });

  it("switches to English", () => {
    renderLanding();
    fireEvent.click(screen.getByLabelText("Switch to English"));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/learns by trying/);
  });

  it("links the imprint from the footer", () => {
    renderLanding();
    expect(screen.getByText("Impressum").getAttribute("href")).toBe("/impressum");
  });

  it("runs a live rover that starts learning", async () => {
    renderLanding();
    await act(async () => { await new Promise((r) => setTimeout(r, 600)); });
    expect(screen.getByLabelText(/Spielfeld, auf dem ein Rover live lernt/)).toBeTruthy();
    expect(screen.getByText("Pause")).toBeTruthy();
  });

  it("uses a demo world that is solvable", () => {
    const len = shortestPathLength(worldToState(DEMO_WORLD).grid, DEMO_WORLD.agent, DEMO_WORLD.goal);
    expect(Number.isFinite(len)).toBe(true);
    expect(len).toBe(10);
  });
});

describe("imprint", () => {
  it("names the provider and a contact", () => {
    render(<MemoryRouter><Impressum /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Impressum");
    expect(screen.getByText(/§ 5 DDG/)).toBeTruthy();
    expect(screen.getByText("Maximilian E. Herrmann", { selector: "strong" })).toBeTruthy();
    expect(screen.getByText("contact@maximilianherrmann.com").getAttribute("href")).toBe("mailto:contact@maximilianherrmann.com");
  });
});
