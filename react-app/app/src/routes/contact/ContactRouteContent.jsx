import homeContent from 'virtual:abs-content/home';
import { CopyEmailAction } from '../../components/app/CopyEmailAction.jsx';
import { LinkedInAction } from '../../components/app/LinkedInAction.jsx';
import { playContactRippleMotif } from '../../legacy/modules/audio/sound-engine.js';
import { requestContactRippleBurst } from './contactRippleEvents.js';

export function ContactRouteContent() {
  const contact = homeContent.contact || {};
  const email = contact.email || 'alexander@beck.fyi';
  const copyText = contact.copy || {};
  const linkedin = homeContent.socials?.items?.linkedin?.url
    || 'https://www.linkedin.com/in/thisisbeck/';
  const title = contact.title || "Let's talk";
  const description = contact.description
    || "Hit me up for collaborations and job opportunities. If you need innovative thinking and a creative mind to tackle complex aesthetic, visual, and system problems, get in touch.";

  const handleActivate = () => {
    requestContactRippleBurst();
    void playContactRippleMotif({ unlockIfNeeded: false });
  };

  return (
    <div className="route-centered-page contact-route">
      <section id="contact-route-content" className="route-centered-page__inner route-title-lockup contact-route__inner" aria-labelledby="contact-route-title">
        <h1
          id="contact-route-title"
          className="route-centered-page__title route-bookend-title"
          data-route-enter="identity"
          data-route-enter-order="0"
          data-route-enter-variant="bookend-title"
          data-route-focus-target
          tabIndex={-1}
        >
          {title}
        </h1>
        <span className="route-title-lockup__rule" aria-hidden="true" />
        <p id="contact-route-description" className="route-centered-page__description route-intro-description" data-route-enter="context" data-route-enter-variant="bookend-description">
          {description}
        </p>
        <div className="contact-route__copy contact-action-stack" data-route-enter="action">
          <div className="contact-action-stack__primary">
            <CopyEmailAction
              copyText={copyText}
              email={email}
              onActivate={handleActivate}
              soundSource="contact-copy-email"
              statusId="contact-copy-status"
            />
          </div>
          <div className="contact-action-stack__secondary">
            <LinkedInAction href={linkedin} soundSource="contact-linkedin" />
          </div>
        </div>
      </section>
    </div>
  );
}
