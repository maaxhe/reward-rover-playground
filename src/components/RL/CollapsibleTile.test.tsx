import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CollapsibleTile, setAllTiles } from "./CollapsibleTile";

beforeEach(() => window.localStorage.clear());

describe("CollapsibleTile", () => {
  it("starts open or closed as configured and toggles", () => {
    render(<CollapsibleTile id="a" title="Titel" defaultOpen={false}><p>Inhalt</p></CollapsibleTile>);
    expect(screen.queryByText("Inhalt")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Titel/ }));
    expect(screen.getByText("Inhalt")).toBeTruthy();
  });

  it("remembers the choice after remount", () => {
    const first = render(<CollapsibleTile id="b" title="T" defaultOpen={false}><p>Inhalt</p></CollapsibleTile>);
    fireEvent.click(screen.getByRole("button"));
    first.unmount();
    render(<CollapsibleTile id="b" title="T" defaultOpen={false}><p>Inhalt</p></CollapsibleTile>);
    expect(screen.getByText("Inhalt")).toBeTruthy();
  });

  it("collapses and expands all tiles at once", () => {
    render(
      <>
        <CollapsibleTile id="c1" title="Eins"><p>A</p></CollapsibleTile>
        <CollapsibleTile id="c2" title="Zwei"><p>B</p></CollapsibleTile>
      </>,
    );
    act(() => setAllTiles("collapse"));
    expect(screen.queryByText("A")).toBeNull();
    expect(screen.queryByText("B")).toBeNull();
    act(() => setAllTiles("expand"));
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
  });
});
