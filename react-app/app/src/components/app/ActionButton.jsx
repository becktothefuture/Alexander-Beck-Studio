import { ActionLabel } from './ActionLabel.jsx';
import './action-buttons.css';

// Variants own anatomy. Every variant shares the same material and input system.
export function ActionButton({ variant = 'primary', label, icon, children, className = '', href, ...props }) {
  const Element = href ? 'a' : 'button';
  const family = variant === 'icon' ? 'abs-icon-btn abs-circular-utility' : 'abs-labelled-action';
  return (
    <Element
      type={href ? undefined : 'button'}
      href={href}
      className={`${family} abs-action--${variant}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {icon}
      {label ? <ActionLabel>{label}</ActionLabel> : children}
    </Element>
  );
}
