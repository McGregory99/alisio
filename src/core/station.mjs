// Station model validation. Pure, DOM-free. Every element must carry provenance.
export const PROVENANCE = Object.freeze(['verified', 'illustrative']);

const check = (kind, el, errors) => {
  if (!el || !PROVENANCE.includes(el.provenance)) {
    errors.push(`${kind} "${el?.id ?? '(no id)'}" lacks provenance in {${PROVENANCE.join(', ')}}`);
  }
};

const result = (errors) => ({ ok: errors.length === 0, errors });

export function validateMission(mission) {
  const errors = [];
  check('mission', mission, errors);
  return result(errors);
}

export function validateStation(station) {
  const errors = [];
  check('station', station, errors);
  for (const a of station?.antennas ?? []) check('antenna', a, errors);
  for (const f of station?.facilities ?? []) check('facility', f, errors);
  for (const l of station?.links ?? []) check('link', l, errors);
  return result(errors);
}
