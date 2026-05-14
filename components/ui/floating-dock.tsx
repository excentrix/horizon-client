"use client";
/**
 * Note: Use position fixed according to your needs
 * Desktop navbar is better positioned at the bottom
 * Mobile navbar is better positioned at bottom right.
 **/

import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import Link from "next/link";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import { useEffect, useRef, useState } from "react";

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
  autohide = false,
  desktopOrientation = "horizontal",
}: {
  items: {
    title: string;
    icon: React.ReactNode;
    href?: string;
    isActive?: boolean;
    onClick?: () => void;
  }[];
  desktopClassName?: string;
  mobileClassName?: string;
  autohide?: boolean;
  desktopOrientation?: "horizontal" | "vertical";
}) => {
  return (
    <>
      <FloatingDockDesktop
        items={items}
        className={desktopClassName}
        autohide={autohide}
        orientation={desktopOrientation}
      />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: {
    title: string;
    icon: React.ReactNode;
    href?: string;
    isActive?: boolean;
    onClick?: () => void;
  }[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: {
                    delay: idx * 0.05,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    key={item.title}
                    data-dock-item="true"
                    data-dock-title={item.title}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md border border-[color:var(--dock-border)] bg-[color:var(--dock-bg)] text-[color:var(--dock-item)] shadow-[var(--shadow-1)] backdrop-blur transition-colors hover:bg-[color:var(--dock-item-hover-bg)]",
                      item.isActive && "bg-[color:var(--dock-item-hover-bg)] text-[color:var(--dock-item-active)]",
                    )}
                  >
                    <div className="h-4 w-4">{item.icon}</div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      item.onClick?.();
                      setOpen(false);
                    }}
                    data-dock-item="true"
                    data-dock-title={item.title}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md border border-[color:var(--dock-border)] bg-[color:var(--dock-bg)] text-[color:var(--dock-item)] shadow-[var(--shadow-1)] backdrop-blur transition-colors hover:bg-[color:var(--dock-item-hover-bg)]",
                      item.isActive && "bg-[color:var(--dock-item-hover-bg)] text-[color:var(--dock-item-active)]",
                    )}
                  >
                    <div className="h-4 w-4">{item.icon}</div>
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-[color:var(--dock-border)] bg-[color:var(--dock-bg)] text-[color:var(--dock-item)] shadow-[var(--shadow-1)]"
      >
        <IconLayoutNavbarCollapse className="h-5 w-5" />
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
  autohide = false,
  orientation = "horizontal",
}: {
  items: {
    title: string;
    icon: React.ReactNode;
    href?: string;
    isActive?: boolean;
    onClick?: () => void;
  }[];
  className?: string;
  autohide?: boolean;
  orientation?: "horizontal" | "vertical";
}) => {
  const mousePos = useMotionValue(Infinity);
  const [isVisible, setIsVisible] = useState(!autohide);

  useEffect(() => {
    if (!autohide) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Threshold to show the dock (e.g., bottom 80px of the screen)
      const threshold = 80;
      if (window.innerHeight - e.clientY < threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [autohide]);

  return (
    <>
      {autohide && (
        <motion.div
          initial={false}
          animate={{
            opacity: isVisible ? 0 : 1,
            y: isVisible ? 20 : 0,
          }}
          className="fixed bottom-2 left-1/2 z-30 h-1.5 w-12 -translate-x-1/2 rounded-full bg-foreground/20 backdrop-blur-md md:block hidden"
        />
      )}
      <motion.div
        onMouseMove={(e) =>
          mousePos.set(orientation === "vertical" ? e.pageY : e.pageX)
        }
        onMouseLeave={() => mousePos.set(Infinity)}
        animate={
          autohide
            ? {
                y: isVisible ? 0 : 100,
                opacity: isVisible ? 1 : 0,
              }
            : {}
        }
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
        className={cn(
          "mx-auto hidden rounded-2xl border border-[color:var(--dock-border)] bg-[color:var(--dock-bg)] shadow-[var(--shadow-1)] backdrop-blur md:flex",
          orientation === "vertical"
            ? "h-auto w-16 flex-col items-center gap-3 px-3 py-4"
            : "h-16 items-end gap-3 px-4 pb-3",
          className,
        )}
      >
      {items.map((item) => (
        <IconContainer
          mousePos={mousePos}
          orientation={orientation}
          key={item.title}
          {...item}
        />
      ))}
      </motion.div>
    </>
  );
};

function IconContainer({
  mousePos,
  orientation = "horizontal",
  title,
  icon,
  href,
  isActive,
  onClick,
}: {
  mousePos: MotionValue;
  orientation?: "horizontal" | "vertical";
  title: string;
  icon: React.ReactNode;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mousePos, (val) => {
    const bounds =
      ref.current?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0, height: 0 };
    if (orientation === "vertical") {
      return val - bounds.y - bounds.height / 2;
    }
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
  const heightTransformIcon = useTransform(
    distance,
    [-150, 0, 150],
    [20, 40, 20],
  );

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  const shell = (
    <motion.div
      ref={ref}
      style={{ width, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-xl border border-transparent bg-[color:var(--dock-bg)] text-[color:var(--dock-item)] transition-colors",
        hovered && "bg-[color:var(--dock-item-hover-bg)]",
        isActive && "border-[color:var(--dock-border)] bg-[color:var(--dock-item-hover-bg)] text-[color:var(--dock-item-active)]",
      )}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            className="absolute -top-8 left-1/2 w-fit rounded-md border border-[color:var(--dock-border)] bg-card px-2 py-0.5 text-xs whitespace-pre text-foreground shadow-[var(--shadow-1)]"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        style={{ width: widthIcon, height: heightIcon }}
        className="flex items-center justify-center"
      >
        {icon}
      </motion.div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} data-dock-item="true" data-dock-title={title}>
        {shell}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-transparent p-0"
      data-dock-item="true"
      data-dock-title={title}
    >
      {shell}
    </button>
  );
}
