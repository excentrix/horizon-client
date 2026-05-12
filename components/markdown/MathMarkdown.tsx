"use client";

import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";
import remarkGfm from "remark-gfm";
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
        "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-md [&_table]:border [&_table]:border-slate-200",
        "[&_thead]:bg-slate-100/80 [&_th]:border [&_th]:border-slate-200 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold",
        "[&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_td]:text-xs",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      {...props}
    >
      {children}
    </Streamdown>
  );
}
