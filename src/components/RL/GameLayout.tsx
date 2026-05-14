import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GameLayoutProps = {
  header: ReactNode;
  sidebar: ReactNode;
  mainContent: ReactNode;
  modeIndicator?: ReactNode;
};

export function GameLayout({
  header,
  sidebar,
  mainContent,
  modeIndicator,
}: GameLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Professional Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Reward Rover</h1>
              {modeIndicator}
            </div>
            {header}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Settings & Controls */}
        <aside
          className={cn(
            "border-r border-border bg-card/30 transition-all duration-300 overflow-y-auto",
            sidebarOpen ? "w-80" : "w-0"
          )}
        >
          <div className="p-6 space-y-6">
            {sidebar}
          </div>
        </aside>

        {/* Main Game Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 h-full">
            {mainContent}
          </div>
        </main>
      </div>

      {/* Floating Sidebar Toggle (Mobile) */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-6 right-6 lg:hidden p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors z-40"
        aria-label="Toggle sidebar"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
}
