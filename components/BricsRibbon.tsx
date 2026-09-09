/**
 * The BRICS India 2026 logo carries five colours. This 4px ribbon is the only
 * place they all appear in the interface; everything else is sky and slate.
 *
 * Using five accent colours across the UI would break the one-accent rule that
 * design-taste-frontend enforces, and reads as a dated government portal.
 * Purely decorative, so it is hidden from assistive technology.
 */
export default function BricsRibbon() {
  return (
    <div className="brics-ribbon" aria-hidden="true">
      <span style={{ background: 'var(--brics-blue)' }} />
      <span style={{ background: 'var(--brics-orange)' }} />
      <span style={{ background: 'var(--brics-yellow)' }} />
      <span style={{ background: 'var(--brics-green)' }} />
      <span style={{ background: 'var(--brics-red)' }} />
    </div>
  );
}
