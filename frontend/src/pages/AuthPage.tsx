import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль")
});

const registerSchema = loginSchema.extend({
  name: z.string().min(1, "Введите имя").max(120, "Имя слишком длинное"),
  password: z.string().min(8, "Минимум 8 символов")
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

type AuthMode = "login" | "register";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Не удалось войти. Проверьте данные и попробуйте ещё раз.";
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const isRegister = mode === "register";

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", name: "", password: "" }
  });

  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname ?? "/dashboard";

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleLogin(values: LoginFormValues) {
    setFormError(null);
    try {
      await login(values);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  async function handleRegister(values: RegisterFormValues) {
    setFormError(null);
    try {
      await register(values);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  const activeForm = isRegister ? registerForm : loginForm;
  const isSubmitting = activeForm.formState.isSubmitting;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <section className="grid w-full overflow-hidden rounded-lg border bg-card shadow-sm lg:grid-cols-[1fr_420px]">
          <div className="border-b bg-muted/50 p-8 lg:border-b-0 lg:border-r lg:p-10">
            <p className="text-sm font-semibold text-primary">TripFlow</p>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-normal sm:text-4xl">
              CRM для турагента, где каждая заявка движется к понятному следующему шагу.
            </h1>
            <div className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-md border bg-card p-4">
                <p className="font-medium text-foreground">Клиент</p>
                <p className="mt-1">Контакты и предпочтения в одном месте.</p>
              </div>
              <div className="rounded-md border bg-card p-4">
                <p className="font-medium text-foreground">Заявка</p>
                <p className="mt-1">Статусы, варианты туров и предложение.</p>
              </div>
              <div className="rounded-md border bg-card p-4">
                <p className="font-medium text-foreground">Follow-up</p>
                <p className="mt-1">Напоминания и сегодняшняя работа без шума.</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 flex rounded-md border bg-muted p-1">
              <button
                className={cn(
                  "flex-1 rounded px-3 py-2 text-sm font-medium transition",
                  !isRegister
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
                type="button"
                onClick={() => navigate("/login", { replace: true })}
              >
                Вход
              </button>
              <button
                className={cn(
                  "flex-1 rounded px-3 py-2 text-sm font-medium transition",
                  isRegister
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
                type="button"
                onClick={() => navigate("/register", { replace: true })}
              >
                Регистрация
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-normal">
                {isRegister ? "Создать аккаунт" : "Войти в TripFlow"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {isRegister
                  ? "Заведите рабочее пространство перед добавлением клиентов."
                  : "Продолжите работу с клиентами, заявками и pipeline."}
              </p>
            </div>

            {formError ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            {isRegister ? (
              <form
                className="space-y-4"
                onSubmit={registerForm.handleSubmit(handleRegister)}
              >
                <Field
                  error={registerForm.formState.errors.name?.message}
                  label="Имя"
                >
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                    {...registerForm.register("name")}
                    autoComplete="name"
                  />
                </Field>
                <Field
                  error={registerForm.formState.errors.email?.message}
                  label="Email"
                >
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                    {...registerForm.register("email")}
                    autoComplete="email"
                    type="email"
                  />
                </Field>
                <Field
                  error={registerForm.formState.errors.password?.message}
                  label="Пароль"
                >
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                    {...registerForm.register("password")}
                    autoComplete="new-password"
                    type="password"
                  />
                </Field>
                <SubmitButton isLoading={isSubmitting}>
                  Создать аккаунт
                </SubmitButton>
              </form>
            ) : (
              <form
                className="space-y-4"
                onSubmit={loginForm.handleSubmit(handleLogin)}
              >
                <Field
                  error={loginForm.formState.errors.email?.message}
                  label="Email"
                >
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                    {...loginForm.register("email")}
                    autoComplete="email"
                    type="email"
                  />
                </Field>
                <Field
                  error={loginForm.formState.errors.password?.message}
                  label="Пароль"
                >
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                    {...loginForm.register("password")}
                    autoComplete="current-password"
                    type="password"
                  />
                </Field>
                <SubmitButton isLoading={isSubmitting}>Войти</SubmitButton>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  children,
  error,
  label
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}

function SubmitButton({
  children,
  isLoading
}: {
  children: React.ReactNode;
  isLoading: boolean;
}) {
  return (
    <button
      className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isLoading}
      type="submit"
    >
      {isLoading ? "Проверяем..." : children}
    </button>
  );
}
