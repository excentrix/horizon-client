"use client";

import React, { useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css"; // Import minimal styles

import LevelNode from "./nodes/LevelNode";
import RegionNode from "./nodes/RegionNode";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Briefcase, CheckCircle2, Lock, Sparkles, Swords } from "lucide-react";
import { LevelDetailsSheet } from "./LevelDetailsSheet";
import { Roadmap } from "@/types";
import { useGamificationSummary } from "@/hooks/use-gamification";

// RoadmapLevel is imported from LevelDetailsSheet

interface RoadmapJourneyMapProps {
  roadmap: Roadmap;
}

const nodeTypes = {
  level: LevelNode,
  region: RegionNode,
};

const RoadmapJourneyMap = ({ roadmap }: RoadmapJourneyMapProps) => {
  const [selectedLevelId, setSelectedLevelId] = React.useState<string | null>(
    null,
  );
  const { data: gamificationSummary } = useGamificationSummary();
  const badgeCount =
    gamificationSummary?.badge_count ??
    gamificationSummary?.recent_badges?.length ??
    0;

  const selectedLevel = useMemo(() => {
    if (!selectedLevelId) return null;
    for (const stage of roadmap.stages) {
      const found = stage.levels.find((l) => l.id === selectedLevelId);
      if (found) return found;
    }
    return null;
  }, [selectedLevelId, roadmap]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const levelId = node.id.replace("level-", "");
    setSelectedLevelId(levelId);
  }, []);

  // Transform Roadmap data into Nodes and Edges

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const LEVEL_GAP_X = 290;
    const STAGE_GAP_X = 160;
    const LEVEL_BASE_Y = 250;
    const LEVEL_CARD_WIDTH = 220;
    const REGION_PADDING_X = 60;
    const REGION_HEIGHT = 300;
    const REGION_TOP_Y = 145;
    let cursorX = 110;
    let previousLevelId: string | null = null;

    // Process Stages
    roadmap.stages.forEach((stage, stageIndex) => {
      const stageLevelCount = stage.levels.length || 1;
      const stageWidth = Math.max(
        LEVEL_CARD_WIDTH + 30,
        (stageLevelCount - 1) * LEVEL_GAP_X + LEVEL_CARD_WIDTH + 30,
      );
      const regionNodeId = `region-${stage.id}`;
      const stageCompleted = stage.levels.filter(
        (l) => l.status === "completed",
      ).length;
      const stageProgress =
        Math.round((stageCompleted / stageLevelCount) * 100) || 0;

      nodes.push({
        id: regionNodeId,
        type: "region",
        position: { x: cursorX - REGION_PADDING_X, y: REGION_TOP_Y },
        data: {
          title: stage.title,
          subtitle: stage.description,
          progress: stageProgress,
          index: stageIndex + 1,
        },
        style: {
          width: stageWidth + REGION_PADDING_X * 2 - 10,
          height: REGION_HEIGHT,
        },
        draggable: false,
        selectable: false,
      });

      stage.levels.forEach((level, levelIndex) => {
        const absoluteX = cursorX + levelIndex * LEVEL_GAP_X;
        const absoluteY = LEVEL_BASE_Y + (levelIndex % 2 === 0 ? 0 : 18);

        nodes.push({
          id: `level-${level.id}`,
          type: "level",
          data: {
            title: level.title,
            status: level.status,
            isLocked: level.status === "locked",
            levelIndex: level.level_index,
            stageId: stage.id,
            description: level.title,
          },
          position: { x: absoluteX, y: absoluteY },
          zIndex: 10,
        });

        if (previousLevelId) {
          edges.push({
            id: `e-${previousLevelId}-${level.id}`,
            source: `level-${previousLevelId}`,
            target: `level-${level.id}`,
            animated: level.status === "in_progress",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 18,
              height: 18,
              color: level.status === "locked" ? "#94a3b8" : "#3b82f6",
            },
            style: {
              stroke: level.status === "locked" ? "#94a3b8" : "#3b82f6",
              strokeWidth: 3,
            },
          });
        }
        previousLevelId = level.id;
      });

      cursorX += stageWidth + STAGE_GAP_X;
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [roadmap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes and edges when roadmap data changes (important for reactivity)
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Calculate Readiness
  const readiness = useMemo(() => {
    const totalLevels = roadmap.stages.reduce(
      (acc, stage) => acc + stage.levels.length,
      0,
    );
    const completedLevels = roadmap.stages.reduce(
      (acc, stage) =>
        acc + stage.levels.filter((l) => l.status === "completed").length,
      0,
    );
    return Math.round((completedLevels / totalLevels) * 100) || 0;
  }, [roadmap]);

  const levelStats = useMemo(() => {
    const flatLevels = roadmap.stages.flatMap((stage) => stage.levels);
    const completed = flatLevels.filter(
      (level) => level.status === "completed",
    ).length;
    const inProgress = flatLevels.filter(
      (level) => level.status === "in_progress",
    ).length;
    const locked = flatLevels.filter(
      (level) => level.status === "locked",
    ).length;
    return { total: flatLevels.length, completed, inProgress, locked };
  }, [roadmap]);

  return (
    <div className="relative flex h-[62vh] w-full flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-sky-50 via-white to-indigo-50">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.5) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute -top-20 left-[-5%] h-60 w-60 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="absolute bottom-10 right-[-4%] h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between gap-3 border-b bg-white/80 p-3 backdrop-blur">
        <Card className="w-[340px] border-sky-200 bg-white/90 p-2.5 shadow-sm gap-3">
          {/* <div className="mb-2 flex items-center gap-2 text-sky-700">
            <Briefcase className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">Mission</p>
          </div> */}
          {/* <p className="line-clamp-2 font-semibold text-slate-800">{roadmap.target_role || "Career Path"}</p> */}
          <div className="mt-1.5 w-full">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Career Readiness</span>
              <span>{readiness}%</span>
            </div>
            <Progress value={readiness} className="h-2.5" />
          </div>
        </Card>
        <div className="flex items-center gap-2">
          <Badge
            className="border-emerald-200 bg-emerald-50 text-emerald-700"
            variant="outline"
          >
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            {levelStats.completed}/{levelStats.total} Complete
          </Badge>
          <Badge
            className="border-amber-200 bg-amber-50 text-amber-700"
            variant="outline"
          >
            <Swords className="mr-1 h-3.5 w-3.5" />
            {levelStats.inProgress} Active
          </Badge>
          <Badge
            className="border-slate-200 bg-slate-50 text-slate-700"
            variant="outline"
          >
            <Lock className="mr-1 h-3.5 w-3.5" />
            {levelStats.locked} Locked
          </Badge>
          <Badge
            className="border-indigo-200 bg-indigo-50 text-indigo-700"
            variant="outline"
          >
            {badgeCount} {badgeCount === 1 ? "Badge" : "Badges"}
          </Badge>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        
        fitView
        // attributionPosition="bottom-right"
        className="relative z-10"
        minZoom={0.6}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} size={1} color="#bfdbfe" />
        <MiniMap
          className="!bottom-24 !right-0 !h-24 !w-40 !rounded-lg !border !border-slate-200 !bg-white/95"
          pannable
          nodeColor={(node) => {
            const status = String(node.data?.status || "");
            if (status === "completed") return "#10b981";
            if (status === "in_progress") return "#6366f1";
            if (status === "available") return "#38bdf8";
            return "#cbd5e1";
          }}
        />
        <Controls className="!bottom-25 !left-2 !shadow-xl !rounded !border !border-slate-400 !bg-white/95" />
      </ReactFlow>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
        <div className="flex rounded-lg items-center gap-3 border-slate-200 bg-white/95 px-4 py-2 text-xs text-slate-600 shadow-md">
          <div className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-sky-500" /> Available
          </div>
          <div className="inline-flex items-center gap-1">
            <Swords className="h-3.5 w-3.5 text-indigo-500" /> In Progress
          </div>
          <div className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completed
          </div>
          <div className="inline-flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-slate-400" /> Locked
          </div>
        </div>
      </div>

      <LevelDetailsSheet
        level={selectedLevel}
        isOpen={!!selectedLevel}
        onClose={() => setSelectedLevelId(null)}
      />
    </div>
  );
};

export default RoadmapJourneyMap;
