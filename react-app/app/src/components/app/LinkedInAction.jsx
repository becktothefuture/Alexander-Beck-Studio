import { ActionButton } from './ActionButton.jsx';

export function LinkedInAction({
  href = 'https://www.linkedin.com/in/thisisbeck/',
  soundSource = 'linkedin-profile',
}) {
  return (
    <ActionButton
      className="contact-linkedin-action"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open Alexander Beck's LinkedIn profile"
      data-sound-action="press"
      data-sound-source={soundSource}
      icon={<i className="ti ti-brand-linkedin" aria-hidden="true" />}
      label="LinkedIn"
    />
  );
}
