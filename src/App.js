import Background from "./components/Background/background";
import Footer from "./components/Footer/footer";
import Header from "./components/Header/header";
import Home from "./pages/Home/home";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <Background />
      <Header />
      <Home />
      <Footer />
    </div>
  );
}
