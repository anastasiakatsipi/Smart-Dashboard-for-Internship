// src/auth/AuthContext.jsx
import React, { createContext, useEffect, useMemo, useState } from "react";
import {
  login as svcLogin,
  logout as svcLogout,
  getAccessToken,
  decodeJwt,
} from "../services/authService.js";
import { refreshTokens } from "../services/authService.js";
export const AuthContext = createContext(null);

// -------------------------------
//   Helper: Validate JWT Token
// -------------------------------
function isTokenValid(token) {
  if (!token) return false;

  try {
    const decoded = decodeJwt(token);
    if (!decoded?.exp) return false;

    const now = Date.now() / 1000;
    return decoded.exp > now;
  } catch {
    return false;
  }
}

// -------------------------------
//   Load roles from .env
// -------------------------------
const AVAILABLE_ROLES = import.meta.env.VITE_ROLES ? import.meta.env.VITE_ROLES.split(",") : [] ;

const DEFAULT_ROLE = import.meta.env.VITE_DEFAULT_ROLE;

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAccessToken());
  const [user, setUser] = useState(() => {
    const t = getAccessToken();

    if (t && isTokenValid(t)) {
      const decoded = decodeJwt(t);
      return { ...decoded, role: DEFAULT_ROLE }; // ROLE
    }

    return DEFAULT_ROLE ? { role: DEFAULT_ROLE } : null;
  });

  // Update user if token changes
  useEffect(() => {
    if (token && isTokenValid(token)) {
      const decoded = decodeJwt(token);
      setUser({ ...decoded, role: DEFAULT_ROLE }); //  ROLE
    } else {
      setUser(DEFAULT_ROLE ? { role: DEFAULT_ROLE } : null);
    }
  }, [token]);

  // Helper: check if user has a specific role
  const hasRole = (role) => user?.role === role;

  const value = useMemo(
  () => ({
    token,
    user,
    isAuthenticated: isTokenValid(token),

    roles: AVAILABLE_ROLES,
    currentRole: user?.role,
    hasRole,

    async login({
      username,
      password,
      client_id,
      client_secret,
      remember = true,
    }) {
      const data = await svcLogin({
        username,
        password,
        client_id,
        client_secret,
        remember,
      });
      setToken(data.access_token);
      return data;
    },

    logout() {
      svcLogout();
      setToken(null);
    },

    // refresh tokens από AuthContext
    async refresh() {
      const newToken = await refreshTokens();
      setToken(newToken);
      return newToken;
    },
  }),
  [token, user]
);


  return <AuthContext.Provider value={value}> {children} </AuthContext.Provider>;
}
