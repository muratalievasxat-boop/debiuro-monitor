import "./globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import DashboardPage from "./pages/DashboardPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>
  </React.StrictMode>
);
