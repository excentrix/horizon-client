"use client";

import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

export type MathMarkdownProps = ComponentProps<typeof Streamdown>;

export function MathMarkdown({ children, className, ...props }: MathMarkdownProps) {
  return (
    <Streamdown
      className={cn(
        "min-w-0 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
        "[&_p]:min-w-0 [&_p]:max-w-full [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:[overflow-wrap:anywhere]",
        "[&_li]:whitespace-pre-wrap [&_li]:break-words [&_li]:[overflow-wrap:anywhere]",
        "[&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words",
        "[&_code]:whitespace-pre-wrap [&_code]:break-words",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      {...props}
    >
      {children}
    </Streamdown>
  );
}
