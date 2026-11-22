import { IMG_HERO } from '../data/seedData';
import { LoginPanel } from './LoginPanel';

interface EntryLoginGateProps {
  onContinueAsGuest: () => void;
}

export function EntryLoginGate({ onContinueAsGuest }: EntryLoginGateProps) {
  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#1F2A1C] flex flex-col">
      <header className="bg-[#9CAF88] border-b border-[#7F956B] px-4 sm:px-6 h-16 flex items-center justify-between">
        <span className="font-display text-2xl font-bold tracking-tight text-[#1F2A1C]">
          WICKED
        </span>
        <button
          type="button"
          onClick={onContinueAsGuest}
          className="px-4 py-2 rounded-md bg-[#F7F5EF] border border-[#1F2A1C]/20 text-xs sm:text-sm font-semibold text-[#1F2A1C] hover:bg-[#E7ECE0] transition-colors whitespace-nowrap"
        >
          Continue as Guest
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-7 space-y-5">
          <p className="text-xs font-medium text-[#4D5A48]">
            Indian Streetwear · Ethnic Fusion · Everyday Basics
          </p>
          <h1
            className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#1F2A1C] leading-[1.06]"
            style={{ textWrap: 'balance' }}
          >
            Rooted in Craft. Cut for Now.
          </h1>
          <p className="text-base text-[#4D5A48] max-w-xl leading-relaxed">
            Sign in for early drop access, saved Indian delivery addresses, and real-time order tracking—or continue directly as a guest.
          </p>
          <div className="aspect-[16/10] rounded-lg overflow-hidden border border-[#C5D1B8] bg-[#E7ECE0]">
            <img
              src={IMG_HERO}
              alt="Wicked Jaipur courtyard lookbook"
              width={1280}
              height={800}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="lg:col-span-5">
          <LoginPanel
            heading="Welcome to Wicked"
            subheading="Sign in with Google or a 6-digit Email OTP to begin."
            onContinueAsGuest={onContinueAsGuest}
          />
        </div>
      </main>
    </div>
  );
}
