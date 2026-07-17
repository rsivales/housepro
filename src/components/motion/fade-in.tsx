"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

type FadeInProps = HTMLMotionProps<"div"> & {
  /** Delay before the animation starts, in seconds. */
  delay?: number;
  /** Vertical offset (px) the element travels from. */
  y?: number;
};

/**
 * Lightweight scroll/enter reveal used across HousePro marketing surfaces.
 * Animates once when the element enters the viewport.
 */
export function FadeIn({
  delay = 0,
  y = 16,
  children,
  ...props
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
