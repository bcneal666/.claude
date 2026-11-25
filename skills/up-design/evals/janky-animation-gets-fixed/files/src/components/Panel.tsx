import "../styles/panel.css";

export function Panel({ items }: { items: string[] }) {
  return (
    <aside className="panel">
      <ul>
        {items.map((item) => (
          <li key={item} className="row">{item}</li>
        ))}
      </ul>
    </aside>
  );
}
