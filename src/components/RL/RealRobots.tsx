import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface RobotVideo {
  id: string;
  title: [string, string];
  channel: string;
  /** What the kids should recognise from their own rover. */
  link: [string, string];
}

const MAIN: RobotVideo[] = [
  {
    id: "x4O8pojMF0w",
    title: ["Eine Roboterhand löst den Zauberwürfel", "A robot hand solves the Rubik's Cube"],
    channel: "OpenAI",
    link: [
      "Die Hand hat das nicht einprogrammiert bekommen. Sie hat es in der Simulation millionenfach probiert, genau wie dein Rover Episode für Episode. Belohnt wurde jeder Fortschritt am Würfel.",
      "The hand was not programmed to do this. It tried it millions of times in simulation, just like your rover episode after episode. Every bit of progress on the cube was rewarded.",
    ],
  },
  {
    id: "I44_zbEwz_w",
    title: ["Atlas läuft, rennt und krabbelt", "Atlas walks, runs and crawls"],
    channel: "Boston Dynamics",
    link: [
      "Atlas nutzt Regeln, die per Reinforcement Learning trainiert wurden. Das sind die Pfeile deines Rovers, nur für Gelenke statt für Felder. Gelungene Bewegung = Belohnung, Hinfallen = Strafe.",
      "Atlas uses policies trained with reinforcement learning. These are your rover's arrows, just for joints instead of tiles. A good move is rewarded, falling over is punished.",
    ],
  },
  {
    id: "DrNcXgoFv20",
    title: ["Optimus findet seinen Weg", "Optimus finds its way"],
    channel: "Tesla",
    link: [
      "Start, Ziel, Hindernisse, Menschen im Weg: Das ist dein Spielfeld in groß. Frag dich beim Schauen: Was davon hat der Roboter selbst gelernt, und was ist gut inszeniert?",
      "Start, goal, obstacles, people in the way: your game board, only bigger. While watching ask yourself: what did the robot learn itself, and what is just well staged?",
    ],
  },
  {
    id: "r0oCfSm4gHk",
    title: ["Figure 02 lernt natürlich zu gehen", "Figure 02 learns to walk naturally"],
    channel: "Figure 02",
    link: [
      "Auch hier wurde das Gehen in der Simulation geübt und dann auf den echten Roboter übertragen („Sim-to-Real“). Wie dein Rover braucht er erst viel Neugier (ε) und wird später sicherer.",
      "Here too walking was practised in simulation and then moved to the real robot (“sim-to-real”). Like your rover it needs lots of curiosity (ε) first and gets more confident later.",
    ],
  },
];

const MORE: Array<Pick<RobotVideo, "id" | "channel" | "title">> = [
  { id: "QyJGXc9WeNo", channel: "OpenAI", title: ["Die Roboterhand wird beim Würfeln gestört", "The robot hand gets disturbed while solving"] },
  { id: "xKK5ze3FukQ", channel: "Boston Dynamics", title: ["Wie lernt Atlas?", "How does Atlas learn?"] },
  { id: "cpraXaw7dyc", channel: "Tesla", title: ["Optimus Gen 2", "Optimus Gen 2"] },
];

/** The iframe only exists after a click, so YouTube sees nothing until then. */
function Video({ id, title }: { id: string; title: string }) {
  const { translate: t } = useLanguage();
  const [playing, setPlaying] = useState(false);
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-secondary/40">
      {playing ? (
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center transition hover:bg-secondary/70"
        >
          <span className="text-4xl">▶️</span>
          <span className="text-sm font-semibold">{t("Video laden und abspielen", "Load and play video")}</span>
          <span className="text-xs text-muted-foreground">{t("Erst beim Klick wird YouTube geladen.", "YouTube is only loaded when you click.")}</span>
        </button>
      )}
    </div>
  );
}

export function RealRobots({ className }: { className?: string }) {
  const { translate: t } = useLanguage();
  const [showMore, setShowMore] = useState(false);
  return (
    <div className={className}>
      <div className="grid gap-6 md:grid-cols-2">
        {MAIN.map((v) => (
          <figure key={v.id} className="space-y-2">
            <Video id={v.id} title={t(...v.title)} />
            <figcaption className="space-y-1">
              <p className="font-semibold">
                {t(...v.title)} <span className="text-sm font-normal text-muted-foreground">· {v.channel}</span>
              </p>
              <p className="text-sm text-muted-foreground">{t(...v.link)}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-6">
        <Button variant="ghost" size="sm" onClick={() => setShowMore((s) => !s)}>
          {showMore ? t("Weniger anzeigen", "Show less") : t("Weitere Videos", "More videos")}
        </Button>
        {showMore && (
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {MORE.map((v) => (
              <figure key={v.id} className="space-y-1">
                <Video id={v.id} title={t(...v.title)} />
                <figcaption className="text-sm">
                  {t(...v.title)} <span className="text-muted-foreground">· {v.channel}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {t(
          "Demo-Videos zeigen oft die besten Versuche, manche Roboter werden auch ferngesteuert. Frag dich immer: Was hat die Maschine wirklich selbst gelernt?",
          "Demo videos often show the best attempts, and some robots are remote-controlled. Always ask: what did the machine really learn on its own?",
        )}
      </p>
    </div>
  );
}

/** Collapsed card for the end of a classroom round. */
export function RealRobotsCard() {
  const { translate: t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border/40 bg-card/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">{t("Und in echt?", "And in real life?")}</h2>
          <p className="text-sm text-muted-foreground">{t("Echte Roboter lernen nach demselben Prinzip.", "Real robots learn by the same principle.")}</p>
        </div>
        <Button variant="outline" className="h-11" onClick={() => setOpen((o) => !o)}>
          🤖 {open ? t("Zuklappen", "Close") : t("Echte Roboter ansehen", "See real robots")}
        </Button>
      </div>
      {open && <RealRobots className="mt-4" />}
    </div>
  );
}
