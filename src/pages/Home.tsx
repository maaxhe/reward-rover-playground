import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, Zap, Target } from "lucide-react";

const HomeContent = () => {
  const { translate } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/30">
        <div className="max-w-full px-8 py-6">
          <h1 className="text-2xl font-semibold">Reward Rover</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mt-1">
            {translate("Reinforcement Learning Visualisiert", "Reinforcement Learning Visualized")}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full">
          {/* Hero */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              {translate("Wie möchtest du spielen?", "How do you want to play?")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {translate(
                "Wähle deinen Spielmodus und beobachte, wie der Rover mit Reinforcement Learning lernt.",
                "Choose your game mode and watch how the rover learns with reinforcement learning."
              )}
            </p>
          </div>

          {/* Mode Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Levels Mode */}
            <Card className="p-6 border-border/40 bg-card/60 hover:bg-card/80 transition-colors cursor-pointer group"
              onClick={() => navigate("/app?mode=levels")}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Levels</h3>
                  <Target className="h-6 w-6 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {translate(
                    "Absolviere vordefinierte Level mit steigendem Schwierigkeitsgrad. Perfekt zum Lernen.",
                    "Complete predefined levels with increasing difficulty. Perfect for learning."
                  )}
                </p>
                <Button className="w-full group/btn" variant="default">
                  {translate("Levels starten", "Start Levels")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>

            {/* Free Mode */}
            <Card className="p-6 border-border/40 bg-card/60 hover:bg-card/80 transition-colors cursor-pointer group"
              onClick={() => navigate("/app?mode=free")}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Free Mode</h3>
                  <Zap className="h-6 w-6 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {translate(
                    "Experimentiere frei. Erstelle deine eigenen Szenarien und teste verschiedene Parameter.",
                    "Experiment freely. Create your own scenarios and test different parameters."
                  )}
                </p>
                <Button className="w-full group/btn" variant="default">
                  {translate("Free Mode starten", "Start Free Mode")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Info Section */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              {translate(
                "Egal welchen Modus du wählst - der Rover lernt mit jedem Versuch!",
                "No matter which mode you choose - the rover learns with every attempt!"
              )}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/20 py-4">
        <div className="max-w-full px-8 text-center text-xs text-muted-foreground">
          <p>Maxim Leopold | Cognitive Science Research</p>
        </div>
      </footer>
    </div>
  );
};

const Home = () => {
  return (
    <LanguageProvider>
      <HomeContent />
    </LanguageProvider>
  );
};

export default Home;
