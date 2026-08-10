import { ShellUtilityControls } from './ShellUtilityControls.jsx';
import './shell-utility-rail.css';

export function ShellUtilityRail() {
  return (
    <div
      className="shell-utility-rail"
      data-shell-utility-rail
    >
      <ShellUtilityControls />
    </div>
  );
}
