import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import type { UserRole } from "@shared/types";
import ToastContainer from "@/components/ui/Toast";
import MainLayout from "@/components/Layout/MainLayout";
import RequireAuth from "@/components/Layout/RequireAuth";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Children from "@/pages/Children";
import Classes from "@/pages/Classes";
import Leave from "@/pages/Leave";
import Health from "@/pages/Health";
import Recipes from "@/pages/Recipes";
import Pickup from "@/pages/Pickup";
import Activities from "@/pages/Activities";
import Billing from "@/pages/Billing";
import Settings from "@/pages/Settings";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  return <RequireAuth roles={roles}>{children}</RequireAuth>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute
                roles={["super_admin", "principal", "teacher", "finance", "parent"]}
              >
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="children"
            element={
              <ProtectedRoute
                roles={["super_admin", "principal", "teacher", "finance"]}
              >
                <Children />
              </ProtectedRoute>
            }
          />
          <Route
            path="classes"
            element={
              <ProtectedRoute
                roles={["super_admin", "principal", "teacher", "finance"]}
              >
                <Classes />
              </ProtectedRoute>
            }
          />
          <Route
            path="leave"
            element={
              <ProtectedRoute
                roles={["super_admin", "principal", "teacher", "finance", "parent"]}
              >
                <Leave />
              </ProtectedRoute>
            }
          />
          <Route
            path="health"
            element={
              <ProtectedRoute
                roles={["super_admin", "principal", "teacher"]}
              >
                <Health />
              </ProtectedRoute>
            }
          />
          <Route
            path="recipes"
            element={
              <ProtectedRoute
                roles={["super_admin", "principal", "teacher", "finance", "parent"]}
              >
                <Recipes />
              </ProtectedRoute>
            }
          />
          <Route
            path="pickup"
            element={
              <ProtectedRoute
                roles={["super_admin", "principal", "teacher", "finance", "parent"]}
              >
                <Pickup />
              </ProtectedRoute>
            }
          />
          <Route
            path="activities"
            element={
              <ProtectedRoute
                roles={["super_admin", "principal", "teacher", "finance", "parent"]}
              >
                <Activities />
              </ProtectedRoute>
            }
          />
          <Route
            path="billing"
            element={
              <ProtectedRoute
                roles={["super_admin", "principal", "teacher", "finance", "parent"]}
              >
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute
                roles={["super_admin", "principal"]}
              >
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}
