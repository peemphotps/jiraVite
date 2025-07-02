import Board from "./components/Board";
import "./App.css";

function App() {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-100 via-blue-50 to-purple-50">
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-auto">
          <Board />
        </main>
      </div>
    </div>
  );
}

export default App;
