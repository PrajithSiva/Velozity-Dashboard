import { useState, FormEvent } from "react";
import { apiClient } from "../api/client";
import { Role } from "../types";

// Admin-only page for provisioning PM / Developer / Admin accounts.
export function UsersPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("DEVELOPER");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await apiClient.post("/users", { name, email, password, role });
      setMessage(`Created ${role} account for ${email}.`);
      setName(""); setEmail(""); setPassword("");
    } catch {
      setMessage("Could not create user — check the email isn't already taken.");
    }
  }

  return (
    <div>
      <h1>Users</h1>
      <form className="inline-form" onSubmit={handleSubmit}>
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder="Temporary password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="DEVELOPER">Developer</option>
          <option value="PROJECT_MANAGER">Project Manager</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button type="submit">Create User</button>
      </form>
      {message && <div className="info-banner">{message}</div>}
    </div>
  );
}
