import { ArrowLeft, BookOpenText, Download, MessageCircleWarning, PanelsTopLeft } from 'lucide-react';
import { getHomePath, inAppLinkProps } from '../core/appRoutes.ts';
import buildInfo from '../generated/buildInfo.ts';
import { Button } from './ui/button.tsx';

const MGVIEW_SOURCE_URL = 'https://github.com/mgview/mgview';
const MGVIEW_ISSUES_URL = `${MGVIEW_SOURCE_URL}/issues`;
const MGVIEW_RELEASES_URL = `${MGVIEW_SOURCE_URL}/releases`;
const MGVIEW_RELEASE_DOWNLOAD_URL = `${MGVIEW_SOURCE_URL}/releases/download/v${buildInfo.version}/mgview-${buildInfo.version}.zip`;
const MGVIEW_SAMPLES_URL = `${MGVIEW_SOURCE_URL}/tree/master/samples`;

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
  { keys: 'Cmd/Ctrl+S', description: 'Save the current scene when save is available.' },
  { keys: 'Cmd/Ctrl+Z', description: 'Undo the latest scene edit.' },
  { keys: 'Cmd/Ctrl+Shift+Z', description: 'Redo the latest undone edit.' },
  { keys: 'Cmd/Ctrl+Y', description: 'Redo the latest undone edit.' },
  { keys: 'Alt+L', description: 'Open the Layout menu.' },
  // { keys: 'Alt+1 / Alt+2 / Alt+3', description: 'Show or hide the 3D View, Plots, and Editor panes.' },
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

export default function DocumentationPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
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

        <div className="grid gap-4 lg:grid-cols-4">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold">Installation (once only)</h2>
            <div className="mt-3 space-y-4 text-sm leading-6 text-muted-foreground">
              <div>
                <h3 className="text-sm font-semibold text-foreground">1. Install Node.js</h3>
                <p className="mt-1">
                  MGView uses a small local server, so Node.js needs to be installed first.
                </p>
                <ul className="list-disc list-outside space-y-1 pl-5">
                  <li>
                    Download the current LTS release from{' '}
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href="https://nodejs.org/en/download"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      nodejs.org
                    </a>.
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
                    Download {' '}
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
                    Move the .zip file to your MotionGenesis folder. For most users this will be:
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
                    Unzip the file in your MotionGenesis folder. (Optional: delete the .zip file.)
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
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold">Running</h2>
            <div className="mt-3 space-y-4 text-sm leading-6 text-muted-foreground">
              <div>
                <h3 className="text-sm font-semibold text-foreground">On macOS</h3>
                <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                  <li>
                    In Finder, go to your MGView folder and double-click{' '}
                    <code>RunMGViewMac</code>.
                    <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                      <li>
                        Or in Terminal:{' '}
                        <code>/Applications/MotionGenesis/mgview/RunMGViewMac</code>
                      </li>
                    </ul>
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
                    Double-click <code>RunMGViewWindows.bat</code>.
                  </li>
                  <li>If Windows asks about permissions for the local server, allow it.</li>
                  <li>
                    If a browser tab does not open automatically, open{' '}
                    <code>http://localhost:8000/mgview/</code> in any browser.
                  </li>
                </ul>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
            <h2 className="text-lg font-semibold">Quick Start</h2>
            <div className="mt-3 space-y-4 text-sm leading-6 text-muted-foreground">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Explore the UI</h3>
                <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                  <li>
                    Open the <span className="font-semibold text-foreground">Load</span> menu (chevron
                    next to the button) and choose <code>Samples…</code> to try bundled demos.
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
                    <span className="font-semibold text-foreground">Plots</span>, and{' '}
                    <span className="font-semibold text-foreground">Editor</span> panes (
                    <code>Alt+1</code> / <code>Alt+2</code> / <code>Alt+3</code>).
                  </li>
                  <li>
                    In the editor rail, pick a frame or point under{' '}
                    <span className="font-semibold text-foreground">Objects</span>, then select a geometry
                    by clicking its name chip under <span className="font-semibold text-foreground">Geometries</span>{' '}
                    (or click the chip again to rename).
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
                <h3 className="text-sm font-semibold text-foreground">Create a scene from your simulation</h3>
                <ul className="mt-1 list-disc list-outside space-y-1 pl-5">
                  <li>
                    Run your MotionGenesis simulation so it writes animation files (for example{' '}
                    <code>myFileName.1</code>, <code>myFileName.2</code>, …). See{' '}
                    <span className="font-semibold text-foreground">
                      Creating Numerical Pose Data Using MotionGenesis (MG)
                    </span>{' '}
                    below if channels are missing.
                  </li>
                  <li>
                    In the <span className="font-semibold text-foreground">Load</span> menu, choose{' '}
                    <code>New…</code>, browse to the folder where your sim files live, enter a scene name
                    (such as <code>my_scene.json</code>), and click <code>Create</code>.
                  </li>
                  <li>
                    Choose <code>Sim Files…</code> from the same menu, select one or more data files in
                    the browser, click <code>Add</code>, then confirm the parsed channels at the bottom of
                    the dialog (file count, channel list, inferred origin and Newtonian frame).
                  </li>
                  <li>
                    Open the inspector&apos;s <code>Scene Settings</code> tab. Set{' '}
                    <span className="font-semibold text-foreground">Camera Up</span> to match which axis is
                    &quot;up&quot; in your Newtonian frame. Optionally set{' '}
                    <span className="font-semibold text-foreground">Camera Parent Frame</span>: tracking a
                    frame moves position and orientation with that body; tracking a point moves position
                    only.
                  </li>
                  <li>
                    Back on the <code>Editor</code> tab, add geometries on each frame and point you want to
                    visualize.
                  </li>
                  <li>
                    Remember to <code>Save</code> (<code>Cmd/Ctrl+S</code>) to write your scene changes to disk.
                  </li>
                </ul>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-1">
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              {shortcutItems.map(({ keys, description }) => (
                <div key={keys} className="space-y-1 rounded-xl border border-border bg-muted/25 px-3 py-2.5">
                  <dt>
                    <code>{keys}</code>
                  </dt>
                  <dd className="leading-5 text-muted-foreground">{description}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-4">
            <h2 className="text-lg font-semibold">Creating Numerical Pose Data Using MotionGenesis (MG)</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              Your MG simulations must output animation data (position/orientation vs. time) for each point and frame
              that you want to visualize.
            </p>
            <ol className="list-decimal list-outside space-y-3 pl-5">
              <li>
                Ensure you have defined the position of each &quot;origin&quot; point in your simulation (No, Bo, etc).
                <br />
                <span className="text-xs">
                  <strong>Note:</strong> The <code>Translate</code> command is sufficient, you do not need a separate{' '}
                  <code>SetPosition</code> call.
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
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-4">
            <h2 className="text-lg font-semibold">Advanced workspace management</h2>
            <div className="mt-3 space-y-4 text-sm leading-6 text-muted-foreground">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Run MotionGenesis from a project subfolder</h3>
                <p className="mt-1">
                  Over time you will have many sims with many output files. Organize each one into its own folder to keep things tidy.
                </p>
                <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground"><code>{advancedProjectFolderExample}</code></pre>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Use subpaths in ODE() for multiple cases</h3>
                <p className="mt-1">
                  In your MG input file, each <code>ODE()</code> call can write animation data to a different
                  subfolder. Change initial conditions or parameters between runs to compare cases side by side.
                </p>
                <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground"><code>{advancedOdeSubpathExample}</code></pre>
                <p className="mt-2">You will end up with a tree like:</p>
                <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground"><code>{advancedOutputTreeExample}</code></pre>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Workspace management</h3>
                <p className="mt-1">
                  You can put MGView in any location you want, and use the workspace feature to load
                  simulations from any folder on your machine.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
