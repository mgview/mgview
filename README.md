MGView
==========

This is a 3D visualization front-end for numerical motion data.
It is designed to work with MotionGenesis output by default, but the data is simply read as text, so any other simulation output could be used.

To demo the software online without installing anything,
[click here](http://mgview.github.io/mgview/).

To install the software or see the online documentation, [click here](http://mgview.github.io/mgview/docs/).

You can put the MGView folder anywhere; the usual default is inside your MotionGenesis folder (e.g. `/Applications/MotionGenesis` or `C:\MotionGenesis`).

### Requirements (local download)

- **Node.js 20 or later** on your PATH ([download](https://nodejs.org/en/download)). LTS (20 or 22) is recommended.
- Motion Genesis installed if you use interactive **Run Sim** / MG Lab runs (these need the bundled `node-pty` native module).

### First launch: macOS / Windows security prompts

Unzipped launchers are not notarized, so the OS may block them the first time:

- **macOS:** Control-click → Open usually does **not** work. Try opening `RunMGViewMac` once, then go to **System Settings → Privacy & Security**, find the message about the blocked app, and choose **Allow Anyway** / **Open Anyway**. Open `RunMGViewMac` again and confirm.
- **Windows:** Right-click `RunMGViewWindows.bat` → **Properties** → check **Unblock** → **OK**. Then run the `.bat`. Otherwise Smart App Control (or similar) may block it.

Full install and run steps: [docs](http://mgview.github.io/mgview/docs/).

### Developers
Build and deploy details for developers: see [BUILD.md](BUILD.md).

Please report bugs and feature requests on the [issue tracker](https://github.com/mgview/mgview/issues).
