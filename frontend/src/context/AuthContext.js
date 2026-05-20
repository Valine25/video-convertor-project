import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginUser, registerUser } from "../api";

const AuthContext = createContext(null);
const SESSION_KEY = "cinepulse_session";

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => readJson(SESSION_KEY, null));

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  const value = useMemo(
    () => ({
      currentUser,
      register: async ({ name, email, password }) => {
        try {
          const result = await registerUser({ name, email, password });
          setCurrentUser(result.user);
          return { ok: true };
        } catch (error) {
          return { ok: false, message: error.message };
        }
      },
      login: async ({ email, password }) => {
        try {
          const result = await loginUser({ email, password });
          setCurrentUser(result.user);
          return { ok: true };
        } catch (error) {
          return { ok: false, message: error.message };
        }
      },
      logout: () => setCurrentUser(null),
    }),
    [currentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
