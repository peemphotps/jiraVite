import { useJiraStore } from "./store";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Board from "./components/Board";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const { currentView } = useJiraStore();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {currentView === "dashboard" && <Sidebar />}

        <main className="flex-1 overflow-auto">
          {currentView === "dashboard" ? <Board /> : <Dashboard />}
        </main>
      </div>
    </div>
  );
}

export default App;
