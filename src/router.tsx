import { createBrowserRouter, Navigate } from 'react-router'
import { RootLayout, ProtectedLayout, Dashboard, SignIn, NotFound, RouteError } from './App'

export const router = createBrowserRouter([{ element: <RootLayout />, errorElement: <RouteError />, children: [
  { index: true, lazy: async () => ({ Component: (await import('./pages/home')).HomePage }) },
  { path: 'sign-in', element: <SignIn /> },
  { element: <ProtectedLayout />, children: [
    { path: 'apps', element: <Dashboard /> },
    { path: 'log', lazy: async () => ({ Component: (await import('./pages/log-layout')).LogLayout }), children: [
      { index: true, lazy: async () => ({ Component: (await import('./pages/log')).LogPage }) },
      { path: 'data', lazy: async () => ({ Component: (await import('./pages/data')).DataPage }) },
    ] },
    { path: 'data', element: <Navigate to="/log/data" replace /> },
    { path: 'settings', lazy: async () => ({ Component: (await import('./pages/settings')).SettingsPage }) },
    { path: '*', element: <NotFound /> },
  ] },
] }])
