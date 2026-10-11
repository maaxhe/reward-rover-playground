import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { RealRobotsCard } from "./RealRobots";

const renderCard = () => render(<LanguageProvider><RealRobotsCard /></LanguageProvider>);

describe("RealRobotsCard", () => {
  it("loads nothing from YouTube until a video is clicked", () => {
    const { container } = renderCard();
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByText(/Echte Roboter ansehen/));
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getAllByText(/Video laden/)[0]);
    const frames = container.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    expect(frames[0].src).toContain("youtube-nocookie.com/embed/");
  });

  it("shows the four main videos and hides the extras until asked", () => {
    renderCard();
    fireEvent.click(screen.getByText(/Echte Roboter ansehen/));
    expect(screen.getAllByText(/Video laden/)).toHaveLength(4);
    fireEvent.click(screen.getByText("Weitere Videos"));
    expect(screen.getAllByText(/Video laden/)).toHaveLength(7);
  });
});
