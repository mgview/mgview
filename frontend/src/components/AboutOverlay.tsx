import buildInfo from '../generated/buildInfo.ts';
import OverlayPanel from './OverlayPanel.tsx';

interface AboutOverlayProps {
  onClose: () => void;
}

export default function AboutOverlay({ onClose }: AboutOverlayProps) {
  return (
    <OverlayPanel title="About MGView" size="narrow" onClose={onClose}>
      <div className="about-grid">
        <div className="about-row">
          <span className="about-label">Version</span>
          <code>{buildInfo.version}</code>
        </div>
        <div className="about-row">
          <span className="about-label">Build date</span>
          <code>{buildInfo.buildDate}</code>
        </div>
        <div className="about-row">
          <span className="about-label">Built at</span>
          <code>{buildInfo.buildTimestamp}</code>
        </div>
        {buildInfo.commit ? (
          <div className="about-row">
            <span className="about-label">Commit</span>
            <code>{buildInfo.commit}</code>
          </div>
        ) : null}
      </div>
    </OverlayPanel>
  );
}
