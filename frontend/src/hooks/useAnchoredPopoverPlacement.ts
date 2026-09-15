import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

const POPOVER_WIDTH = 360;
const VIEWPORT_MARGIN = 56;
const ANCHOR_GAP = 6;
const VIEWPORT_EDGE_GAP = 8;

export function useAnchoredPopoverPlacement(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  popoverRef: RefObject<HTMLElement | null>
) {
  const [placementStyle, setPlacementStyle] = useState<CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
    zIndex: 50,
  });
  const [openUpward, setOpenUpward] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const updatePlacement = () => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) {
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const popoverHeight = popover.offsetHeight;
      const popoverWidth = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_MARGIN);
      const spaceBelow = window.innerHeight - anchorRect.bottom;
      const spaceAbove = anchorRect.top;
      const shouldOpenUpward = spaceBelow < popoverHeight + ANCHOR_GAP + 12 && spaceAbove > spaceBelow;

      setOpenUpward(shouldOpenUpward);

      const desiredTop = shouldOpenUpward
        ? anchorRect.top - popoverHeight - ANCHOR_GAP
        : anchorRect.bottom + ANCHOR_GAP;
      const top = Math.min(
        Math.max(VIEWPORT_EDGE_GAP, desiredTop),
        Math.max(VIEWPORT_EDGE_GAP, window.innerHeight - popoverHeight - VIEWPORT_EDGE_GAP)
      );
      const left = Math.min(
        Math.max(VIEWPORT_EDGE_GAP, anchorRect.right - popoverWidth),
        window.innerWidth - popoverWidth - VIEWPORT_EDGE_GAP
      );

      setPlacementStyle({
        position: 'fixed',
        top,
        left,
        width: popoverWidth,
        maxHeight: window.innerHeight - VIEWPORT_EDGE_GAP * 2,
        overflowY: 'auto',
        zIndex: 50,
        visibility: 'visible',
      });
    };

    updatePlacement();
    const resizeObserver = new ResizeObserver(updatePlacement);
    if (popoverRef.current) {
      resizeObserver.observe(popoverRef.current);
    }
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open, anchorRef, popoverRef]);

  return { placementStyle, openUpward };
}
