'use client';

interface ScoreCircleProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#84cc16';
  if (score >= 50) return '#f59e0b';
  if (score >= 35) return '#f97316';
  return '#ef4444';
}

function getGradeBg(grade: string): string {
  const map: Record<string, string> = { A: '#dcfce7', B: '#d1fae5', C: '#fef3c7', D: '#ffedd5', F: '#fee2e2' };
  return map[grade] ?? '#f3f4f6';
}

function getGradeColor(grade: string): string {
  const map: Record<string, string> = { A: '#16a34a', B: '#15803d', C: '#d97706', D: '#ea580c', F: '#dc2626' };
  return map[grade] ?? '#6b7280';
}

export function ScoreCircle({ score, size = 160, strokeWidth = 12, label }: ScoreCircleProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold" style={{ color }}>{score}</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">/ 100</span>
        </div>
      </div>
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold"
        style={{ backgroundColor: getGradeBg(grade), color: getGradeColor(grade) }}
      >
        {grade}
      </div>
      {label && <p className="text-xs font-medium text-zinc-500">{label}</p>}
    </div>
  );
}

export function SmallScoreBar({ score, label }: { score: number; label: string }) {
  const color = getScoreColor(score);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-zinc-700">{label}</span>
        <span className="font-semibold" style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
