import { useState, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as clientsApi from "../api/clients.api";


export function ClientsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["clients"], queryFn: clientsApi.listClients });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await clientsApi.createClient({ name, email });
    setName("");
    setEmail("");
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  }

  if (isLoading) return <div className="page-loading">Loading clients…</div>;

  return (
    <div>
      <h1>Clients</h1>
      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <button type="submit">Add Client</button>
      </form>
      <table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Company</th></tr></thead>
        <tbody>
          {(data ?? []).map((c) => (
            <tr key={c.id}><td>{c.name}</td><td>{c.email ?? "—"}</td><td>{c.company ?? "—"}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
