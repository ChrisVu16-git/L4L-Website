export default function Loader() {
  return (
    <div className="loader-wrap">
      <div className="loader" />
    </div>
  );
}

export function Message({ variant = 'info', children }) {
  return <div className={`message message-${variant}`}>{children}</div>;
}

export function Rating({ value, text }) {
  return (
    <div className="rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= Math.round(value) ? 'star filled' : 'star'}>
          ★
        </span>
      ))}
      {text && <span className="rating-text">{text}</span>}
    </div>
  );
}
