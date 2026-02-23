
'use client';

import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Node,
  Edge,
  Connection,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css'; // Import minimal styles

import LevelNode from './nodes/LevelNode';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Map as MapIcon, Trophy } from 'lucide-react';
import { LevelDetailsSheet } from './LevelDetailsSheet';
import { RoadmapLevel, Roadmap, RoadmapStage } from '@/types';

// RoadmapLevel is imported from LevelDetailsSheet

interface RoadmapJourneyMapProps {
  roadmap: Roadmap;
}

const nodeTypes = {
  level: LevelNode,
};

const RoadmapJourneyMap = ({ roadmap }: RoadmapJourneyMapProps) => {
  const [selectedLevelId, setSelectedLevelId] = React.useState<string | null>(null);
  
  const selectedLevel = useMemo(() => {
    if (!selectedLevelId) return null;
    for (const stage of roadmap.stages) {
        const found = stage.levels.find(l => l.id === selectedLevelId);
        if (found) return found;
    }
    return null;
  }, [selectedLevelId, roadmap]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
      const levelId = node.id.replace('level-', '');
      setSelectedLevelId(levelId);
  }, []);

  // Transform Roadmap data into Nodes and Edges

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    let globalY = 0;
    const LEVEL_HEIGHT = 150;
    const LEVEL_WIDTH = 250;
    
    // Process Stages
    roadmap.stages.forEach((stage, stageIndex) => {
      // Create Group Node for Stage
      const stageNodeId = `stage-${stage.id}`;
      // Calculate height based on levels (simple vertical stack for now)

      // We will layout levels in a zig-zag or snake pattern
      let stageHeight = 0;
      
      stage.levels.forEach((level, levelIndex) => {
        // If position is 0 (default), calculate it
        // Snake pattern: Left -> Right -> Down -> Right -> Left
        const isEveRow = Math.floor(levelIndex / 3) % 2 === 0;
        const colIndex = levelIndex % 3;
        
        const x = isEveRow 
            ? colIndex * LEVEL_WIDTH 
            : (2 - colIndex) * LEVEL_WIDTH;
            
        const y = Math.floor(levelIndex / 3) * LEVEL_HEIGHT;

        const absoluteY = globalY + y + 60; // Offset for stage header
        const absoluteX = x + 50; // Padding

        nodes.push({
          id: `level-${level.id}`,
          type: 'level',
          data: { 
            title: level.title,
            status: level.status,
            isLocked: level.status === 'locked',
            levelIndex: level.level_index,
            stageId: stage.id,
            description: level.title 
          },
          position: { x: absoluteX, y: absoluteY },
          parentId: undefined,// stageNodeId, // Optional: Use grouping if we want containment
          extent: 'parent',
        });

        // Add Edge to previous level
        const prevLevel = stage.levels[levelIndex - 1];
        if (prevLevel) {
           edges.push({
             id: `e-${prevLevel.id}-${level.id}`,
             source: `level-${prevLevel.id}`,
             target: `level-${level.id}`,
             animated: prevLevel.status === 'completed',
             style: { stroke: prevLevel.status === 'completed' ? '#10b981' : '#94a3b8', strokeWidth: 2 },
           });
        } 
        // Cross-stage edge
        else if (stageIndex > 0) {
           const prevStage = roadmap.stages[stageIndex - 1];
           const lastLevelOfPrevStage = prevStage.levels[prevStage.levels.length - 1];
           if (lastLevelOfPrevStage) {
             edges.push({
               id: `e-${lastLevelOfPrevStage.id}-${level.id}`,
               source: `level-${lastLevelOfPrevStage.id}`,
               target: `level-${level.id}`,
               animated: lastLevelOfPrevStage.status === 'completed',
               style: { stroke: '#94a3b8', strokeDasharray: '5,5' },
               label: 'Stage Up',
             });
           }
        }
        
        stageHeight = Math.max(stageHeight, y + LEVEL_HEIGHT);
      });

      // Add Stage "Island" Background (as a Group Node if we wanted, or just separate visual)
      // For now, let's keep it simple and just render nodes. 
      // We can add "Group" nodes later for the "Island" visual.
      
      globalY += stageHeight + 100; // Gap between stages
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
    const totalLevels = roadmap.stages.reduce((acc, stage) => acc + stage.levels.length, 0);
    const completedLevels = roadmap.stages.reduce((acc, stage) => 
        acc + stage.levels.filter(l => l.status === 'completed').length, 0
    );
    return Math.round((completedLevels / totalLevels) * 100) || 0;
  }, [roadmap]);

  return (
    <div className="h-[85vh] w-full flex flex-col relative bg-dot-pattern/5 rounded-xl overflow-hidden border">
        {/* Job Readiness HUD */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
            <Card className="p-4 w-[300px] pointer-events-auto bg-background/95 backdrop-blur shadow-lg border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Career Readiness</h3>
                        <p className="text-xs text-muted-foreground">{roadmap.target_role || "Career Path"}</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                        <span>Market Ready</span>
                        <span>{readiness}%</span>
                    </div>
                    <Progress value={readiness} className="h-2" />
                </div>
            </Card>

            <div className="flex gap-2 pointer-events-auto">
                <Badge variant="outline" className="bg-background/95 backdrop-blur px-3 py-1.5 gap-2 border-primary/20">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>0 Badges</span>
                </Badge>
                <Badge variant="outline" className="bg-background/95 backdrop-blur px-3 py-1.5 gap-2 border-primary/20">
                    <MapIcon className="w-4 h-4 text-blue-500" />
                    <span>Map View</span>
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
        attributionPosition="bottom-right"
        className="bg-dot-pattern"
      >
        <Background gap={20} size={1} />
        <Controls />
      </ReactFlow>

      <LevelDetailsSheet 
        level={selectedLevel} 
        isOpen={!!selectedLevel} 
        onClose={() => setSelectedLevelId(null)} 
      />
    </div>
  );

};

export default RoadmapJourneyMap;
