import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowUpToLine, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import type { MotionGenesisRunStatus } from '../api/localFiles.ts';
import {
  getMotionGenesisOutputToneClassName,
  parseMotionGenesisOutput,
} from '../core/parseMotionGenesisOutput.ts';
import { cn } from '../lib/utils.ts';
import { Button } from './ui/button.tsx';

type MotionGenesisRunOutputProps = {
  output: string;
  className?: string;
  autoFollow?: boolean;
  runId?: string | null;
  runStatus?: MotionGenesisRunStatus | 'idle';
  showToolbar?: boolean;
  waitingInputOverlay?: ReactNode;
};

function getLastOdeBlockKey(segments: ReturnType<typeof parseMotionGenesisOutput>): string | null {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment?.type === 'ode-block') {
      return segment.key;
    }
  }
  return null;
}

function isOdeBlockCollapsed(
  segment: Extract<ReturnType<typeof parseMotionGenesisOutput>[number], { type: 'ode-block' }>,
  collapsedOutputBlocks: Record<string, boolean>
): boolean {
  return collapsedOutputBlocks[segment.key] ?? segment.collapsedByDefault;
}

function applyParserCollapseDefaults(
  segments: ReturnType<typeof parseMotionGenesisOutput>,
  current: Record<string, boolean>
): Record<string, boolean> {
  const next = { ...current };
  for (const segment of segments) {
    if (segment.type !== 'ode-block') {
      continue;
    }
    next[segment.key] = segment.collapsedByDefault;
  }
  return next;
}

const MotionGenesisRunOutput = forwardRef<HTMLDivElement, MotionGenesisRunOutputProps>(
  function MotionGenesisRunOutput(
    {
      output,
      className,
      autoFollow = true,
      runId = null,
      runStatus = 'idle',
      showToolbar = false,
      waitingInputOverlay = null,
    },
    ref
  ) {
    const [collapsedOutputBlocks, setCollapsedOutputBlocks] = useState<Record<string, boolean>>({});
    const outputAutoFollowRef = useRef(true);
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevRunStatusRef = useRef(runStatus);
    const outputSegments = useMemo(() => parseMotionGenesisOutput(output), [output]);
    const lastOdeBlockKey = useMemo(() => getLastOdeBlockKey(outputSegments), [outputSegments]);
    const odeBlockSegments = useMemo(
      () => outputSegments.filter((segment) => segment.type === 'ode-block'),
      [outputSegments]
    );

    const allOdeBlocksCollapsed = useMemo(() => {
      if (odeBlockSegments.length === 0) {
        return false;
      }
      return odeBlockSegments.every((segment) => isOdeBlockCollapsed(segment, collapsedOutputBlocks));
    }, [collapsedOutputBlocks, odeBlockSegments]);

    useEffect(() => {
      setCollapsedOutputBlocks({});
      prevRunStatusRef.current = 'idle';
    }, [runId]);

    useEffect(() => {
      setCollapsedOutputBlocks((current) => {
        let changed = false;
        const next = { ...current };

        for (const segment of outputSegments) {
          if (segment.type !== 'ode-block' || segment.key in next) {
            continue;
          }
          next[segment.key] = segment.collapsedByDefault;
          changed = true;
        }

        return changed ? next : current;
      });
    }, [outputSegments]);

    useEffect(() => {
      const previousStatus = prevRunStatusRef.current;
      prevRunStatusRef.current = runStatus;

      if (runStatus === 'waiting-input' && previousStatus !== 'waiting-input') {
        setCollapsedOutputBlocks((current) => {
          const next = applyParserCollapseDefaults(outputSegments, current);
          if (lastOdeBlockKey) {
            next[lastOdeBlockKey] = false;
          }
          return next;
        });
        return;
      }

      const runEnded =
        (previousStatus === 'running' || previousStatus === 'waiting-input') &&
        (runStatus === 'success' || runStatus === 'failed');

      const waitingEnded = previousStatus === 'waiting-input' && runStatus === 'running';

      if (runEnded || waitingEnded) {
        setCollapsedOutputBlocks((current) => applyParserCollapseDefaults(outputSegments, current));
      }
    }, [lastOdeBlockKey, outputSegments, runStatus]);

    const toggleOutputBlock = useCallback(
      (key: string) => {
        setCollapsedOutputBlocks((current) => {
          const segment = odeBlockSegments.find((entry) => entry.key === key);
          const collapsed = segment ? isOdeBlockCollapsed(segment, current) : true;
          return {
            ...current,
            [key]: !collapsed,
          };
        });
      },
      [odeBlockSegments]
    );

    const toggleAllOdeBlocks = useCallback(() => {
      const collapse = !allOdeBlocksCollapsed;
      setCollapsedOutputBlocks((current) => {
        const next = { ...current };
        for (const segment of odeBlockSegments) {
          next[segment.key] = collapse;
        }
        return next;
      });
    }, [allOdeBlocksCollapsed, odeBlockSegments]);

    const scrollToTop = useCallback(() => {
      const outputElement = scrollRef.current;
      if (outputElement) {
        outputElement.scrollTop = 0;
      }
    }, []);

    const scrollToBottom = useCallback(() => {
      const outputElement = scrollRef.current;
      if (outputElement) {
        outputElement.scrollTop = outputElement.scrollHeight;
      }
    }, []);

    useEffect(() => {
      if (!autoFollow) {
        return;
      }

      const outputElement = scrollRef.current;
      const content = contentRef.current;
      if (!outputElement || !content) {
        return;
      }

      const followBottom = () => {
        if (!outputAutoFollowRef.current) {
          return;
        }
        outputElement.scrollTop = outputElement.scrollHeight;
      };

      const observer = new ResizeObserver(() => {
        followBottom();
      });
      observer.observe(content);
      followBottom();

      return () => observer.disconnect();
    }, [autoFollow, output]);

    const assignScrollRef = useCallback(
      (node: HTMLDivElement | null) => {
        scrollRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const outputBody = (
      <div
        ref={assignScrollRef}
        className={cn(
          'h-full min-h-0 w-full overflow-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-5 text-foreground',
          !showToolbar && className
        )}
        onScroll={(event) => {
          const element = event.currentTarget;
          const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
          outputAutoFollowRef.current = distanceFromBottom <= 12;
        }}
      >
        <div ref={contentRef} className="whitespace-pre-wrap break-all hyphens-none">
          {outputSegments.map((segment) => {
            if (segment.type === 'line') {
              return (
                <span
                  key={segment.key}
                  className={cn('block', getMotionGenesisOutputToneClassName(segment.tone))}
                >
                  {segment.line.length > 0 ? segment.line : ' '}
                </span>
              );
            }

            const collapsed = isOdeBlockCollapsed(segment, collapsedOutputBlocks);
            return (
              <div key={segment.key} className="mb-1 rounded-md border border-border/70 bg-muted/10">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted/20"
                  onClick={() => toggleOutputBlock(segment.key)}
                >
                  <span
                    className={cn(
                      'min-w-0 flex-1 whitespace-pre-wrap break-all hyphens-none',
                      getMotionGenesisOutputToneClassName('input')
                    )}
                  >
                    {segment.commandLine}
                  </span>
                  <span className="shrink-0 uppercase tracking-wide">
                    {collapsed ? `Show ${segment.lines.length} lines` : 'Hide ODE data'}
                  </span>
                </button>
                {!collapsed ? (
                  <div className="border-t border-border/60 px-2 py-1">
                    {segment.lines.map((line) => (
                      <span
                        key={line.key}
                        className={cn('block', getMotionGenesisOutputToneClassName(line.tone))}
                      >
                        {line.line.length > 0 ? line.line : ' '}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );

    if (!showToolbar) {
      return outputBody;
    }

    return (
      <div className={cn('grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden', className)}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Run Output</div>
          <div className="flex flex-wrap items-center gap-1">
            {odeBlockSegments.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[0.68rem]"
                onClick={toggleAllOdeBlocks}
              >
                {allOdeBlocksCollapsed ? (
                  <>
                    <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden />
                    Expand all
                  </>
                ) : (
                  <>
                    <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden />
                    Collapse all
                  </>
                )}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-[0.68rem]"
              aria-label="Scroll to top"
              onClick={scrollToTop}
            >
              <ArrowUpToLine className="h-3.5 w-3.5" aria-hidden />
              Top
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-[0.68rem]"
              aria-label="Scroll to bottom"
              onClick={scrollToBottom}
            >
              <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
              Bottom
            </Button>
          </div>
        </div>
        <div className="relative h-full min-h-0 overflow-hidden">
          {outputBody}
          {waitingInputOverlay}
        </div>
      </div>
    );
  }
);

export default MotionGenesisRunOutput;
