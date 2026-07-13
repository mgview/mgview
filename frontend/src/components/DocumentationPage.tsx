import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, BookOpenText, Download, FlaskConical, MessageCircleWarning, PanelsTopLeft } from 'lucide-react';
import { getHomePath, getLabPath, inAppLinkProps } from '../core/appRoutes.ts';
import buildInfo from '../generated/buildInfo.ts';
import { cn } from '../lib/utils.ts';
import { Button } from './ui/button.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.tsx';

const MGVIEW_SOURCE_URL = 'https://github.com/mgview/mgview';
const MGVIEW_ISSUES_URL = `${MGVIEW_SOURCE_URL}/issues`;
const MGVIEW_RELEASES_URL = `${MGVIEW_SOURCE_URL}/releases`;
const MGVIEW_RELEASE_DOWNLOAD_URL = `${MGVIEW_SOURCE_URL}/releases/download/v${buildInfo.version}/mgview-${buildInfo.version}.zip`;
const MGVIEW_SAMPLES_URL = `${MGVIEW_SOURCE_URL}/tree/master/samples`;

const DOC_TABS = [
  { id: 'setup', label: 'Setup' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'sim-runner', label: 'Sim Runner' },
  { id: 'mglab', label: 'MGLab' },
  { id: 'mg-tips', label: 'MG Tips' },
] as const;

type DocTabId = (typeof DOC_TABS)[number]['id'];

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

const shortcutItems = [
  { keys: 'Space', description: 'Play or pause the active timeline.' },
  { keys: 'Cmd/Ctrl+O', description: 'Open the workspace load dialog.' },
  { keys: 'Cmd/Ctrl+S', description: 'Save the current scene when save is available.' },
  { keys: 'Cmd/Ctrl+Z', description: 'Undo the latest scene edit.' },
  { keys: 'Cmd/Ctrl+Shift+Z / Cmd/Ctrl+Y', description: 'Redo the latest undone edit.' },
  { keys: 'Alt+L', description: 'Open the Layout menu.' },
  { keys: 'Alt+1 / Alt+2', description: 'Show or hide the 3D View and Plots panes.' },
  { keys: 'Alt+3 / Alt+4', description: 'Show Scene Editor or Sim Editor (mutually exclusive).' },
  { keys: 'Esc', description: 'Close / clear selection.' },
] as const;

const advancedProjectFolderExample = `cd /Applications/MotionGenesis
mkdir project1
cd project1
ls      # Confirm it shows /Applications/MotionGenesis/project1
# Use the editor of your choice to create your MG sim file (e.g. myproject.txt) in the project1 folder.
../MotionGenesis myproject.txt`;

const advancedOdeSubpathExample = `ODE() case1/my_data

# Change some initial conditions or constants.

ODE() case2/my_data`;

const advancedOutputTreeExample = `<MotionGenesis folder>/project1/case1/my_data.{1,...,n}
<MotionGenesis folder>/project1/case2/my_data.{1,...,n}`;

function readTabFromHash(): DocTabId {
  const hash = window.location.hash.replace(/^#/, '');
  const match = DOC_TABS.find((tab) => tab.id === hash);
  return match?.id ?? 'setup';
}

function DocArticle({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn('rounded-2xl border border-border bg-card p-5 shadow-sm', className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </article>
  );
}

export default function DocumentationPage() {
  const [activeTab, setActiveTab] = useState<DocTabId>(() =>
    typeof window !== 'undefined' ? readTabFromHash() : 'setup'
  );

  useEffect(() => {
    const onHashChange = () => {
      setActiveTab(readTabFromHash());
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleTabChange = (value: string) => {
    const tab = value as DocTabId;
    setActiveTab(tab);

    const url = new URL(window.location.href);
    url.hash = tab;
    window.history.replaceState(null, '', url.toString());
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <BookOpenText className="h-3.5 w-3.5" />
                  Documentation
                </div>
                <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 font-mono text-[0.72rem] text-muted-foreground">
                  v{buildInfo.version}
                </span>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">MGView</h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                  MGView displays simulation outputs in a browser-based 3D viewer with plots and editing tools.
                </p>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                  With a Motion Gensis license, you can also edit and run Motion Genesis
                  simulations, then visualize the results without leaving your browser.
                </p>
              </div>
            </div>

            <nav
              className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[14.5rem]"
              aria-label="Documentation actions"
            >
              <Button asChild variant="outline" className="w-full justify-start">
                <a href={getHomePath()} {...inAppLinkProps}>
                  <ArrowLeft className="h-4 w-4" />
                  Open App
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <a href={getLabPath()} {...inAppLinkProps}>
                  <FlaskConical className="h-4 w-4" />
                  Open MGLab
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <a href={MGVIEW_RELEASE_DOWNLOAD_URL}>
                  <Download className="h-4 w-4" />
                  Download Release v{buildInfo.version}
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <a href={MGVIEW_ISSUES_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircleWarning className="h-4 w-4" />
                  Report an Issue
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <a href={MGVIEW_SOURCE_URL} target="_blank" rel="noopener noreferrer">
                  <GitHubIcon className="h-4 w-4" />
                  Source Code
                </a>
              </Button>
            </nav>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="min-h-0">
          <nav
            className="sticky top-0 z-10 rounded-2xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80"
            aria-label="Documentation sections"
          >
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 border-b-0 pb-0">
              {DOC_TABS.map(({ id, label }) => (
                <TabsTrigger key={id} value={id} className="px-3 py-1.5 text-xs sm:text-sm">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </nav>

          <TabsContent value="setup" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <DocArticle title="Installation (once only)">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">1. Install Node.js</h3>
                    <p className="mt-1">
                      MGView uses a small local server, so Node.js needs to be installed first.
                    </p>
                    <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                      <li>
                        Download <span className="font-medium">Node.js 20 or later</span> (current LTS
                        recommended) from{' '}
                        <a
                          className="text-primary underline-offset-4 hover:underline"
                          href="https://nodejs.org/en/download"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          nodejs.org
                        </a>
                        . Interactive Run Sim / MG Lab sessions need this version for the bundled PTY
                        module.
                      </li>
                      <li>
                        <span className="font-semibold italic">Run</span> the node installer on your machine.
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">2. Install MGView</h3>
                    <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                      <li>
                        Download{' '}
                        <a
                          className="text-primary underline-offset-4 hover:underline"
                          href={MGVIEW_RELEASE_DOWNLOAD_URL}
                        >
                          mgview-{buildInfo.version}.zip
                        </a>
                        , or browse{' '}
                        <a
                          className="text-primary underline-offset-4 hover:underline"
                          href={MGVIEW_RELEASES_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          all releases on GitHub
                        </a>
                        .
                      </li>
                      <li>
                        You can put the MGView folder anywhere you want. The usual default is to unzip it
                        inside your MotionGenesis folder:
                        <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                          <li>
                            macOS: <code>/Applications/MotionGenesis</code>
                          </li>
                          <li>
                            Windows: <code>C:\MotionGenesis</code>
                          </li>
                        </ul>
                      </li>
                      <li>
                        Unzip the file wherever you chose. It extracts to a folder named{' '}
                        <code>mgview-{buildInfo.version}</code>. (Optional: delete the .zip file afterward.)
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">3. Updating MGView</h3>
                    <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                      <li>Delete (or rename) the old MGView folder, then repeat step 2 above.</li>
                      <li>
                        Keep your own simulation files outside the MGView folder so you can
                        delete or update MGView without losing your data.
                      </li>
                    </ul>
                  </div>
                </div>
              </DocArticle>

              <DocArticle title="Running">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">On macOS</h3>
                    <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                      <li>
                        In Finder, go to your MGView folder and double-click{' '}
                        <code>RunMGViewMac</code>.
                        <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                          <li>
                            Or in Terminal (default install location):{' '}
                            <code>/Applications/MotionGenesis/mgview-{buildInfo.version}/RunMGViewMac</code>
                          </li>
                        </ul>
                      </li>
                      <li>
                        The first launch is often blocked by macOS Gatekeeper. Control-click → Open usually does{' '}
                        <span className="font-semibold italic">not</span> work for this launcher. Instead:
                        <ol className="mt-1 list-decimal list-outside space-y-1 pl-5">
                          <li>
                            Try opening <code>RunMGViewMac</code> once (double-click). macOS will refuse and may say
                            the developer cannot be verified.
                          </li>
                          <li>
                            Open <span className="font-medium text-foreground">System Settings → Privacy &amp; Security</span>.
                          </li>
                          <li>
                            Scroll to the security message about <code>RunMGViewMac</code> and click{' '}
                            <span className="font-medium text-foreground">Allow Anyway</span> (or{' '}
                            <span className="font-medium text-foreground">Open Anyway</span>).
                          </li>
                          <li>Open <code>RunMGViewMac</code> again and confirm when prompted.</li>
                        </ol>
                      </li>
                      <li>
                        If a browser tab does not open automatically, open{' '}
                        <code>http://localhost:8000/mgview/</code> in any browser.
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">On Windows</h3>
                    <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                      <li>Open the MGView folder in File Explorer.</li>
                      <li>
                        Before the first run, unblock the launcher so Smart App Control (or similar) does not block it:
                        <ol className="mt-1 list-decimal list-outside space-y-1 pl-5">
                          <li>
                            Right-click <code>RunMGViewWindows.bat</code> →{' '}
                            <span className="font-medium text-foreground">Properties</span>.
                          </li>
                          <li>
                            Near the bottom of the General tab, check{' '}
                            <span className="font-medium text-foreground">Unblock</span>, then click{' '}
                            <span className="font-medium text-foreground">OK</span>.
                          </li>
                        </ol>
                      </li>
                      <li>
                        Double-click <code>RunMGViewWindows.bat</code>.
                      </li>
                      <li>If Windows asks about permissions for the local server, allow it.</li>
                      <li>
                        If a browser tab does not open automatically, open{' '}
                        <code>http://localhost:8000/mgview/</code> in any browser.
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/25 px-3 py-2.5">
                    <p>
                      <span className="font-semibold text-foreground">Online demo vs local server.</span> The public
                      demo at{' '}
                      <a
                        className="text-primary underline-offset-4 hover:underline"
                        href="https://mgview.github.io/mgview/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        mgview.github.io/mgview
                      </a>{' '}
                      is read-only. Running Motion Genesis, saving scenes, and creating sim files require the local
                      server started by <code>RunMGViewMac</code> or <code>RunMGViewWindows.bat</code>.
                    </p>
                  </div>
                </div>
              </DocArticle>
            </div>
          </TabsContent>

          <TabsContent value="quick-start" className="mt-4">
            <DocArticle title="Quick Start">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Explore the UI</h3>
                  <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                    <li>
                      Open the <span className="font-semibold text-foreground">Scene</span> menu and choose{' '}
                      <code>Examples…</code> to try bundled demos.
                    </li>
                    <li>
                      Press <code>Space</code> to play or pause the timeline.
                    </li>
                    <li>
                      Use the layout button{' '}
                      <span
                        className="mx-0.5 inline-flex h-6 w-6 translate-y-px items-center justify-center rounded-md border border-border bg-muted/40 text-foreground"
                        title="Layout"
                        aria-hidden
                      >
                        <PanelsTopLeft className="h-3.5 w-3.5" />
                      </span>{' '}
                      in the header (<code>Alt+L</code>) to show or hide the{' '}
                      <span className="font-semibold text-foreground">3D View</span>,{' '}
                      <span className="font-semibold text-foreground">Plots</span>,{' '}
                      <span className="font-semibold text-foreground">Scene Editor</span>, and{' '}
                      <span className="font-semibold text-foreground">Sim Editor</span> panes (
                      <code>Alt+1</code> / <code>Alt+2</code> / <code>Alt+3</code> / <code>Alt+4</code>).
                    </li>
                    <li>
                      In the editor rail, pick a frame or point under{' '}
                      <span className="font-semibold text-foreground">Objects</span>, then select a geometry
                      by clicking its name chip under{' '}
                      <span className="font-semibold text-foreground">Geometries</span> (or click the chip again to
                      rename).
                    </li>
                    <li>
                      Change type, position, size, and color in the{' '}
                      <span className="font-semibold text-foreground">Editor</span> tab to see how geometry
                      properties affect the 3D view.
                    </li>
                    <li>
                      In the plots area, click <code>Add panel</code>, then choose channels to chart against
                      time or another channel.
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Next steps</h3>
                  <p className="mt-1">
                    To run a Motion Genesis simulation and visualize it, open the{' '}
                    <span className="font-semibold text-foreground">Sim Runner</span> tab. For editing a sim file
                    without a scene, open the <span className="font-semibold text-foreground">MGLab</span> tab or{' '}
                    <a className="text-primary underline-offset-4 hover:underline" href={getLabPath()} {...inAppLinkProps}>
                      launch MGLab
                    </a>
                    .
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Keyboard shortcuts</h3>
                  <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                    {shortcutItems.map(({ keys, description }) => (
                      <div
                        key={keys}
                        className="grid grid-cols-[minmax(6.5rem,9rem)_1fr] items-baseline gap-x-2 text-xs sm:text-sm"
                      >
                        <dt>
                          <code className="text-foreground">{keys}</code>
                        </dt>
                        <dd className="leading-5">{description}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </DocArticle>
          </TabsContent>

          <TabsContent value="sim-runner" className="mt-4">
            <DocArticle title="Run simulations in MGView">
              <div className="space-y-4">
                <p>
                  The <span className="font-semibold text-foreground">Sim Editor</span> pane lets you link a Motion
                  Genesis input file to a workspace scene, edit it in-app, run it with live terminal output, and import
                  the resulting animation data for playback.
                </p>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Run and visualize (recommended)</h3>
                  <ol className="mt-1 list-decimal list-outside space-y-2 pl-5">
                    <li>
                      Start MGView with the local server (see the <span className="font-semibold text-foreground">Setup</span>{' '}
                      tab). Motion Genesis must be installed with an active license file.
                    </li>
                    <li>
                      In the <span className="font-semibold text-foreground">Scene</span> menu, choose{' '}
                      <code>New…</code> or <code>Open…</code> to create or load a workspace scene JSON file in the
                      folder where you keep your project.
                    </li>
                    <li>
                      Open the <span className="font-semibold text-foreground">Sim Editor</span> pane from the Layout
                      menu (<code>Alt+4</code>).
                    </li>
                    <li>
                      Click <code>Configure</code> and link a <code>.al</code> or <code>.txt</code> sim file. Use{' '}
                      <code>New Sim File</code> in the picker to scaffold a starter input file next to your scene.
                    </li>
                    <li>
                      Edit the sim file in the built-in editor, then click <code>Run</code>. Unsaved edits are saved
                      automatically before the run starts. Use <code>Stop</code> to cancel an active run.
                    </li>
                    <li>
                      Watch live output in the terminal pane. If Motion Genesis waits for input, type in the{' '}
                      <code>Send</code> box below the output and press <code>Enter</code> (a blank line is sent if the
                      box is empty).
                    </li>
                    <li>
                      After a successful run, MGView offers to import detected <code>ODE()</code> output files. Accept
                      the prompt to load channels for playback and plots. If multiple <code>ODE()</code> blocks were
                      detected, choose <code>Import separately</code> so each case becomes its own entry in the{' '}
                      <code>Sim Data</code> dropdown.
                    </li>
                    <li>
                      Switch to the <span className="font-semibold text-foreground">Scene Editor</span> pane (
                      <code>Alt+3</code>). Add geometries on the frames and points you want to see, adjust{' '}
                      <code>Scene Settings</code> (camera up, parent frame), and press <code>Space</code> to play the
                      timeline.
                    </li>
                    <li>
                      Choose <code>Save all</code> from the <span className="font-semibold text-foreground">Scene</span>{' '}
                      menu (<code>Cmd/Ctrl+S</code>) to write the scene JSON and any dirty sim file changes to disk.
                    </li>
                  </ol>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Configure options</h3>
                  <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                    <li>
                      <span className="font-semibold text-foreground">Sim Executable</span> — click the path to pick a
                      different Motion Genesis binary.
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">Auto-quit</span> — append <code>QUIT</code> to a
                      temporary copy of the input file so batch runs finish without manual exit.
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">Auto defaults</span> — send a blank line when MG
                      is waiting at an <code>Enter INPUT value…</code> prompt.
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">Debug output</span> — show MGView diagnostic lines
                      in the output pane.
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">Vim keybindings</span> — enable vim-style editing
                      in the sim file editor.
                    </li>
                  </ul>
                  <p className="mt-2">
                    Run options and editor layout are remembered between sessions. Avoid <code>Plot</code> commands in
                    sim files for now — they can launch MG&apos;s separate plotting tool and stall an in-app run.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Scenarios and manual import</h3>
                  <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                    <li>
                      The header <code>Sim Data</code> dropdown switches between scenarios (for example different
                      initial conditions or <code>ODE()</code> subpaths). Choose <code>Edit Sim Data</code> to add,
                      remove, or rename scenarios and their data files.
                    </li>
                    <li>
                      If you ran Motion Genesis outside MGView, open <code>Edit Sim Data</code> and browse to your{' '}
                      <code>.1</code>, <code>.2</code>, … animation files manually. Confirm the parsed channel list at
                      the bottom of the dialog.
                    </li>
                  </ul>
                </div>
              </div>
            </DocArticle>
          </TabsContent>

          <TabsContent value="mglab" className="mt-4">
            <DocArticle title="MGLab">
              <div className="space-y-3">
                <p>
                  <span className="font-semibold text-foreground">MGLab</span> is a standalone Motion Genesis editor and
                  runner for workspace <code>.al</code> and <code>.txt</code> files. Use it when you want to edit or run
                  a sim without loading a scene — for example while iterating on input files before visualization.
                </p>
                <ul className="list-disc list-outside space-y-1 pl-5">
                  <li>
                    Open MGLab from the app title dropdown in the header (switch between <code>MGView</code> and{' '}
                    <code>MGLab</code>), or go directly to{' '}
                    <a className="text-primary underline-offset-4 hover:underline" href={getLabPath()} {...inAppLinkProps}>
                      <code>{getLabPath()}</code>
                    </a>
                    .
                  </li>
                  <li>
                    Click <code>Open File</code> to browse your workspace, or <code>New Sim File</code> to create a
                    scaffolded input file in the current folder.
                  </li>
                  <li>
                    Edit, <code>Save</code> (<code>Cmd/Ctrl+S</code>), <code>Revert</code>, and <code>Run</code> work the
                    same way as in the workspace Sim Editor. The default layout shows the editor and output side by side.
                  </li>
                  <li>
                    MGLab does not manage scene JSON or 3D visualization. After a run, switch back to{' '}
                    <code>MGView</code>, link the sim file in the Sim Editor, and import the output data into a scene.
                  </li>
                  <li>MGLab requires the local server — it is not available in the online read-only demo.</li>
                </ul>
              </div>
            </DocArticle>
          </TabsContent>

          <TabsContent value="mg-tips" className="mt-4">
            <div className="grid gap-4">
              <DocArticle title="Creating Numerical Pose Data Using MotionGenesis (MG)">
                <div className="space-y-3">
                  <p>
                    Your MG simulations must output animation data (position/orientation vs. time) for each point and
                    frame that you want to visualize.
                  </p>
                  <ol className="list-decimal list-outside space-y-3 pl-5">
                    <li>
                      Ensure you have defined the position of each &quot;origin&quot; point in your simulation (No, Bo,
                      etc).
                      <br />
                      <span className="text-xs">
                        <strong>Note:</strong> The <code>Translate</code> command is sufficient, you do not need a
                        separate <code>SetPosition</code> call.
                      </span>
                    </li>
                    <li>
                      Ensure the time step set by the MG command
                      <br />
                      <code>Input IntegStp = 0.01</code>
                      <br />
                      provides a reasonable visual frame-rate without making data files excessively large.
                    </li>
                    <li>
                      Ensure the line <code>Animate(N, No)</code> appears in your MG command file before the MG command{' '}
                      <code>ODE() myFileName</code>
                      <br />
                      In the Animate command:
                      <ul className="mt-2 list-disc list-outside space-y-1 pl-5">
                        <li>Replace &quot;N&quot; with the name of your NewtonianFrame.</li>
                        <li>Replace &quot;No&quot; with the name of your World Origin.</li>
                        <li>
                          By default it will animate everything. You can optionally specify which points and bodies to
                          animate, e.g. <code>Animate(N, No, A, B, C, Ab, Bc)</code>.
                        </li>
                      </ul>
                    </li>
                    <li>
                      After running the simulation, you will have a series of data files called &quot;myFileName.1&quot;,
                      &quot;myFileName.2&quot;, etc.
                    </li>
                    <li>
                      See the{' '}
                      <a
                        className="text-primary underline-offset-4 hover:underline"
                        href={MGVIEW_SAMPLES_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        samples folder on GitHub
                      </a>{' '}
                      if you have trouble.
                    </li>
                  </ol>
                </div>
              </DocArticle>

              <DocArticle title="Advanced workspace management">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Run MotionGenesis from a project subfolder</h3>
                    <p className="mt-1">
                      Over time you will have many sims with many output files. Organize each one into its own folder to
                      keep things tidy. You can run these files from the Sim Editor or MGLab instead of a separate
                      terminal, or use the terminal workflow below.
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground">
                      <code>{advancedProjectFolderExample}</code>
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Use subpaths in ODE() for multiple cases</h3>
                    <p className="mt-1">
                      In your MG input file, each <code>ODE()</code> call can write animation data to a different
                      subfolder. Change initial conditions or parameters between runs to compare cases side by side.
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground">
                      <code>{advancedOdeSubpathExample}</code>
                    </pre>
                    <p className="mt-2">You will end up with a tree like:</p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground">
                      <code>{advancedOutputTreeExample}</code>
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Workspace management</h3>
                    <p className="mt-1">
                      You can put MGView in any location you want, and use the workspace feature to load
                      simulations from any folder on your machine.
                    </p>
                  </div>
                </div>
              </DocArticle>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
