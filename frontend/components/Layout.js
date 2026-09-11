import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main id="main-content" style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}