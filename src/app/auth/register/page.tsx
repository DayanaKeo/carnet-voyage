'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      router.push('/auth/signin');
    } else {
      const data = await res.json();
      setError(data.error || 'Erreur lors de l’inscription');
    }
  };

  return (
    <div>
      <h1>Inscription</h1>
      {error && <p style={{color: 'red'}}>{error}</p>}
      <form onSubmit={handleRegister}>
        <label>Email</label>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label>Password</label>
        <input
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">S’inscrire</button>
      </form>
    </div>
  );
}
