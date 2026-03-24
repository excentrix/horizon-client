"use client";

import { useEffect, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
  Handle,
  Position,
  NodeProps,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { http } from "@/lib/http-client";
import { Loader2 } from "lucide-react";

// Custom Node for Competencies
const CompetencyNode = ({ data }: NodeProps) => {
  return (
    <div
      className="rounded-xl border-2 px-5 py-3 shadow-sm transition-all hover:scale-105 bg-white"
      style={{ borderColor: data.color as string }}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 opacity-0" />
      <div className="flex flex-col items-center justify-center gap-1">
        <span className="text-sm font-bold text-slate-800">{data.label as string}</span>
        <span 
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: data.color as string }}
        >
          {data.proficiency as string}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 opacity-0" />
    </div>
  );
};

const nodeTypes = {
  competency: CompetencyNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));



interface BackendNode {
  data: {
    id: string;
    label: string;
    proficiency: string;
    color: string;
  };
}

interface BackendEdge {
  data: {
    id: string;
    source: string;
    target: string;
  };
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 150, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: (isHorizontal ? 'left' : 'top') as Position,
      sourcePosition: (isHorizontal ? 'right' : 'bottom') as Position,
      position: {
        x: nodeWithPosition.x - 75,
        y: nodeWithPosition.y - 30,
      },
    };
  });

  return { nodes: newNodes, edges };
};

export function CompetencyBrainMap() {
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
        
        // Map backend data to React Flow props
        const mappedNodes: Node[] = (data.nodes || []).map((n: BackendNode) => ({
          id: n.data.id,
          type: "competency",
          data: {
            label: n.data.label,
            proficiency: n.data.proficiency,
            color: n.data.color,
          },
          position: { x: 0, y: 0 } // Gets overwritten by dagre
        }));

        const mappedEdges: Edge[] = (data.edges || []).map((e: BackendEdge) => ({
          id: e.data.id,
          source: e.data.source,
          target: e.data.target,
          animated: true,
          style: { stroke: "#cbd5e1", strokeWidth: 2 }
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          mappedNodes,
          mappedEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      } catch (err: unknown) {
        const errorVal = err as Error;
        if (mounted) setError(errorVal.message || "Failed to load competencies");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchBrainMap();
    return () => { mounted = false; };
  }, [setEdges, setNodes]);

  if (isLoading) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[600px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
        <p className="font-semibold">Oops!</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full rounded-xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background gap={16} />
        <Controls />
        <MiniMap nodeStrokeColor="#ccc" nodeColor={(n) => n.data?.color as string || "#ccc"} />
      </ReactFlow>
    </div>
  );
}
