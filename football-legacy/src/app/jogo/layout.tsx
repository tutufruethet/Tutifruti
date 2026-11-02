import { GameShell } from "@/components/GameShell";

export default function JogoLayout({ children }: { children: React.ReactNode }) {
  return <GameShell>{children}</GameShell>;
}
