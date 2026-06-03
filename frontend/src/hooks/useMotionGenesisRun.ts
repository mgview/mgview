import { useEffect, useRef, useState } from 'react';
import type { MotionGenesisRunOptions, MotionGenesisRunState } from '../api/localFiles.ts';
import {
  getMotionGenesisRun,
  sendMotionGenesisInput,
  startMotionGenesisRun,
  stopMotionGenesisRun,
} from '../api/localFiles.ts';

const DEFAULT_RUN_OPTIONS: MotionGenesisRunOptions = {
  autoQuit: true,
  autoDefaultValues: false,
  debug: false,
};

function shouldAutoSendDefault(run: MotionGenesisRunState | null): boolean {
  if (!run || !run.options.autoDefaultValues || !run.canSendInput || run.status !== 'waiting-input') {
    return false;
  }

  return /Enter INPUT value for\s+/u.test(run.output);
}

export function useMotionGenesisRun(onRunSucceeded?: () => Promise<void> | void) {
  const [run, setRun] = useState<MotionGenesisRunState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<MotionGenesisRunOptions>(DEFAULT_RUN_OPTIONS);
  const [starting, setStarting] = useState(false);
  const [sendingInput, setSendingInput] = useState(false);
  const [stopping, setStopping] = useState(false);
  const successHandledRef = useRef<string | null>(null);
  const lastAutoSubmittedPromptRef = useRef<string | null>(null);

  useEffect(() => {
    if (!run || (run.status !== 'running' && run.status !== 'waiting-input')) {
      return;
    }

    let cancelled = false;
    const timer = window.setInterval(() => {
      void getMotionGenesisRun(run.id)
        .then(async (nextRun) => {
          if (cancelled) {
            return;
          }

          setRun(nextRun);
          if (nextRun.status === 'success' && successHandledRef.current !== nextRun.id) {
            successHandledRef.current = nextRun.id;
            await onRunSucceeded?.();
          }
        })
        .catch((pollError) => {
          if (!cancelled) {
            setError(pollError instanceof Error ? pollError.message : 'Could not poll Motion Genesis run.');
          }
        });
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [onRunSucceeded, run]);

  useEffect(() => {
    if (!shouldAutoSendDefault(run) || sendingInput) {
      return;
    }

    const promptKey = `${run.id}:${run.output.length}`;
    if (lastAutoSubmittedPromptRef.current === promptKey) {
      return;
    }
    lastAutoSubmittedPromptRef.current = promptKey;

    void sendMotionGenesisInput(run.id, '')
      .then((nextRun) => {
        setRun(nextRun);
      })
      .catch((sendError) => {
        setError(sendError instanceof Error ? sendError.message : 'Could not send Motion Genesis input.');
      });
  }, [run, sendingInput]);

  const beginRun = async (scenePath: string, simulationSettings: string) => {
    setStarting(true);
    setError(null);
    successHandledRef.current = null;
    lastAutoSubmittedPromptRef.current = null;

    try {
      const nextRun = await startMotionGenesisRun(scenePath, simulationSettings, options);
      setRun(nextRun);
      setInput('');
      return nextRun;
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Could not start Motion Genesis.');
      return null;
    } finally {
      setStarting(false);
    }
  };

  const submitInput = async () => {
    if (!run) {
      return false;
    }

    setSendingInput(true);
    setError(null);

    try {
      const nextRun = await sendMotionGenesisInput(run.id, input);
      setRun(nextRun);
      setInput('');
      return true;
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send Motion Genesis input.');
      return false;
    } finally {
      setSendingInput(false);
    }
  };

  const stopRun = async () => {
    if (!run) {
      return false;
    }

    setStopping(true);
    setError(null);

    try {
      const nextRun = await stopMotionGenesisRun(run.id);
      setRun(nextRun);
      return true;
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : 'Could not stop Motion Genesis.');
      return false;
    } finally {
      setStopping(false);
    }
  };

  return {
    beginRun,
    error,
    input,
    options,
    run,
    sendingInput,
    setError,
    setInput,
    setOptions,
    starting,
    stopRun,
    stopping,
    submitInput,
  };
}
