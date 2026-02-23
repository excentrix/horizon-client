
import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Lock, Check, Star, Play } from 'lucide-react';

type LevelNodeData = {
  title: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  isLocked: boolean;
  levelIndex: number;
  description?: string;
  stageId?: string;
} & Record<string, unknown>;

const LevelNode = ({ data, selected }: NodeProps<Node<LevelNodeData>>) => {
  const { title, status, isLocked, levelIndex } = data;

  // Visual variants based on status
  const variants = {
    locked: "bg-muted text-muted-foreground border-muted-foreground/30",
    available: "bg-card text-card-foreground border-primary/50 hover:border-primary cursor-pointer shadow-sm",
    in_progress: "bg-primary text-primary-foreground border-primary ring-4 ring-primary/20 shadow-lg scale-105",
    completed: "bg-emerald-500 text-white border-emerald-600 shadow-md",
  };

  const Icon = () => {
    if (status === 'locked') return <Lock className="w-5 h-5" />;
    if (status === 'completed') return <Check className="w-6 h-6 stroke-[3]" />;
    if (status === 'in_progress') return <Play className="w-6 h-6 fill-current" />;
    return <Star className="w-6 h-6" />;
  };

  return (
    <div className={cn(
      "relative w-[180px] h-[100px] rounded-xl border-2 flex flex-col items-center justify-center p-3 text-center transition-all duration-300",
      variants[status],
      selected && "ring-2 ring-ring ring-offset-2",
      isLocked && "grayscale opacity-80"
    )}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-muted-foreground/50 border-none" />
      
      <div className="mb-1">
        <Icon />
      </div>
      
      <div className="font-bold text-sm leading-tight line-clamp-2">
        {title}
      </div>
      
      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center text-xs font-mono font-bold text-muted-foreground shadow-sm z-10">
        {levelIndex}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-muted-foreground/50 border-none" />
    </div>
  );
};

export default memo(LevelNode);
