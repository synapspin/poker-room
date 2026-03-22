interface SidebarProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
}

const NAV_ITEMS = [
  { id: 'lobby', icon: 'grid_view', label: 'Lobby' },
  { id: 'tables', icon: 'playing_cards', label: 'Tables' },
  { id: 'profile', icon: 'person', label: 'Profile' },
  { id: 'cashier', icon: 'payments', label: 'Cashier' },
];

export function Sidebar({ activeScreen, onNavigate }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex fixed left-0 top-16 bottom-0 w-56 bg-surface-container-low z-40 flex-col py-8 px-3">
        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(item => {
            const isActive = activeScreen === item.id || (item.id === 'lobby' && activeScreen === 'lobby');
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-4 py-3 px-4 rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high/50 hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="font-body text-sm font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto px-2">
          <button className="w-full py-3 bg-primary text-on-primary font-headline font-bold text-sm uppercase rounded-lg hover:opacity-90 active:scale-95 transition-all duration-200">
            Quick Seat
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 w-full h-20 bg-surface-container-low/80 backdrop-blur-xl z-50 flex justify-around items-center px-2">
        {NAV_ITEMS.map(item => {
          const isActive = activeScreen === item.id || (item.id === 'lobby' && activeScreen === 'lobby');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all duration-200
                ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-[10px] font-label uppercase tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
