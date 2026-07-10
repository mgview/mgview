import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getMotionGenesisOutputToneClassName,
  parseMotionGenesisOutput,
} from '../core/parseMotionGenesisOutput.ts';
import { cn } from '../lib/utils.ts';

type MotionGenesisRunOutputProps = {
  output: string;
  className?: string;
  autoFollow?: boolean;
};

const MotionGenesisRunOutput = forwardRef<HTMLDivElement, MotionGenesisRunOutputProps>(
  function MotionGenesisRunOutput({ output, className, autoFollow = true }, ref) {
    const [collapsedOutputBlocks, setCollapsedOutputBlocks] = useState<Record<string, boolean>>({});
    const outputAutoFollowRef = useRef(true);
    const outputSegments = useMemo(() => parseMotionGenesisOutput(output), [output]);

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

    const toggleOutputBlock = useCallback((key: string) => {
      setCollapsedOutputBlocks((current) => ({
        ...current,
        [key]: !current[key],
      }));
    }, []);

    useEffect(() => {
      if (!autoFollow) {
        return;
      }

      const outputElement = typeof ref === 'function' ? null : ref?.current;
      if (!outputElement || !outputAutoFollowRef.current) {
        return;
      }

      outputElement.scrollTop = outputElement.scrollHeight;
    }, [autoFollow, output, ref]);

    return (
      <div
        ref={ref}
        className={cn(
          'min-h-0 w-full overflow-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-5 text-foreground',
          className
        )}
        onScroll={(event) => {
          const element = event.currentTarget;
          const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
          outputAutoFollowRef.current = distanceFromBottom <= 12;
        }}
      >
        <div className="whitespace-pre-wrap break-all hyphens-none">
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

            const collapsed = collapsedOutputBlocks[segment.key] ?? segment.collapsedByDefault;
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
  }
);

export default MotionGenesisRunOutput;
