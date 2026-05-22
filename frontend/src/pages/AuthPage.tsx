import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "@/auth/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/errors";
import { FormField } from "@/pages/components/FormField";

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
      setFormError(
        getApiErrorMessage(error, "Не удалось войти. Проверьте данные и попробуйте ещё раз."),
      );
    }
  }

  async function handleRegister(values: RegisterFormValues) {
    setFormError(null);
    try {
      await register(values);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  }

  const activeForm = isRegister ? registerForm : loginForm;
  const isSubmitting = activeForm.formState.isSubmitting;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <Card className="grid w-full overflow-hidden lg:grid-cols-[1fr_420px]">
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
            <Tabs className="mb-6" value={mode}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="login"
                  onClick={() => navigate("/login", { replace: true })}
                >
                  Вход
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  onClick={() => navigate("/register", { replace: true })}
                >
                  Регистрация
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-normal">
                {isRegister ? "Создать аккаунт" : "Войти в TripFlow"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {isRegister
                  ? "Заведите рабочее пространство перед добавлением клиентов."
                  : "Продолжите работу с клиентами, заявками и напоминаниями."}
              </p>
            </div>

            {formError ? (
              <Alert className="mb-4" variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            {isRegister ? (
              <form
                className="space-y-4"
                onSubmit={registerForm.handleSubmit(handleRegister)}
              >
                <FormField
                  error={registerForm.formState.errors.name?.message}
                  label="Имя"
                >
                  <Input
                    autoComplete="name"
                    {...registerForm.register("name")}
                  />
                </FormField>
                <FormField
                  error={registerForm.formState.errors.email?.message}
                  label="Email"
                >
                  <Input
                    autoComplete="email"
                    type="email"
                    {...registerForm.register("email")}
                  />
                </FormField>
                <FormField
                  error={registerForm.formState.errors.password?.message}
                  label="Пароль"
                >
                  <Input
                    autoComplete="new-password"
                    type="password"
                    {...registerForm.register("password")}
                  />
                </FormField>
                <SubmitButton isLoading={isSubmitting}>
                  Создать аккаунт
                </SubmitButton>
              </form>
            ) : (
              <form
                className="space-y-4"
                onSubmit={loginForm.handleSubmit(handleLogin)}
              >
                <FormField
                  error={loginForm.formState.errors.email?.message}
                  label="Email"
                >
                  <Input
                    autoComplete="email"
                    type="email"
                    {...loginForm.register("email")}
                  />
                </FormField>
                <FormField
                  error={loginForm.formState.errors.password?.message}
                  label="Пароль"
                >
                  <Input
                    autoComplete="current-password"
                    type="password"
                    {...loginForm.register("password")}
                  />
                </FormField>
                <SubmitButton isLoading={isSubmitting}>Войти</SubmitButton>
              </form>
            )}
          </div>
        </Card>
      </div>
    </main>
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
    <Button className="w-full" disabled={isLoading} type="submit">
      {isLoading ? "Проверяем..." : children}
    </Button>
  );
}
