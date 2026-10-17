"use client";

import { useEffect, useState, type FormEvent } from "react";

type StaffRole = "admin" | "portfolio_editor" | "hr_manager";
type StaffUser = { id: string; email: string; roles: StaffRole[] };

const roles: { value: StaffRole; label: string }[] = [
  { value: "admin", label: "Admin · accesso completo" },
  { value: "portfolio_editor", label: "Portfolio · pubblicazione progetti" },
  { value: "hr_manager", label: "HR · offerte e candidature" },
];

export function AdminUsers() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const result = (await response.json()) as { users?: StaffUser[]; message?: string; hasMore?: boolean };
    if (!response.ok) {
      setStatus(result.message ?? "Non è stato possibile caricare gli account.");
      setLoading(false);
      return;
    }
    setUsers(result.users ?? []);
    setStatus(result.hasMore ? "Sono mostrati i primi 100 account." : "");
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(loadUsers);
  }, []);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        role: formData.get("role"),
      }),
    });
    const result = (await response.json()) as { message?: string };
    setStatus(result.message ?? "Non è stato possibile inviare l’invito.");
    if (response.ok) {
      form.reset();
      await loadUsers();
    }
  }

  async function toggleRole(user: StaffUser, role: StaffRole) {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, role, enabled: !user.roles.includes(role) }),
    });
    const result = (await response.json()) as { message?: string };
    setStatus(result.message ?? "Non è stato possibile aggiornare i permessi.");
    if (response.ok) {
      await loadUsers();
    }
  }

  return (
    <>
      <form className="contact-form admin-invite-form" onSubmit={invite}>
        <h2>Invita una persona</h2>
        <label>Email<input autoComplete="email" maxLength={254} name="email" required type="email" /></label>
        <label>Ruolo iniziale
          <select className="form-select" defaultValue="portfolio_editor" name="role">
            {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
        </label>
        <button className="button button-dark" type="submit">Invia invito ↗</button>
      </form>
      <div className="admin-record-list admin-users-list">
        <h2>Account e permessi</h2>
        {loading && <p>Caricamento…</p>}
        {!loading && users.length === 0 && <p>Nessun account trovato.</p>}
        {users.map((user) => (
          <article className="admin-user-record" key={user.id}>
            <div><h3>{user.email}</h3><p>{user.roles.length ? `Ruoli: ${user.roles.join(", ")}` : "Nessun ruolo assegnato"}</p></div>
            <div className="role-toggle-list">
              {roles.map((role) => (
                <label className="consent-check" key={role.value}>
                  <input
                    checked={user.roles.includes(role.value)}
                    onChange={() => void toggleRole(user, role.value)}
                    type="checkbox"
                  />
                  <span>{role.label}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
      <p aria-live="polite" className="form-status" role="status">{status}</p>
    </>
  );
}
