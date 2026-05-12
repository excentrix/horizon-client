import type { ExecutionDescriptor } from "@/types";

export type StepId = "ingest" | "micro" | "prove" | "scenario" | "omni" | "verify";
export type EnvMode = "web" | "colab" | "local" | "code_runner" | "diagram" | "canvas";

export interface RuntimeTaskShape {
  task_type?: string;
  lesson_blocks?: unknown[];
  environment_requirements?: Record<string, unknown>;
}

export function resolveSurfaceTypeFromDescriptor(
  descriptor: ExecutionDescriptor | null | undefined,
): string | undefined {
  const surface = descriptor?.surface_type;
  return typeof surface === "string" && surface.trim() ? surface : undefined;
}

function computeLegacyHeuristicSteps(task: RuntimeTaskShape | undefined): StepId[] {
  const taskType = (task?.task_type || "").toLowerCase();
  const envReqs = task?.environment_requirements as Record<string, unknown> | undefined;
  const subject = ((envReqs?.subject_category as string) || "").toLowerCase();
  const hasLesson = (task?.lesson_blocks?.length || 0) > 0;

  const isCoding = /coding|implement|build|develop|program|project/.test(taskType);
  const isConceptual = /reading|concept|study|research|theory|overview|understand/.test(taskType);
  const needsWorkspace = isCoding || subject === "stem";
  const needsPractice = hasLesson || isConceptual;

  const steps: StepId[] = [];
  if (hasLesson || isConceptual) steps.push("ingest");
  if (needsPractice) steps.push("micro");
  steps.push("prove");
  if (needsWorkspace) steps.push("omni");
  steps.push("verify");
  return steps;
}

export function computeSurfaceSteps(
  task: RuntimeTaskShape | undefined,
  descriptor: ExecutionDescriptor | null | undefined,
): StepId[] {
  const surfaceType = resolveSurfaceTypeFromDescriptor(descriptor);
  const hasLesson = (task?.lesson_blocks?.length || 0) > 0;

  switch (surfaceType) {
    case "scene_player":
      return ["ingest", "verify"];
    case "simulation_scenario":
      return hasLesson ? ["ingest", "scenario", "verify"] : ["scenario", "verify"];
    case "flashcard_session":
      return ["ingest", "micro", "verify"];
    case "teachback_session":
      return ["ingest", "prove", "verify"];
    case "diagram_workspace":
    case "canvas_workspace":
      return ["ingest", "omni", "verify"];
    case "code_playground":
      return ["ingest", "micro", "omni", "verify"];
    default:
      return computeLegacyHeuristicSteps(task);
  }
}

export function hasExtendedScenes(task: RuntimeTaskShape | undefined): boolean {
  return (task?.lesson_blocks?.length ?? 0) > 0;
}

export function recommendedEnvForSurface(
  descriptor: ExecutionDescriptor | null | undefined,
  recommended?: EnvMode,
): EnvMode {
  const surfaceType = resolveSurfaceTypeFromDescriptor(descriptor);
  if (surfaceType === "diagram_workspace") return "diagram";
  if (surfaceType === "canvas_workspace") return "canvas";
  if (surfaceType === "code_playground") return recommended ?? "code_runner";
  return recommended ?? "code_runner";
}

export function computeVisibleEnvs(
  category: string | undefined,
  recommended: EnvMode | undefined,
  descriptor: ExecutionDescriptor | null | undefined,
): EnvMode[] {
  const surfaceType = resolveSurfaceTypeFromDescriptor(descriptor);
  const all: EnvMode[] = ["web", "colab", "local", "code_runner", "diagram", "canvas"];

  if (surfaceType === "diagram_workspace") return ["diagram"];
  if (surfaceType === "canvas_workspace") return ["canvas"];
  if (surfaceType === "code_playground") {
    const base = new Set<EnvMode>(["web", "colab", "local", "code_runner"]);
    if (recommended) base.add(recommended);
    return all.filter((m) => base.has(m));
  }

  // compatibility fallback for legacy tasks without descriptor
  if (!category || category === "stem") return all;
  const base = new Set<EnvMode>(["canvas", "diagram"]);
  if (recommended) base.add(recommended);
  if (category === "health" || category === "general") base.add("code_runner");
  return all.filter((m) => base.has(m));
}
