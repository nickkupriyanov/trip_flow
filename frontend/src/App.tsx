import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { LoadingState } from "@/pages/components/Feedback";

const router = createBrowserRouter([
  {
    path: "/login",
    lazy: async () => {
      const { AuthPage } = await import("@/pages/AuthPage");
      return { Component: () => <AuthPage mode="login" /> };
    }
  },
  {
    path: "/register",
    lazy: async () => {
      const { AuthPage } = await import("@/pages/AuthPage");
      return { Component: () => <AuthPage mode="register" /> };
    }
  },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          {
            path: "dashboard",
            lazy: async () => {
              const { DashboardPage } = await import("@/pages/DashboardPage");
              return { Component: DashboardPage };
            }
          },
          {
            path: "pipeline",
            lazy: async () => {
              const { PipelinePage } = await import("@/pages/PipelinePage");
              return { Component: PipelinePage };
            }
          },
          {
            path: "reminders",
            lazy: async () => {
              const { RemindersPage } = await import("@/pages/RemindersPage");
              return { Component: RemindersPage };
            }
          },
          {
            path: "clients",
            lazy: async () => {
              const { ClientsPage } = await import("@/pages/ClientsPage");
              return { Component: ClientsPage };
            }
          },
          {
            path: "clients/:clientId",
            lazy: async () => {
              const { ClientDetailPage } = await import("@/pages/ClientDetailPage");
              return { Component: ClientDetailPage };
            }
          },
          {
            path: "requests/:requestId",
            lazy: async () => {
              const { TravelRequestDetailPage } = await import(
                "@/pages/TravelRequestDetailPage"
              );
              return { Component: TravelRequestDetailPage };
            }
          }
        ]
      }
    ]
  }
]);

export function App() {
  return (
    <RouterProvider
      fallbackElement={<LoadingState text="Загружаем TripFlow..." />}
      router={router}
    />
  );
}
