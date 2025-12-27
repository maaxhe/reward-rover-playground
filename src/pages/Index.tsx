import { RLGame } from "@/components/RL/RLGame";
import { Button } from "@/components/ui/button";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";

const IndexContent = () => {
  const { translate } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex flex-col">
        <RLGame />
      </main>

      {/* Über mich Box */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="rounded-3xl border border-border bg-card/95 p-6 shadow-xl backdrop-blur-sm text-center transition-colors duration-200 hover:border-primary/30">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            👋 {translate("Über mich", "About me")}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-2xl mx-auto">
            {translate(
              "Ich bin Maxim Leopold, Cognitive Scientist mit Fokus auf Neuro- und KI-Forschung. Neben Projekten wie dem Reward Rover schreibe ich über Neuroscience, Künstliche Intelligenz und Gesellschaft.",
              "I'm Maxim Leopold, a Cognitive Scientist focused on neuroscience and AI research. Besides projects like Reward Rover, I write about neuroscience, artificial intelligence, and society."
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="font-semibold"
            onClick={() => window.open('https://www.maximleopold.com', '_blank', 'noopener,noreferrer')}
          >
            👉 {translate("Mehr auf meiner Website", "More on my website")}
          </Button>
        </div>
      </section>
    </div>
  );
};

const Index = () => {
  return (
    <LanguageProvider>
      <IndexContent />
    </LanguageProvider>
  );
};

export default Index;
