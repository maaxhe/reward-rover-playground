import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ValueIterationDemo } from "./ValueIterationDemo";

afterEach(cleanup);

const de = (d: string) => d;
const renderDemo = () => render(<ValueIterationDemo translate={de} />);

describe("ValueIterationDemo", () => {
  it("knows nothing before the first sweep, then the goal's value starts to travel", () => {
    renderDemo();
    expect(screen.getByText(/Noch weiß der Planer nichts/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ein Durchgang" }));
    expect(screen.getByText(/Durchgang 1:/)).toBeTruthy();
    // after one sweep only the neighbours of the goal carry a value (goal reward 100)
    expect(screen.getAllByText("100").length).toBeGreaterThan(0);
  });

  it("settles after enough sweeps and then offers no further sweep", () => {
    renderDemo();
    const sweep = screen.getByRole("button", { name: "Ein Durchgang" }) as HTMLButtonElement;
    for (let i = 0; i < 80 && !sweep.disabled; i++) fireEvent.click(sweep);
    expect(sweep.disabled).toBe(true);
    expect(screen.getByText(/Fertig nach/)).toBeTruthy();
  });

  it("start over clears all values again", () => {
    renderDemo();
    fireEvent.click(screen.getByRole("button", { name: "Ein Durchgang" }));
    fireEvent.click(screen.getByRole("button", { name: /Von vorn/ }));
    expect(screen.getByText(/Noch weiß der Planer nichts/)).toBeTruthy();
  });
});
