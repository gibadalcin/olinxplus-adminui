import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Login from "./pages/Login";
import ErrorBoundary from "./components/globalContext/ErrorBoundary";
import PrivateRoute from "./components/globalContext/PrivateRoute";
import { auth } from "./firebaseConfig"; // importe o auth

// Lazy load heavy pages for code-splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ImageManager = lazy(() => import("./pages/ImageManager"));
const Register = lazy(() => import("./pages/Register"));
const Content = lazy(() => import("./pages/Content"));

// Exponha o auth no window para uso no console do navegador
window.auth = auth;

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>}>
        <Routes>
          <Route path="/" element={
            <ErrorBoundary>
              <Login />
            </ErrorBoundary>
          } />
          <Route
            path="/dashboard"
            element={
              <ErrorBoundary>
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/images"
            element={
              <ErrorBoundary>
                <PrivateRoute>
                  <ImageManager />
                </PrivateRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/register"
            element={
              <ErrorBoundary>
                <PrivateRoute>
                  <Register />
                </PrivateRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/content"
            element={
              <ErrorBoundary>
                <PrivateRoute>
                  <Content />
                </PrivateRoute>
              </ErrorBoundary>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;