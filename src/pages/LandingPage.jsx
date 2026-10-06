import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import History from '../components/History';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Security from '../components/Security';
import LocationMap from '../components/LocationMap'
import Footer from '../components/Footer';
import { useChat } from '../lib/chatContext';

// The chatbot itself is rendered once for the whole site in App.jsx — this
// page's buttons just open it.
export default function LandingPage() {
  const { openChat } = useChat();

  return (
    <div>
      <Navbar onOpenChat={openChat} />
      <main>
        <Hero onOpenChat={openChat} />
        <About />
        <History />
        <Features />
        <HowItWorks />
        <Security />
        <LocationMap />
      </main>
      <Footer />
    </div>
  );
}