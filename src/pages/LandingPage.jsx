import { useState } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Security from "../components/Security";  
import ChatWidget from "../components/ChatWidget";
import "./LandingPage.css";

export default function LandingPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="landing">
        <Navbar onOpenChat={() => setIsChatOpen(true)} />
        <main>
            <Hero onOpenChat={() => setIsChatOpen(true)} />
            <Features />
            <HowItWorks />
            <Security />
        </main>
        <Footer />
        <ChatWidget
            isChatOpen={isChatOpen}
            onToggle={() => setIsChatOpen((v) => !v)}
            onClose={() => setIsChatOpen(false)}
        />
    </div>
  )
}