import React from "react";
import AITab from "./components/AITab.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__logo">▶ YouTube Music</div>
        <div className="app__tab-label">AI Tab — concept prototype</div>
      </header>
      <main className="app__main">
        <AITab />
      </main>
      <footer className="app__footer">
        Prototype for the AI Mode product spec · not affiliated with or endorsed by YouTube/Google
      </footer>
    </div>
  );
}
