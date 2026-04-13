import { Switch, Route } from "wouter";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import RegistryPage from "./pages/RegistryPage";
import UpdatePage from "./pages/UpdatePage";
import ExportPage from "./pages/ExportPage";

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/registry" component={RegistryPage} />
        <Route path="/update" component={UpdatePage} />
        <Route path="/export" component={ExportPage} />
      </Switch>
    </Layout>
  );
}
