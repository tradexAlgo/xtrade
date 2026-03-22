const trades = [
  { pair: 'EUR/USD', price: '1.0845', change: '+0.12%', up: true },
  { pair: 'GBP/USD', price: '1.2678', change: '-0.05%', up: false },
  { pair: 'USD/JPY', price: '148.32', change: '+0.23%', up: true },
  { pair: 'AUD/USD', price: '0.6543', change: '-0.08%', up: false },
  { pair: 'USD/CAD', price: '1.3542', change: '+0.15%', up: true },
  { pair: 'USD/CHF', price: '0.8845', change: '-0.03%', up: false },
  { pair: 'NZD/USD', price: '0.6123', change: '+0.18%', up: true },
  { pair: 'EUR/GBP', price: '0.8554', change: '+0.07%', up: true },
  { pair: 'GBP/JPY', price: '187.92', change: '-0.12%', up: false },
  { pair: 'EUR/JPY', price: '160.84', change: '+0.25%', up: true },
  { pair: 'XAU/USD', price: '2,045.60', change: '+0.45%', up: true },
  { pair: 'XAG/USD', price: '22.84', change: '-0.22%', up: false },
  { pair: 'BTC/USD', price: '43,245.00', change: '+1.25%', up: true },
  { pair: 'ETH/USD', price: '2,584.50', change: '+0.85%', up: true },
  { pair: 'USD/CNH', price: '7.1850', change: '-0.04%', up: false },
]

function TradeItem({ trade }) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 min-w-max">
      <span className="font-semibold text-white text-sm">{trade.pair}</span>
      <span className="text-white/90 text-sm font-mono">{trade.price}</span>
      <span className={`flex items-center gap-1 text-xs font-medium ${trade.up ? 'text-green-400' : 'text-red-400'}`}>
        <span className={`w-0 h-0 border-l-[4px] border-r-[4px] ${trade.up ? 'border-b-[6px] border-b-current border-l-transparent border-r-transparent' : 'border-t-[6px] border-t-current border-l-transparent border-r-transparent'}`} />
        {trade.change}
      </span>
    </div>
  )
}

export default function Hero() {
  // Double the trades array for seamless loop
  const allTrades = [...trades, ...trades]

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="/Dioslogo.png"
        >
          <source src="/extredesvideo.mp4" type="video/mp4" />
        </video>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(108,14,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(108,14,42,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Live Trades Ticker */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="bg-gradient-to-t from-black/60 to-transparent pt-20 pb-6">
          <div className="relative overflow-hidden">
            <div className="flex gap-4 animate-scroll-left">
              {allTrades.map((trade, index) => (
                <TradeItem key={index} trade={trade} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }
        .animate-scroll-left:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
