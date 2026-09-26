import { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import History from '../components/History';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Security from '../components/Security';
import LocationMap from '../components/LocationMap'
import Footer from '../components/Footer';
import ChatWidget from '../components/ChatWidget';

export default function LandingPage() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div>
      <Navbar onOpenChat={() => setChatOpen(true)} />
      <main>
        <Hero onOpenChat={() => setChatOpen(true)} />
        <About />
        <History />
        <Features />
        <HowItWorks />
        <Security />
        <LocationMap />
      </main>
      <Footer />
      <ChatWidget
        isOpen={chatOpen}
        onToggle={() => setChatOpen((v) => !v)}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}