import homeContent from 'virtual:abs-content/home';
import { MainNavLink } from '../../components/MainNavLink.jsx';
import { buildRouteHref } from '../../lib/routes.js';
import { ContactEmailButton } from './ContactEmailButton.jsx';

export const CONTACT_ROUTE_RUNTIME = {
  exportName: 'bootstrapContactRoute',
  loadModule: () => import('./contact-bootstrap.js')
};

function getContactCopy() {
  const contact = homeContent.contact || {};
  const gates = homeContent.gates || {};
  return {
    title: gates.contact?.title || 'Contact',
    description: gates.contact?.description || 'Hit me up for collaborations and job opportunities.',
    email: contact.email || 'alexander@beck.fyi',
    copyAriaLabel: contact.copy?.buttonAriaLabel || 'Copy email address',
    copiedText: contact.copy?.statusCopied || 'Copied',
    errorText: contact.copy?.statusError || 'Copy failed',
  };
}

export function getContactRouteView() {
  const footerLinks = homeContent.footer.links;
  const portfolioLink = footerLinks.portfolio;
  const aboutLink = footerLinks.cv;
  const contact = getContactCopy();
  const homeHref = buildRouteHref('home');

  return {
    bodyClass: 'body contact-page',
    wallClassName: 'contact-simulation w-embed',
    simulationLayer: (
      <div className="contact-content-layer">
        <main id="contact-route-main" className="contact-page-content" aria-labelledby="contact-route-title">
          <p className="contact-route-kicker">Alexander Beck Studio</p>
          <h1 id="contact-route-title" className="contact-route-title">{contact.title}</h1>
          <p className="contact-route-description">{contact.description}</p>
          <ContactEmailButton
            email={contact.email}
            copyAriaLabel={contact.copyAriaLabel}
            copiedText={contact.copiedText}
            errorText={contact.errorText}
          />
        </main>
      </div>
    ),
    uiLayer: {
      chrome: (
        <header className="ui-top">
          <div className="ui-top-main route-topbar portfolio-topbar">
            <div className="route-topbar__left">
              <a
                href={homeHref}
                className="gate-back abs-icon-btn"
                data-nav-transition
                aria-label="Back to home"
              >
                <i className="ti ti-arrow-left" aria-hidden="true" />
              </a>
            </div>
            <nav className="route-topbar__center portfolio-topnav ui-main-nav" aria-label="Contact navigation">
              <MainNavLink
                id={portfolioLink.id}
                aria-label={portfolioLink.text}
                aria-haspopup="dialog"
              >
                {portfolioLink.text}
              </MainNavLink>
              <MainNavLink
                id={aboutLink.id}
                aria-label={aboutLink.text}
                aria-haspopup="dialog"
              >
                {aboutLink.text}
              </MainNavLink>
            </nav>
            <div className="route-topbar__right ui-top-right">
              <div id="sound-toggle-slot" className="portfolio-sound-slot" />
            </div>
          </div>

          <div id="top-elements-soundRow" className="ui-top-soundRow" />
        </header>
      ),
      secondary: <main className="ui-center-spacer" aria-hidden="true" />
    }
  };
}
