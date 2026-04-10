import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Registry from "./pages/Registry";
import ExportPage from "./pages/ExportPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="registry" element={<Registry />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
