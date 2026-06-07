import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import Badge from "../ui/Badge";
import Logo from "../ui/Logo";

interface HeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
  plan?: "FREE" | "PRO";
  right?: ReactNode;
}

export function Header({
  showBack = false,
  onBack,
  title,
  plan,
  right,
}: HeaderProps): JSX.Element {
  return (
    <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-white sticky top-0 z-30">
      <div className="flex items-center gap-2.5 min-w-0">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="-ml-2 p-2 rounded-full text-text-secondary hover:bg-surface hover:text-text-primary transition"
          >
            <ChevronLeft size={18} />
          </button>
        ) : (
          <Logo size={32} />
        )}
        <div className="min-w-0">
          <div className="text-sm font-bold text-text-primary leading-none truncate">
            {title ?? "NeuroSecure"}
          </div>
          {!title && (
            <div className="text-[10px] text-text-muted leading-none mt-1">
              Privacy Protection
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {right}
        {plan === "PRO" ? (
          <Badge variant="pro" icon={<span>⚡</span>}>
            Pro
          </Badge>
        ) : plan === "FREE" ? (
          <Badge variant="free">Free</Badge>
        ) : null}
      </div>
    </header>
  );
}

export default Header;
