import OverlayPanel from './OverlayPanel.tsx';
import { formatNumber } from './editorShared.tsx';

interface ChannelPreviewOverlayProps {
  onClose: () => void;
  previewEntries: Array<[string, number]>;
  previewLimit: number;
}

export default function ChannelPreviewOverlay({
  onClose,
  previewEntries,
  previewLimit,
}: ChannelPreviewOverlayProps) {
  return (
    <OverlayPanel
      title="Channel Preview"
      subtitle={`First ${previewLimit} channel values at the current time.`}
      onClose={onClose}
    >
      <section className="panel">
        <table className="preview-table">
          <tbody>
            {previewEntries.map(([channelName, value]) => (
              <tr key={channelName}>
                <td>
                  <code>{channelName}</code>
                </td>
                <td>
                  <code>{formatNumber(value)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </OverlayPanel>
  );
}
