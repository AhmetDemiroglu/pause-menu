import Image from "next/image";
import { Badge } from "@core/components/ui/badge";
import { cn } from "@core/lib/utils";
import { IgdbLogo } from "@core/components/other/igdb-logo";
import brandMarkSrc from "@core/assets/brand-mark.png";
import metacriticLogoSrc from "@core/assets/metacritic_logo.png";
import rawgLogoSrc from "@core/assets/rawg_logo.png";

type ScoreType = 'metacritic' | 'rawg' | 'gghub' | 'igdb';

interface ScoreBadgeProps {
  type: ScoreType;
  score: number | string | null | undefined;
}

const SCORE_LABELS: Record<ScoreType, string> = {
  metacritic: "Metacritic",
  rawg: "RAWG",
  gghub: "Pause Menu",
  igdb: "IGDB",
};

const SQUARE_LOGOS: Partial<Record<ScoreType, typeof rawgLogoSrc>> = {
  metacritic: metacriticLogoSrc,
  rawg: rawgLogoSrc,
  gghub: brandMarkSrc,
};

/**
 * Kaynak etiketi yazi yerine logo: "Pause Menu" iki satira kirilip rozeti asagi itiyor, kart
 * izgarasinda dort sutun hizasi bozuluyordu. Logo satiri sabit yukseklikte (h-5), ad title +
 * sr-only ile korunur. IGDB logosu yatay (~2.08:1), o yuzden yalniz yukseklik alir.
 */
function SourceLogo({ type }: { type: ScoreType }) {
  const square = SQUARE_LOGOS[type];
  return (
    <div className="mb-2 flex h-5 items-center justify-center" title={SCORE_LABELS[type]} aria-hidden="true">
      {square ? (
        <Image src={square} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
      ) : (
        <IgdbLogo className="h-4" />
      )}
    </div>
  );
}

const getScoreStyling = (type: ScoreType, score: number | null | undefined) => {
  if (type === 'gghub') {
    return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
  }
  if (type === 'rawg') {
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  }
  if (type === 'igdb') {
    return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20";
  }

  if (!score) return "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20";
  if (score > 74) return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.3)]";
  if (score > 49) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 shadow-[0_0_8px_rgba(234,179,8,0.3)]";
  return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.3)]";
};

export function ScoreBadge({ type, score }: ScoreBadgeProps) {
  // IGDB puanı 0-100 aralığında gelir (Metacritic gibi tam sayı gösterilir),
  // RAWG ve Pause Menu 0-5 / 0-10 aralığında ondalıklı.
  // 0 = puan yok (RAWG yeterli oy toplanana kadar 0.0 dondurur). "0.0" gostermek
  // oyunu kotu puanli gibi gosteriyordu; kartlar ve hero zaten 0'i gizliyor.
  const scoreValue =
    typeof score === "number" && score <= 0
      ? null
      : typeof score === "number"
      ? type === "rawg" || type === "gghub"
        ? score.toFixed(1)
        : Math.round(score)
      : score;

  return (
    <div className="flex flex-col items-center">
      <SourceLogo type={type} />
      <span className="sr-only">{SCORE_LABELS[type]}</span>
      <Badge variant="outline" className={cn("text-lg font-bold", getScoreStyling(type, typeof score === 'number' ? score : null))}>
        {scoreValue ?? '-'}
      </Badge>
    </div>
  );
}