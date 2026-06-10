import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { initVimMode } from 'monaco-vim';
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
  readOnly?: boolean;
  value: string;
  vimMode?: boolean;
}

export default function CodeEditor({
  className,
  onChange,
  onRun,
  readOnly = false,
  value,
  vimMode = false,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const onRunRef = useRef(onRun);
  const vimStatusRef = useRef<HTMLDivElement | null>(null);
  const vimModeRef = useRef<{ dispose: () => void } | null>(null);
  const [editorReady, setEditorReady] = useState(false);
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
    const editor = editorRef.current;
    const statusNode = vimStatusRef.current;
    if (!editorReady || !editor || !statusNode) {
      return;
    }

    vimModeRef.current?.dispose();
    vimModeRef.current = null;

    if (vimMode && !readOnly) {
      vimModeRef.current = initVimMode(editor, statusNode);
    }

    return () => {
      vimModeRef.current?.dispose();
      vimModeRef.current = null;
    };
  }, [editorReady, readOnly, vimMode]);

  useEffect(() => {
    return () => {
      vimModeRef.current?.dispose();
      vimModeRef.current = null;
    };
  }, []);

  return (
    <div className={cn('relative flex min-h-0 flex-col overflow-hidden rounded-md border border-border', className)}>
      <Editor
        height="100%"
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
      <div
        ref={vimStatusRef}
        className={cn(
          'border-t border-border bg-muted/40 px-2 py-0.5 font-mono text-[0.68rem] text-muted-foreground',
          !vimMode && 'hidden'
        )}
      />
    </div>
  );
}
