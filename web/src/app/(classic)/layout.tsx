import { ClassicShell } from "@/components/classic-shell";

// Pages that keep the classic design: the ones the Twenty design doesn't cover (compare, stats, ideas,
// places and categories detail…) and, for visitors who chose it, every page (see src/proxy.ts).
export default function ClassicLayout({ children }: LayoutProps<"/">) {
  return <ClassicShell>{children}</ClassicShell>;
}
