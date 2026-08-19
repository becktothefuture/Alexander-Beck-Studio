export function LinkedInAction({
  href = 'https://www.linkedin.com/in/thisisbeck/',
  soundSource = 'linkedin-profile',
}) {
  return (
    <a
      className="abs-labelled-action contact-linkedin-action"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open Alexander Beck's LinkedIn profile"
      data-sound-action="press"
      data-sound-source={soundSource}
    >
      <i className="ti ti-brand-linkedin" aria-hidden="true" />
      <span>LinkedIn</span>
    </a>
  );
}
