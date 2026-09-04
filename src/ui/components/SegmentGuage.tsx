type Props = {
  value: number;
  max: number;
  count: number;
  width: number;
  height?: number;
  on: string;
  tip: string;
  off: string;
  blink?: boolean;
};

export const SegmentGauge = ({
  value,
  max,
  count,
  width,
  height = 184,
  on,
  tip,
  off,
  blink = false,
}: Props) => {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  const lit = Math.ceil(ratio * count);

  return (
    <div
      className={`hud-track flex flex-col-reverse gap-[2px] p-[2px] ${
        blink ? "hud-blink" : ""
      }`}
      style={{ width, height }}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="w-full flex-1"
          style={{
            background: i < lit ? (i === 0 ? tip : on) : off,
          }}
        />
      ))}
    </div>
  );
};
