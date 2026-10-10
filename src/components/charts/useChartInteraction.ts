/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Chart Interaction Hook: Snapping Crosshair, Tooltip Alignment, and Drag Navigation
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export interface ChartInteractionProps {
  pointCount: number;
  chartWidth: number;
  chartHeight: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export function useChartInteraction({
  pointCount,
  chartWidth,
  chartHeight,
  padding,
}: ChartInteractionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragCurrentIndex, setDragCurrentIndex] = useState<number | null>(null);

  const plotWidth = Math.max(1, chartWidth - padding.left - padding.right);
  const plotHeight = Math.max(1, chartHeight - padding.top - padding.bottom);

  // Converts pixel X to nearest point index
  const getIndexFromX = useCallback(
    (clientX: number): number => {
      if (!containerRef.current || pointCount <= 1) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left - padding.left;
      const clampedX = Math.max(0, Math.min(plotWidth, relativeX));
      const fraction = clampedX / plotWidth;
      const rawIndex = Math.round(fraction * (pointCount - 1));
      return Math.max(0, Math.min(pointCount - 1, rawIndex));
    },
    [pointCount, padding.left, plotWidth]
  );

  // Calculates exact pixel X for an index
  const getXFromIndex = useCallback(
    (index: number): number => {
      if (pointCount <= 1) return padding.left + plotWidth / 2;
      return padding.left + (index / (pointCount - 1)) * plotWidth;
    },
    [pointCount, padding.left, plotWidth]
  );

  // Pointer event handlers
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const idx = getIndexFromX(e.clientX);
      setActiveIndex(idx);
      setIsHovered(true);

      if (isDragging) {
        setDragCurrentIndex(idx);
      }
    },
    [getIndexFromX, isDragging]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Primary button or touch
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const idx = getIndexFromX(e.clientX);
      setIsDragging(true);
      setDragStartIndex(idx);
      setDragCurrentIndex(idx);
      setActiveIndex(idx);
    },
    [getIndexFromX]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (!isDragging) {
      setIsHovered(false);
      setActiveIndex(null);
    }
  }, [isDragging]);

  // Global mouseup listener for dragging outside element
  useEffect(() => {
    const handleGlobalUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, []);

  // Compute selection brush if dragging
  let brushStartPx: number | null = null;
  let brushEndPx: number | null = null;
  if (isDragging && dragStartIndex !== null && dragCurrentIndex !== null) {
    const x1 = getXFromIndex(Math.min(dragStartIndex, dragCurrentIndex));
    const x2 = getXFromIndex(Math.max(dragStartIndex, dragCurrentIndex));
    brushStartPx = x1;
    brushEndPx = x2;
  }

  const resetSelection = useCallback(() => {
    setDragStartIndex(null);
    setDragCurrentIndex(null);
    setIsDragging(false);
  }, []);

  return {
    containerRef,
    activeIndex,
    setActiveIndex,
    isHovered,
    isDragging,
    dragStartIndex,
    dragCurrentIndex,
    brushStartPx,
    brushEndPx,
    plotWidth,
    plotHeight,
    getXFromIndex,
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    handlePointerLeave,
    resetSelection,
  };
}
