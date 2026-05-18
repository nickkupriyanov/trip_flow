import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthPage } from "@/pages/AuthPage";
import { ClientDetailPage } from "@/pages/ClientDetailPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PipelinePage } from "@/pages/PipelinePage";

const router = createBrowserRouter([
  { path: "/login", element: <AuthPage mode="login" /> },
  { path: "/register", element: <AuthPage mode="register" /> },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "pipeline", element: <PipelinePage /> },
          { path: "clients", element: <ClientsPage /> },
          { path: "clients/:clientId", element: <ClientDetailPage /> }
        ]
      }
    ]
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
