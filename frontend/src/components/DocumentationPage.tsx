import { ArrowLeft, BookOpenText, ExternalLink } from 'lucide-react';
import { getHomePath } from '../core/appRoutes.ts';
import { Button } from './ui/button.tsx';

const MGVIEW_SOURCE_URL = 'https://github.com/mgview/mgview';

const shortcutItems = [
  { keys: 'Space', description: 'Play or pause the active timeline.' },
  { keys: 'Cmd/Ctrl+S', description: 'Save the current scene when save is available.' },
  { keys: 'Cmd/Ctrl+Z', description: 'Undo the latest scene edit.' },
  { keys: 'Cmd/Ctrl+Shift+Z', description: 'Redo the latest undone edit.' },
  { keys: 'Alt+L', description: 'Open the Layout menu.' },
  { keys: 'Alt+1 / Alt+2 / Alt+3', description: 'Toggle the 3D view, plots, and editor rail.' },
  { keys: 'Esc', description: 'Clear focus from the active control, or clear the current selection when overlays are closed.' },
] as const;

export default function DocumentationPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <BookOpenText className="h-3.5 w-3.5" />
                Documentation
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">MGView documentation</h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                  MGView displays simulation outputs in a browser-based 3D viewer with plots and editing tools.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href={getHomePath()}>
                  <ArrowLeft className="h-4 w-4" />
                  Open App
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={MGVIEW_SOURCE_URL} target="_blank" rel="noopener noreferrer">
                  Source
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold">Getting started</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                Launch MGView, open a sample or your own scene, press play, and use the Layout menu to show the panels
                you want.
              </p>
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Installation</h2>
            <div className="mt-3 space-y-4 text-sm leading-6 text-muted-foreground">
              <p>
                Installation only needs to be done once. The goal is to place the MGView folder somewhere easy to find,
                then launch it from there whenever you want to open simulations.
              </p>
              <div>
                <h3 className="text-sm font-semibold text-foreground">1. Install Node.js</h3>
                <p className="mt-1">
                  MGView uses a small local server, so Node.js needs to be installed first. Download the current LTS
                  release from <a className="text-primary underline-offset-4 hover:underline" href="https://nodejs.org/en/download" target="_blank" rel="noopener noreferrer">nodejs.org</a>.
                </p>
                <p className="mt-1">
                  After installing Node.js, open Terminal on macOS or Command Prompt on Windows and run <code>node
                  --version</code>. If you see a version number, Node.js is installed correctly.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">2. Download MGView</h3>
                <p className="mt-1">
                  Download MGView from the project source page as a zip file.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">3. Put MGView in a convenient folder</h3>
                <p className="mt-1">
                  Unzip the download if needed, then move the MGView folder somewhere you can find later.
                </p>
                <p className="mt-1">
                  For example, on macOS you might place it at <code>/Applications/MotionGenesis/MGView</code>. On
                  Windows you might place it at <code>C:\MotionGenesis\MGView</code>.
                </p>
                <p className="mt-1">
                  It can also be stored in another location if you prefer.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">4. Keep your simulation files outside the app folder</h3>
                <p className="mt-1">
                  Keep your own simulation files in the standard MotionGenesis folder:
                  <code> /Applications/MotionGenesis</code> on macOS or <code> C:\MotionGenesis</code> on Windows.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              {shortcutItems.map(({ keys, description }) => (
                <div key={keys} className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-xl border border-border bg-muted/25 px-3 py-2.5">
                  <dt>
                    <code>{keys}</code>
                  </dt>
                  <dd className="leading-6 text-muted-foreground">{description}</dd>
                </div>
              ))}
            </dl>
          </article>
        </section>

        <section className="grid gap-4">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Running</h2>
            <div className="mt-3 space-y-4 text-sm leading-6 text-muted-foreground">
              <div>
                <h3 className="text-sm font-semibold text-foreground">On macOS</h3>
                <ol className="mt-1 grid gap-2">
                  <li>1. Open Terminal.</li>
                  <li>2. Use the <code>cd</code> command to move into the MGView folder.</li>
                  <li>3. Run <code>./RunMGViewMac</code>.</li>
                  <li>4. If a browser tab does not open automatically, open <code>http://localhost:8000/mgview/</code>.</li>
                </ol>
                <p className="mt-2">
                  Example:
                </p>
                <pre className="mt-1 overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground"><code>cd ~/Documents/MGView
./RunMGViewMac</code></pre>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">On Windows</h3>
                <ol className="mt-1 grid gap-2">
                  <li>1. Open the MGView folder in File Explorer.</li>
                  <li>2. Double-click <code>RunMGViewWindows.bat</code>.</li>
                  <li>3. If Windows asks about permissions for the local server, allow it.</li>
                  <li>4. If a browser tab does not open automatically, open <code>http://localhost:8000/mgview/</code>.</li>
                </ol>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Creating Numerical Pose Data Using MotionGenesis (MG)</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              Your MG simulations must output animation data (position/orientation vs. time) for each point and frame
              that you want to visualize.
            </p>
            <ol className="grid gap-3">
              <li>
                1. Ensure you have defined the position of each &quot;origin&quot; point in your simulation (No, Bo, etc).
                <br />
                <span className="text-xs">
                  <strong>Note:</strong> The <code>Translate</code> command is sufficient, you do not need a separate{' '}
                  <code>SetPosition</code> call.
                </span>
              </li>
              <li>
                2. Ensure the time step set by the MG command
                <br />
                <code>Input IntegStp = 0.01</code>
                <br />
                provides a reasonable visual frame-rate without making data files excessively large.
              </li>
              <li>
                3. Ensure the line <code>Animate(N, No)</code> appears in your MG command file before the MG command{' '}
                <code>ODE() myFileName</code>
                <br />
                In the Animate command:
                <ul className="mt-2 grid gap-1 pl-5">
                  <li>Replace &quot;N&quot; with the name of your NewtonianFrame.</li>
                  <li>Replace &quot;No&quot; with the name of your World Origin.</li>
                  <li>
                    By default it will animate everything. You can optionally specify which points and bodies to
                    animate, e.g. <code>Animate(N, No, A, B, C, Ab, Bc)</code>.
                  </li>
                </ul>
              </li>
              <li>
                4. After running the simulation, you will have a series of data files called &quot;myFileName.1&quot;,
                &quot;myFileName.2&quot;, etc.
              </li>
              <li>
                5. See the <a className="text-primary underline-offset-4 hover:underline" href={`${getHomePath()}samples/`} target="_blank" rel="noopener noreferrer">samples</a>
                in your <code>MGView/samples</code> folder if you have trouble.
              </li>
            </ol>
          </div>
        </section>
      </div>
    </main>
  );
}
