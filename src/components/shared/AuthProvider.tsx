'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  login: (name: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ux-auth-user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  function login(name: string, email: string) {
    const u = { name, email };
    setUser(u);
    localStorage.setItem('ux-auth-user', JSON.stringify(u));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('ux-auth-user');
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
