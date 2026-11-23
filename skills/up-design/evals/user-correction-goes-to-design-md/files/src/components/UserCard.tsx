import "../styles/card.css";

type User = { name: string; email: string; avatar?: string };

export function UserCard({ user }: { user: User }) {
  return (
    <div className="card">
      <img className="card-avatar" src={user.avatar} />
      <div className="card-body">
        <h3 className="card-name">{user.name}</h3>
        <p className="card-email">{user.email}</p>
      </div>
    </div>
  );
}
