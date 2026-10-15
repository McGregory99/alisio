// Pure label content: provenance badge plus an honest note for illustrative elements.
const BADGES = {
  verified: { text: 'verified', color: '#58c98a' },
  illustrative: { text: 'illustrative', color: '#e0a64f' },
};
export const badgeFor = (provenance) => BADGES[provenance] ?? BADGES.illustrative;

export function labelText(entity) {
  const badge = badgeFor(entity.provenance).text;
  let note;
  if (entity.kind === 'link') note = 'Off-site processing and archiving, shown as a generic link; site names not claimed.';
  else if (entity.kind === 'satellite') note = `Direction from SGP4 propagation of the stored orbit data; mission-to-station role: ${entity.provenance}.`;
  else if (entity.provenance === 'illustrative') note = 'Illustrative: artistic placeholder, not a real installation.';
  else if (entity.illustrative?.length) note = `Existence verified; illustrative: ${entity.illustrative.join(', ')}.`;
  else note = 'Verified.';
  return { title: entity.label, badge, note };
}
