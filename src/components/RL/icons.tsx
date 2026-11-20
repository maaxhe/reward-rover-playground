import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Own icons instead of emoji. Same visual language as the shapes on the board
 * (see .rr-* in index.css): flat, bold, one ink colour taken from the text.
 */
type IconProps = { className?: string };

const Svg = ({ className, children, filled = false }: IconProps & { children: ReactNode; filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="1.1em"
    height="1.1em"
    fill={filled ? "currentColor" : "none"}
    stroke={filled ? "none" : "currentColor"}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable="false"
    className={cn("inline-block shrink-0 align-[-0.18em]", className)}
  >
    {children}
  </svg>
);

/** Reward: the diamond from the board. */
export const RewardIcon = ({ className }: IconProps) => (
  <Svg className={className} filled>
    <rect x="6" y="6" width="12" height="12" rx="1.6" transform="rotate(45 12 12)" />
  </Svg>
);

/** Penalty: the cross from the board. */
export const PenaltyIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M6 6l12 12M18 6L6 18" strokeWidth={4.2} strokeLinecap="butt" />
  </Svg>
);

/** Wall: a hatched block. */
export const WallIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4.500 11.500l7-7M6 18l12-12M12.500 19.500l7-7" strokeWidth={1.8} />
  </Svg>
);

/** Portal: rings, as on the board. */
export const PortalIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="8.500" />
    <circle cx="12" cy="12" r="4.500" />
    <circle cx="12" cy="12" r="1.300" fill="currentColor" stroke="none" />
  </Svg>
);

/** Beam: the rover jumps to another tile. */
export const BeamIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
    <rect x="10" y="10" width="4" height="4" rx="0.800" fill="currentColor" stroke="none" />
  </Svg>
);

export const LockIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="5" y="10.500" width="14" height="10" rx="2.200" />
    <path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500" />
    <path d="M12 14.500v2" />
  </Svg>
);

export const PlayIcon = ({ className }: IconProps) => (
  <Svg className={className} filled>
    <path d="M7.500 4.600a1 1 0 0 1 1.520-.850l11 7.400a1 1 0 0 1 0 1.700l-11 7.400a1 1 0 0 1-1.520-.850z" />
  </Svg>
);

export const PauseIcon = ({ className }: IconProps) => (
  <Svg className={className} filled>
    <rect x="5.500" y="4" width="4.500" height="16" rx="1.200" />
    <rect x="14" y="4" width="4.500" height="16" rx="1.200" />
  </Svg>
);

export const DownloadIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 4v11M7.500 11l4.500 4.500 4.500-4.500M5 20h14" />
  </Svg>
);

/** RLHF steps. */
export const AnswerIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 6.500A2.500 2.500 0 0 1 6.500 4h11A2.500 2.500 0 0 1 20 6.500v7a2.500 2.500 0 0 1-2.500 2.500H11l-4.500 4v-4A2.500 2.500 0 0 1 4 13.500z" />
    <path d="M8.500 8.700h7M8.500 11.700h4" strokeWidth={1.8} />
  </Svg>
);

export const PickIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="3.500" y="5" width="7" height="14" rx="1.800" />
    <rect x="13.500" y="5" width="7" height="14" rx="1.800" fill="currentColor" />
  </Svg>
);

export const PointsIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="6.500" y="6.500" width="11" height="11" rx="1.600" transform="rotate(45 12 12)" />
    <path d="M12 9.500v5M9.500 12h5" strokeWidth={1.900} />
  </Svg>
);

export const RisingIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 18l5.500-5.500 3.500 3.500L20 9" />
    <path d="M15 9h5v5" />
  </Svg>
);

const MEDAL_FILL = ["#f5c518", "#c3ccd4", "#d08a4e"];

/** Places 1 to 3 get a medal, everything after that the plain number. */
export const RankBadge = ({ rank, suffix = "" }: { rank: number; suffix?: string }) => {
  if (rank < 1 || rank > 3) return <>{`${rank}${suffix}`}</>;
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.15em"
      height="1.15em"
      role="img"
      aria-label={`Platz ${rank}`}
      className="inline-block shrink-0 align-[-0.2em]"
    >
      <path d="M7 2h4l2 6H9zM13 2h4l-2 6h-4z" fill="currentColor" opacity="0.850" />
      <circle cx="12" cy="14.500" r="7.500" fill={MEDAL_FILL[rank - 1]} stroke="#12352a" strokeWidth="1.600" />
      <text
        x="12"
        y="18.300"
        textAnchor="middle"
        fontSize="10.500"
        fontWeight="800"
        fill="#12352a"
        fontFamily="inherit"
      >
        {rank}
      </text>
    </svg>
  );
};
