import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "../components/NotificationBell";
import { useSocket } from "../hooks/useSocket";

export function AppLayout() {
  const { user, logout } = useAuth();
  const { connected, onlineCount } = useSocket(!!user);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Velozity</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
          <NavLink to="/notifications">Notifications</NavLink>
          {user?.role === "ADMIN" && <NavLink to="/clients">Clients</NavLink>}
          {user?.role === "ADMIN" && <NavLink to="/users">Users</NavLink>}
        </nav>
        <div className="sidebar-footer">
          <span className={`connection-dot ${connected ? "online" : "offline"}`} title={connected ? "Live" : "Disconnected"} />
          {user?.role === "ADMIN" && onlineCount !== null && <span className="online-count">{onlineCount} online</span>}
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="role-indicator">{user?.role.replace("_", " ")}</div>
          <div className="topbar-right">
            <NotificationBell />
            <div className="user-chip">{user?.name}</div>
            <button className="link-button" onClick={logout}>Log out</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
