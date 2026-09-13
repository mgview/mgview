import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import type { Monaco } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import {
  getMotionGenesisEditorTheme,
  motionGenesisLanguageId,
  registerMotionGenesisMonaco,
} from '../core/mgLanguage/registerMotionGenesisMonaco.ts';
import { cn } from '../lib/utils.ts';
import { useTheme } from './ThemeProvider.tsx';

interface CodeEditorProps {
  className?: string;
  onChange: (value: string) => void;
  onRun?: () => void | Promise<void>;
  onVimModeLoadError?: (error: unknown) => void;
  readOnly?: boolean;
  value: string;
  vimMode?: boolean;
}

export default function CodeEditor({
  className,
  onChange,
  onRun,
  onVimModeLoadError,
  readOnly = false,
  value,
  vimMode = false,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const onRunRef = useRef(onRun);
  const vimStatusRef = useRef<HTMLDivElement | null>(null);
  const vimModeRef = useRef<{ dispose: () => void } | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [vimModeReady, setVimModeReady] = useState(false);
  const appTheme = theme === 'dark' ? 'dark' : 'light';
  const editorTheme = getMotionGenesisEditorTheme(appTheme);

  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const handleBeforeMount: BeforeMount = (monaco) => {
    registerMotionGenesisMonaco(monaco);
    monacoRef.current = monaco;
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.setTheme(editorTheme);
    setEditorReady(true);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      void onRunRef.current?.();
    });
  };

  useEffect(() => {
    monacoRef.current?.editor.setTheme(editorTheme);
  }, [editorTheme]);

  useEffect(() => {
    const container = containerRef.current;
    const editor = editorRef.current;
    if (!container || !editor) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;
      editor.layout({
        width: Math.max(0, Math.floor(width)),
        height: Math.max(0, Math.floor(height)),
      });
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [editorReady]);

  useEffect(() => {
    const editor = editorRef.current;
    const statusNode = vimStatusRef.current;
    if (!editorReady || !editor || !statusNode) {
      return;
    }

    vimModeRef.current?.dispose();
    vimModeRef.current = null;
    setVimModeReady(false);
    let cancelled = false;

    if (vimMode && !readOnly) {
      void import('monaco-vim')
        .then(({ initVimMode }) => {
          if (!cancelled) {
            vimModeRef.current = initVimMode(editor, statusNode);
            setVimModeReady(true);
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            console.error('Unable to load Vim editor bindings.', error);
            onVimModeLoadError?.(error);
          }
        });
    }

    return () => {
      cancelled = true;
      vimModeRef.current?.dispose();
      vimModeRef.current = null;
    };
  }, [editorReady, onVimModeLoadError, readOnly, vimMode]);

  // Needed to fix bug with vim normal mode commands requiring confirmation.
  useEffect(() => {
    const statusNode = vimStatusRef.current;
    if (!editorReady || !vimMode || readOnly || !statusNode) {
      return;
    }

    let focusFrame: number | null = null;
    let observedInput: HTMLInputElement | null = null;
    const handleConfirmationKeyDown = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        !observedInput?.parentElement?.textContent?.includes('(y/n/a/q/l)') ||
        !/^[ynqal]$/.test(event.key)
      ) {
        return;
      }

      // monaco-vim's confirmation handler compares native DOM key names with
      // uppercase values. Normal typing reports lowercase keys, so forward an
      // uppercase equivalent instead of letting the valid response be ignored.
      event.preventDefault();
      event.stopImmediatePropagation();
      observedInput.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code: event.code,
          key: event.key.toUpperCase(),
          shiftKey: event.shiftKey,
        })
      );
    };

    const focusVimInput = () => {
      const input = statusNode.querySelector('input');
      if (!input) {
        return;
      }

      if (input !== observedInput) {
        observedInput?.removeEventListener('keydown', handleConfirmationKeyDown, true);
        observedInput = input;
        observedInput.addEventListener('keydown', handleConfirmationKeyDown, true);
      }
      input.setAttribute('aria-label', 'Vim command input');
      if (focusFrame !== null) {
        cancelAnimationFrame(focusFrame);
      }
      // monaco-vim focuses prompts while Monaco is still handling the key that
      // opened them. Restore prompt focus after that editor event has finished.
      focusFrame = requestAnimationFrame(() => {
        focusFrame = null;
        if (input.isConnected) {
          input.focus({ preventScroll: true });
        }
      });
    };

    const mutationObserver = new MutationObserver(focusVimInput);
    mutationObserver.observe(statusNode, { childList: true, subtree: true });

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof HTMLInputElement) {
        focusVimInput();
      }
    };
    statusNode.addEventListener('pointerdown', handlePointerDown);
    focusVimInput();

    return () => {
      mutationObserver.disconnect();
      statusNode.removeEventListener('pointerdown', handlePointerDown);
      observedInput?.removeEventListener('keydown', handleConfirmationKeyDown, true);
      if (focusFrame !== null) {
        cancelAnimationFrame(focusFrame);
      }
    };
  }, [editorReady, readOnly, vimMode]);

  useEffect(() => {
    return () => {
      vimModeRef.current?.dispose();
      vimModeRef.current = null;
    };
  }, []);

  return (
    <div className={cn('relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border', className)}>
      <div ref={containerRef} className="min-h-0 min-w-0 flex-1">
        <Editor
          height="100%"
          width="100%"
          language={motionGenesisLanguageId}
          theme={editorTheme}
          value={value}
          onChange={(nextValue) => onChange(nextValue ?? '')}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          options={{
            automaticLayout: true,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
            lineNumbers: 'on',
            minimap: { enabled: false },
            readOnly,
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
      <div
        ref={vimStatusRef}
        className={cn(
          'border-t border-border bg-muted/40 px-2 py-0.5 font-mono text-[0.68rem] text-muted-foreground',
          (!vimMode || !vimModeReady) && 'hidden'
        )}
      />
    </div>
  );
}
