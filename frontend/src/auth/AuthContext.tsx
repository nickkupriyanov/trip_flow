import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  type AuthResponse,
  type User
} from "@/lib/api";
import {
  clearStoredToken,
  readStoredToken,
  saveStoredToken
} from "@/auth/tokenStorage";

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = LoginInput & {
  name: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    saveStoredToken(response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadCurrentUser() {
      const storedToken = readStoredToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser(storedToken);
        if (isActive) {
          setUser(currentUser);
          setToken(storedToken);
        }
      } catch {
        if (isActive) {
          logout();
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isActive = false;
    };
  }, [logout]);

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await loginUser(input);
      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const response = await registerUser(input);
      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      register,
      logout
    }),
    [isLoading, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
