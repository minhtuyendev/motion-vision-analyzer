import { Atom } from "lucide-react";

export function AppHeader() {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
          <Atom className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">
            AI Motion <span className="text-gradient">Analyzer</span>
          </h1>
          <p className="text-xs text-muted-foreground leading-tight">
            Phân tích chuyển động cơ học từ video thực nghiệm
          </p>
        </div>
      </div>
    </header>
  );
}
