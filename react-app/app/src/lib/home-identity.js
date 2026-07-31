import homeContent from 'virtual:abs-content/home';

const DEFAULT_HOME_IDENTITY = Object.freeze({
  name: 'Alexander Beck',
  role: 'Creative & Technologist.',
  roleLines: Object.freeze(['Creative &', 'Technologist.']),
  ariaLabel: 'Alexander Beck. Creative and technologist.',
});

function resolveRoleLines(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const lines = value.map((line) => String(line || '').trim()).filter(Boolean);
  return lines.length ? Object.freeze(lines) : fallback;
}

export function resolveHomeIdentity(content = homeContent) {
  const identity = content?.identity || {};
  const name = String(identity.name || DEFAULT_HOME_IDENTITY.name).trim() || DEFAULT_HOME_IDENTITY.name;
  const role = String(identity.role || DEFAULT_HOME_IDENTITY.role).trim() || DEFAULT_HOME_IDENTITY.role;
  const roleLines = resolveRoleLines(identity.roleLines, DEFAULT_HOME_IDENTITY.roleLines);
  const ariaLabel = String(identity.ariaLabel || `${name} ${role}`).trim() || DEFAULT_HOME_IDENTITY.ariaLabel;

  return { name, role, roleLines, ariaLabel };
}

export const HOME_IDENTITY = Object.freeze(resolveHomeIdentity(homeContent));
