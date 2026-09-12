import { useState, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as projectsApi from "../api/projects.api";
import * as clientsApi from "../api/clients.api";
import { useAuth } from "../context/AuthContext";

export function ProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.listProjects });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: clientsApi.listClients, enabled: user?.role !== "DEVELOPER" });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const canCreate = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER";

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await projectsApi.createProject({ name, clientId });
    setName("");
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  }

  if (isLoading) return <div className="page-loading">Loading projects…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Projects</h1>
        {canCreate && <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "New Project"}</button>}
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleCreate}>
          <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Select client…</option>
            {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="submit">Create</button>
        </form>
      )}

      {(projects ?? []).length === 0 && <div className="empty-state">No projects visible to you yet.</div>}
      <div className="card-grid">
        {(projects ?? []).map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
            <h3>{p.name}</h3>
            <p className="project-client">{p.client?.name}</p>
            <p className="project-task-count">{p._count?.tasks ?? 0} tasks</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
