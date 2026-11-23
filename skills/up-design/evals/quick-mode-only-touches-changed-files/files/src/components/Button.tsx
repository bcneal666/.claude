import "../styles/button.css";

export function Button({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="btn" onClick={onClick}>
      {label}
    </button>
  );
}
