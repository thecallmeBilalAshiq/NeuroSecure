import logoPng from "data-base64:../../../assets/icon.png";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

/**
 * Renders the official NeuroSecure logo (shield + laptop). The image is
 * inlined as base64 at build time so it works equally well in the popup,
 * options page, and any future content-script overlay.
 */
export function Logo({
  size = 56,
  showWordmark = false,
  className,
}: LogoProps): JSX.Element {
  return (
    <div className={["flex flex-col items-center gap-2", className].filter(Boolean).join(" ")}>
      <img
        src={logoPng}
        alt="NeuroSecure"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
        className="select-none"
        draggable={false}
      />
      {showWordmark && (
        <div className="text-center leading-none">
          <div
            className="text-[20px] font-extrabold tracking-tight"
            style={{
              background:
                "linear-gradient(135deg,#06B6D4 0%,#10B981 45%,#F59E0B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            NeuroSecure
          </div>
        </div>
      )}
    </div>
  );
}

export default Logo;
