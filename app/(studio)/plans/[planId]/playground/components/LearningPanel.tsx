import { useMemo } from "react";
import type { DailyTask } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Video, ExternalLink, Lightbulb } from "lucide-react";

interface LearningPanelProps {
  activeTask: DailyTask | undefined;
  lessonLoading: boolean;
}

function getVideoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (host.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (host.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean).at(-1);
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function LearningPanel({ activeTask, lessonLoading }: LearningPanelProps) {
  const resources = (activeTask?.online_resources ?? []) as Array<
    string | Record<string, unknown>
  >;
  const resourceMetadata = (activeTask?.resource_metadata ?? {}) as Record<
    string,
    {
      url?: string;
      title?: string;
      content_type?: string;
      excerpt?: string | null;
      verified?: boolean;
    }
  >;

  const primaryResource = resources[0];
  const primaryResourceHref =
    typeof primaryResource === "string"
      ? primaryResource
      : (primaryResource as Record<string, unknown>)?.url ??
        (primaryResource as Record<string, unknown>)?.link ??
        (primaryResource as Record<string, unknown>)?.href;
  const primaryResourceTitle: string =
    typeof primaryResource === "string"
      ? primaryResource
      : typeof (primaryResource as any)?.title === "string" 
        ? (primaryResource as any).title 
        : "Primary Resource";

  const videoEmbed = primaryResourceHref
    ? getVideoEmbedUrl(String(primaryResourceHref))
    : null;

  const contentBlocks = useMemo(() => {
    if (activeTask?.lesson_blocks?.length) {
      return activeTask.lesson_blocks;
    }
    return [
      {
        id: "desc",
        type: "concept",
        title: "Overview",
        content: activeTask?.description || "No description provided.",
      },
    ];
  }, [activeTask]);

  if (!activeTask) {
    return (
      <Card className="h-full border-dashed bg-slate-50/50">
        <CardContent className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Select a task to view learning material.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {activeTask.task_type.replace('_', ' ')}
          </Badge>
          <span className="text-xs text-muted-foreground">{activeTask.estimated_duration_minutes} min</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{activeTask.title}</h2>
        <p className="text-muted-foreground">{activeTask.description}</p>
      </div>

      {videoEmbed ? (
        <Card className="overflow-hidden border-none shadow-md ring-1 ring-black/5">
          <div className="aspect-video w-full bg-slate-950">
            <iframe
              src={videoEmbed}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Task Resource Video"
            />
          </div>
          <div className="bg-slate-50 p-3 text-xs text-slate-500 flex justify-between items-center border-t">
            <span className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Embedded Video Tutorial</span>
            <a href={String(primaryResourceHref)} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary">
              Open source <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </Card>
      ) : primaryResourceHref && (!activeTask.lesson_blocks || activeTask.lesson_blocks.length === 0) ? (
        <Card className="bg-blue-50/30 border-blue-100">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-950">{primaryResourceTitle}</h4>
              <p className="text-sm text-blue-800/80 mt-1 line-clamp-2">
                {((resourceMetadata[String(primaryResourceHref)] as any)?.excerpt as string) || "Click to read the recommended material for this concept."}
              </p>
              <a 
                href={String(primaryResourceHref)} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex mt-3 bg-white border border-blue-200 px-3 py-1.5 rounded-md items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 transition-colors shadow-sm"
              >
                Read Source Material <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {lessonLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-20 w-full animate-pulse rounded bg-slate-100" />
          </div>
        ) : (
          <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-500"></div>
            <div className="px-8 py-6 space-y-8">
              {contentBlocks.filter((b: any) => b.type !== 'exercise').map((block: any, i: number) => (
                <div key={block.id || i} className="group">
                  <h3 className="flex items-center gap-2 text-lg font-bold capitalize text-slate-800 mb-4 border-b pb-2">
                    <Lightbulb className="h-5 w-5 text-indigo-500" />
                    {block.title || block.type}
                  </h3>
                  <div className="prose prose-sm prose-slate md:prose-base max-w-none text-slate-600 leading-relaxed font-serif">
                    {/* Render raw strings, assuming it might be markdown but for now just text */}
                    {block.content.split('\\n').map((paragraph: string, pIdx: number) => (
                      <p key={pIdx} className="mb-4">{paragraph}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
