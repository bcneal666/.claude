import { useState } from "react";
import "../styles/page.css";

export function Page() {
  const [open, setOpen] = useState(false);
  return (
    <main className="hero">
      <label>
        Verification code
        <input name="otp" type="text" className="field" />
      </label>
      <div className="dropdown">
        <button onClick={() => setOpen(!open)}>Country</button>
        {open && (
          <ul className="dropdown-menu">
            <li>Taiwan</li>
            <li>Japan</li>
          </ul>
        )}
      </div>
    </main>
  );
}
