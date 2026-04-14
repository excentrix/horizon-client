"use client";

import { useEffect, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Handle,
  Position,
  NodeProps,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { http } from "@/lib/http-client";
import { Loader2 } from "lucide-react";

interface BrainMapNode {
  data: {
    id: string;
    label: string;
    proficiency: string;
    color: string;
  };
}

interface BrainMapEdge {
  data: {
    id: string;
    source: string;
    target: string;
  };
}

// Custom Node for Competencies - rounded pill to look more like nodes
const CompetencyNode = ({ data }: NodeProps) => {
  return (
    <div
      className="rounded-full border-2 px-4 py-2 shadow-sm transition-all hover:scale-105 bg-background hover:shadow-md hover:ring-4 ring-[color:var(--brand-indigo)]/20 cursor-pointer"
      style={{ borderColor: data.color as string }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex flex-col items-center justify-center gap-0.5">
        <span className="text-sm font-semibold text-foreground tracking-tight">{data.label as string}</span>
        <div className="flex gap-1 items-center">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: data.color as string }}
            />
            <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              {data.proficiency as string}
            </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = {
  competency: CompetencyNode,
};

// Physics Simulation for Force-Directed Layout
const runForceLayout = (nodes: Node[], edges: Edge[]) => {
  const radius = 200;
  
  // Custom type to include velocity
  type PhysicsNode = Node & { vx: number; vy: number };
  
  const physicsNodes: PhysicsNode[] = nodes.map((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI;
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: Math.cos(angle) * (radius + Math.random() * 50),
        y: Math.sin(angle) * (radius + Math.random() * 50),
      },
      vx: 0,
      vy: 0,
    };
  });

  const ITERATIONS = 300;
  const REPULSION = 12000; 
  const SPRING_LENGTH = 150;
  const SPRING_K = 0.08;
  const DAMPING = 0.75;
  const GRAVITY = 0.015;

  for (let step = 0; step < ITERATIONS; step++) {
    // 1. Repulsion between all nodes
    for (let i = 0; i < physicsNodes.length; i++) {
        for (let j = i + 1; j < physicsNodes.length; j++) {
            const dx = physicsNodes[i].position.x - physicsNodes[j].position.x;
            const dy = physicsNodes[i].position.y - physicsNodes[j].position.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) dist = 1;
            
            const force = REPULSION / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            physicsNodes[i].vx += fx;
            physicsNodes[i].vy += fy;
            physicsNodes[j].vx -= fx;
            physicsNodes[j].vy -= fy;
        }
    }
    
    // 2. Spring forces along edges
    edges.forEach(edge => {
        const source = physicsNodes.find(n => n.id === edge.source);
        const target = physicsNodes.find(n => n.id === edge.target);
        if (source && target) {
            const dx = target.position.x - source.position.x;
            const dy = target.position.y - source.position.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) dist = 1;
            
            const force = (dist - SPRING_LENGTH) * SPRING_K;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            source.vx += fx;
            source.vy += fy;
            target.vx -= fx;
            target.vy -= fy;
        }
    });

    // 3. Gravity pulling to center & Apply Velocity
    physicsNodes.forEach(node => {
        node.vx += (0 - node.position.x) * GRAVITY;
        node.vy += (0 - node.position.y) * GRAVITY;

        node.position.x += node.vx;
        node.position.y += node.vy;
        
        node.vx *= DAMPING;
        node.vy *= DAMPING;
    });
  }

  // Strip vx/vy for React Flow
  const finalNodes = physicsNodes.map(node => {
     const { vx: _vx, vy: _vy, ...cleanNode } = node;
     return cleanNode as Node;
  });

  return { nodes: finalNodes, edges };
};

export function CompetencyBrainMap({ className }: { className?: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchBrainMap = async () => {
      try {
        setIsLoading(true);
        const { data } = await http.get("/intelligence/brain-map/");
        
        if (!mounted) return;
        
        const mappedNodes: Node[] = data.nodes.map((n: BrainMapNode) => ({
          id: n.data.id,
          type: "competency",
          data: {
            label: n.data.label,
            proficiency: n.data.proficiency,
            color: n.data.color,
          },
          position: { x: 0, y: 0 } 
        }));

        const mappedEdges: Edge[] = data.edges.map((e: BrainMapEdge) => ({
          id: e.data.id,
          source: e.data.source,
          target: e.data.target,
          animated: true,
          style: { stroke: "var(--border)", strokeWidth: 1.5, opacity: 0.6 },
        }));

        // Execute physics simulation synchronously on mount
        const { nodes: layoutedNodes, edges: layoutedEdges } = runForceLayout(
          mappedNodes,
          mappedEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      } catch (err) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "Failed to load competencies";
          setError(message);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchBrainMap();
    return () => { mounted = false; };
  }, [setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-background ${className || "h-[600px] w-full"}`}>
        <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-mono-ui">Simulating graph physics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive ${className || "h-[600px] w-full"}`}>
        <p className="font-semibold">Neural Link Failed</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-background ${className || "h-[600px] w-full"}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        className="[&_.react-flow__pane]:cursor-grab"
      >
        <Background gap={24} color="var(--border)" size={1.5} />
      </ReactFlow>
    </div>
  );
}
