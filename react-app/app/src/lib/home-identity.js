import homeContent from 'virtual:abs-content/home';

const DEFAULT_HOME_IDENTITY = Object.freeze({
  name: 'Alexander Beck.',
  role: 'Designer & Technologist.',
  ariaLabel: 'Alexander Beck. Designer and technologist.',
});

export function resolveHomeIdentity(content = homeContent) {
  const identity = content?.identity || {};
  const name = String(identity.name || DEFAULT_HOME_IDENTITY.name).trim() || DEFAULT_HOME_IDENTITY.name;
  const role = String(identity.role || DEFAULT_HOME_IDENTITY.role).trim() || DEFAULT_HOME_IDENTITY.role;
  const ariaLabel = String(identity.ariaLabel || `${name} ${role}`).trim() || DEFAULT_HOME_IDENTITY.ariaLabel;

  return { name, role, ariaLabel };
}

export const HOME_IDENTITY = Object.freeze(resolveHomeIdentity(homeContent));
