import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Login from "./pages/Login";
import ErrorBoundary from "./components/globalContext/ErrorBoundary";
import PrivateRoute from "./components/globalContext/PrivateRoute";
import { auth } from "./firebaseConfig"; // importe o auth
import CircularProgress from '@mui/material/CircularProgress';

// Lazy load heavy pages for code-splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ImageManager = lazy(() => import("./pages/ImageManager"));
const Register = lazy(() => import("./pages/Register"));
const Content = lazy(() => import("./pages/Content"));

// Exponha o auth no window para uso no console do navegador
window.auth = auth;

// Loading fallback com o mesmo background das páginas
const PageLoader = () => (
  <div style={{
    minHeight: "100vh",
    width: "100vw",
    backgroundColor: "#0047AB",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem"
  }}>
    <CircularProgress
      size={60}
      style={{ color: '#fff' }}
    />
    <div style={{
      color: "#fff",
      fontSize: "1.2rem",
      fontWeight: "500",
      letterSpacing: "0.5px"
    }}>
      Carregando...
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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