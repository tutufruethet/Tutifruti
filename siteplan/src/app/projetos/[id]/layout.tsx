import { Suspense } from "react";
import { ProjectRoot } from "@/components/project/ProjectShell";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <ProjectRoot>{children}</ProjectRoot>
    </Suspense>
  );
}
