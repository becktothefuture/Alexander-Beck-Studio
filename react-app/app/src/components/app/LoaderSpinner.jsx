const LOADER_DOT_COUNT = 8;

export function LoaderSpinner({ className = '', id = undefined }) {
  return (
    <span
      id={id}
      className={['abs-loader-spinner', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {Array.from({ length: LOADER_DOT_COUNT }, (_, index) => (
        <span
          key={index}
          className="abs-loader-spinner__dot"
          style={{ '--abs-loader-dot-index': index }}
        />
      ))}
    </span>
  );
}
