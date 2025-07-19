'use client';

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showRegisterOption, setShowRegisterOption] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password
    });

    if (res?.ok) {
      router.push('/');
    } else {
      setError("Utilisateur non trouvé ou mot de passe incorrect");
      setShowRegisterOption(true);  // ✅ Affiche bouton “S’inscrire”
    }
  };

  const handleGoToRegister = () => {
    router.push('/auth/register');
  };

  return (
    <div>
      <h1>Connexion</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
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
        <button type="submit">Se connecter</button>
      </form>

      {/* ✅ Affiche le bouton uniquement si erreur */}
      {showRegisterOption && (
        <div>
          <p>Vous n'avez pas encore de compte ?</p>
          <button onClick={handleGoToRegister}>S'inscrire</button>
        </div>
      )}
    </div>
  );
}
