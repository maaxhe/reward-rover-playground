import { RLGame } from "@/components/RL/RLGame";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen">
      <RLGame />

      {/* Über mich Box */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="rounded-3xl border border-border bg-card/95 p-6 shadow-xl backdrop-blur-sm text-center transition-colors duration-200 hover:border-primary/30">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">👋 Über mich</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-2xl mx-auto">
            Ich bin Maxim Leopold, Cognitive Scientist mit Fokus auf Neuro- und KI-Forschung.
            Neben Projekten wie dem Reward Rover schreibe ich über Neuroscience, Künstliche Intelligenz und Gesellschaft.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="font-semibold"
            onClick={() => window.open('https://www.maximleopold.com', '_blank', 'noopener,noreferrer')}
          >
            👉 Mehr auf meiner Website
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
