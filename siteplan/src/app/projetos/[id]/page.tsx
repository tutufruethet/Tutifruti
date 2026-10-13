"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/components/project/ProjectProvider";

/** Abre o projeto na etapa em que ele está. */
export default function ProjectIndex() {
  const { project } = useProject();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/projetos/${project.id}/${project.plan ? "planejamento" : "briefing"}`);
  }, [project.id, project.plan, router]);
  return null;
}
