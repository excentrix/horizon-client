"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AIPersonality } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http-client";

interface PersonalitySelectorProps {
  currentPersonalityId?: string;
  onSelect: (personalityId: string) => void;
  disabled?: boolean;
}

interface PaginatedPersonalities {
  results: AIPersonality[];
}

async function fetchPersonalities(): Promise<AIPersonality[]> {
  const response = await http.get<unknown>("/chat/ai-personalities/");
  const data = response.data;
  
  if (Array.isArray(data)) {
    return data as AIPersonality[];
  }
  
  if (data && typeof data === 'object' && 'results' in data) {
    const paginated = data as PaginatedPersonalities;
    if (Array.isArray(paginated.results)) {
      return paginated.results;
    }
  }
  
  return [];
}

export function PersonalitySelector({
  currentPersonalityId,
  onSelect,
  disabled,
}: PersonalitySelectorProps) {
  const [open, setOpen] = React.useState(false);

  const { data: personalities = [] } = useQuery({
    queryKey: ["ai-personalities"],
    queryFn: fetchPersonalities,
  });

  const selectedPersonality = personalities.find(
    (p) => p.id === currentPersonalityId
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between"
          disabled={disabled}
        >
          {selectedPersonality ? (
            <div className="flex items-center gap-2 truncate">
                <Bot className="h-4 w-4 shrink-0 opacity-50" />
                <span className="truncate">{selectedPersonality.name}</span>
            </div>
          ) : (
            "Select mentor..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search mentor..." />
          <CommandList>
            <CommandEmpty>No mentor found.</CommandEmpty>
            <CommandGroup>
              {personalities.map((personality) => (
                <CommandItem
                  key={personality.id}
                  value={personality.name}
                  onSelect={() => {
                    onSelect(personality.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentPersonalityId === personality.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {personality.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
