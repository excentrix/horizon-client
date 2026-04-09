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
      className={cn("[&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      {...props}
    >
      {children}
    </Streamdown>
  );
}
