import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { startLogin } from "./const";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  HeartPulse,
  Home,
  LayoutDashboard,
  LocateFixed,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  Phone,
  Plus,
  Route,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  X,
} from "lucide-react";

type Role = "Rider" | "Caregiver" | "Driver" | "Dispatcher" | "Admin";
type View = "overview" | "bookings" | "drivers" | "operations" | "account";
type Status = "Requested" | "Assigned" | "Driver en route" | "Completed";

type DemoAccount = {
  name: string;
  role: Role | "Caregiver / Clinic Intake";
  email: string;
  initials: string;
  tone: string;
  destination: string;
};

type Booking = {
  id: string;
  passenger: string;
  pickup: string;
  destination: string;
  date: string;
  time: string;
  type: string;
  status: Status;
  driver?: string;
};

const accounts: DemoAccount[] = [
  { name: "Maria Lopez", role: "Rider", email: "maria.lopez@example.com", initials: "ML", tone: "coral", destination: "/rider" },
  { name: "James Lopez", role: "Caregiver", email: "james.lopez@example.com", initials: "JL", tone: "blue", destination: "/rider" },
  { name: "Andre Washington", role: "Driver", email: "andre.washington@example.com", initials: "AW", tone: "teal", destination: "/driver" },
  { name: "Priya Raman", role: "Driver", email: "priya.raman@example.com", initials: "PR", tone: "gold", destination: "/driver" },
  { name: "Denise Carter", role: "Dispatcher", email: "dispatch@example.com", initials: "DC", tone: "navy", destination: "/dispatch" },
  { name: "Alina Petrova", role: "Caregiver / Clinic Intake", email: "intake@harborclinic.example", initials: "AP", tone: "plum", destination: "/rider" },
];

const initialBookings: Booking[] = [
  { id: "AR-1048", passenger: "Maria Lopez", pickup: "7906 Andrus Road, Alexandria", destination: "Alexandria Dialysis Center", date: "Today", time: "10:30 AM", type: "Dialysis", status: "Driver en route", driver: "Andre Washington" },
  { id: "AR-1052", passenger: "Maria Lopez", pickup: "7906 Andrus Road, Alexandria", destination: "Inova Mount Vernon Hospital", date: "Thu, Nov 7", time: "9:00 AM", type: "Follow-up", status: "Assigned", driver: "Andre Washington" },
  { id: "AR-1056", passenger: "James Lopez", pickup: "Harbor Clinic", destination: "Springfield Therapy Partners", date: "Fri, Nov 8", time: "2:15 PM", type: "Therapy", status: "Requested" },
];

const navItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "drivers", label: "Drivers & vehicles", icon: CarFront },
  { id: "operations", label: "Operations", icon: Activity },
  { id: "account", label: "Account", icon: Users },
];

const roleFromPath = (path: string): Role => {
  if (path === "/driver") return "Driver";
  if (path === "/dispatch") return "Dispatcher";
  if (path === "/dashboard") return "Admin";
  return "Rider";
};

function getSavedAccount(): DemoAccount | null {
  try {
    const email = localStorage.getItem("aaa-demo-email");
    return accounts.find(account => account.email === email) ?? null;
  } catch {
    return null;
  }
}

function App() {
  const [location, setLocation] = useLocation();
  const [account, setAccount] = useState<DemoAccount | null>(getSavedAccount);
  const [view, setView] = useState<View>("overview");
  const [bookings, setBookings] = useState(initialBookings);

  useEffect(() => {
    const stored = getSavedAccount();
    if (stored) setAccount(stored);
  }, []);

  const signIn = (next: DemoAccount) => {
    setAccount(next);
    localStorage.setItem("aaa-demo-email", next.email);
    setLocation(next.destination);
  };

  const signOut = () => {
    localStorage.removeItem("aaa-demo-email");
    setAccount(null);
    setLocation("/");
  };

  if (location === "/sign-in" || location === "/sign-up" || location === "/forgot-password") {
    return <SignInPage selectedAccount={account} onSignIn={signIn} onBack={() => setLocation("/")} />;
  }

  if (!account && location !== "/") {
    setLocation("/sign-in");
    return null;
  }

  if (location === "/" || !account) {
    return <LandingPage onSignIn={() => setLocation("/sign-in")} />;
  }

  const role = account.role === "Caregiver / Clinic Intake" ? "Caregiver" : roleFromPath(location);
  const activeView = view;
  const setRoleView = (next: View) => {
    setView(next);
    if (next === "overview") setLocation(account.destination);
  };

  return (
    <AppShell account={account} activeView={activeView} onViewChange={setRoleView} onSignOut={signOut}>
      {role === "Driver" ? (
        <DriverDashboard account={account} />
      ) : role === "Dispatcher" ? (
        <DispatchDashboard bookings={bookings} setBookings={setBookings} />
      ) : role === "Admin" ? (
        <AdminDashboard />
      ) : (
        <RiderDashboard account={account} bookings={bookings} setBookings={setBookings} />
      )}
    </AppShell>
  );
}

function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="site-shell">
      <div className="emergency-bar">AAA Home Rides is a non-emergency transportation service. For medical emergencies, call 911 in the United States.</div>
      <header className="public-nav page-width">
        <a className="brand" href="/" onClick={event => { event.preventDefault(); window.location.href = "/"; }}>
          <Mark />
          <span><strong>AAA Home Rides</strong><small>LOCAL MEDICAL TRANSPORTATION</small></span>
        </a>
        <nav className="desktop-links" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#for-caregivers">For caregivers</a>
          <a href="#contact">Contact</a>
        </nav>
        <button className="button button-small button-dark" onClick={onSignIn}>Open demo <ArrowRight size={15} /></button>
      </header>

      <main>
        <section className="hero page-width">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> NON-EMERGENCY MEDICAL TRANSPORTATION</div>
            <h1>A more thoughtful way <em>to get there.</em></h1>
            <p className="hero-lede">A clear, coordinated ride plan for appointments, therapy, dialysis and the people who help make each journey possible.</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={onSignIn}>Plan a ride <ArrowRight size={16} /></button>
              <a className="text-link" href="#how-it-works">See how it works <ArrowRight size={15} /></a>
            </div>
            <div className="hero-notes"><span><MapPin size={14} /> Alexandria, Virginia</span><span><ShieldCheck size={14} /> Care-first coordination</span></div>
          </div>
          <div className="hero-art" aria-label="Illustration of a local ride route">
            <div className="art-topline"><span><span className="live-dot" /> RIDES THAT MATTER</span><span>01 / 04</span></div>
            <div className="route-illustration">
              <div className="route-sun" />
              <div className="route-road road-one" /><div className="route-road road-two" />
              <div className="route-car"><CarFront size={44} strokeWidth={1.1} /></div>
              <div className="route-pin pin-start"><span>Pickup</span><MapPin size={20} /></div>
              <div className="route-pin pin-end"><span>Care</span><HeartPulse size={20} /></div>
              <div className="route-dash" />
            </div>
            <div className="art-caption"><Sparkles size={16} /> A ride plan you can see.</div>
          </div>
        </section>

        <section className="trust-strip"><div className="page-width trust-inner"><span><HeartPulse size={17} /> Dignity in every detail</span><span><ShieldCheck size={17} /> Clear, careful coordination</span><span><CarFront size={17} /> Comfortable local rides</span></div></section>

        <section className="feature-section page-width" id="how-it-works">
          <div className="section-intro"><div className="eyebrow">A RIDE FOR THE MOMENTS THAT MATTER</div><h2>Every trip starts with a plan.</h2><p>Whether you are arranging transportation for yourself or someone you love, AAA Home Rides keeps the next step easy to understand.</p></div>
          <div className="feature-list"><Feature number="01" title="Tell us what you need" copy="Share the pickup, destination, date and ride preferences. The right details help the right people prepare." icon={<ClipboardCheck />} /><Feature number="02" title="See the journey" copy="Keep booking details, driver information and active trip status together in one calm place." icon={<Route />} /><Feature number="03" title="Arrive with confidence" copy="Get clear handoffs from requested to assigned to complete, with support when you need it." icon={<Check />} /></div>
        </section>

        <section className="audience-section page-width" id="for-caregivers"><div className="audience-card audience-dark"><span className="eyebrow light">FOR RIDERS & CAREGIVERS</span><h3>Care begins <em>with getting there.</em></h3><p>Plan a ride, keep the details close and give the person you are helping one less thing to worry about.</p><button className="button button-light" onClick={onSignIn}>Open rider demo <ArrowRight size={15} /></button></div><div className="audience-card audience-teal"><span className="eyebrow light">FOR LOCAL DRIVERS</span><h3>Bring your time and care to the road.</h3><p>See onboarding progress, vehicle details and assigned trips in one driver-ready view.</p><button className="button button-outline-light" onClick={onSignIn}>Open driver demo <ArrowRight size={15} /></button></div></section>

        <section className="contact-band page-width" id="contact"><div><div className="eyebrow">WE ARE HERE TO HELP</div><h2>Have a question about your trip?</h2></div><div className="contact-actions"><p>Call rider support to ask about your route, ride preferences and current availability.</p><a className="button button-primary" href="tel:+15713007806"><Phone size={16} /> (571) 300-7806</a></div></section>
      </main>
      <footer className="site-footer page-width"><div className="brand"><Mark /><span><strong>AAA Home Rides</strong><small>LOCAL MEDICAL TRANSPORTATION</small></span></div><p>Local rides for the journeys that matter.</p><span>© 2026 AAA Home Rides</span></footer>
    </div>
  );
}

function SignInPage({ selectedAccount, onSignIn, onBack }: { selectedAccount: DemoAccount | null; onSignIn: (account: DemoAccount) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<DemoAccount | null>(selectedAccount);
  const [email, setEmail] = useState(selectedAccount?.email ?? "");
  const [password, setPassword] = useState("HomeRide2026!");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const choose = (account: DemoAccount) => { setSelected(account); setEmail(account.email); setPassword("HomeRide2026!"); setNotice(""); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); const match = accounts.find(account => account.email === email); if (!match) { setNotice("Choose one of the fictional demo accounts to continue."); return; } onSignIn(match); };

 return <div className="auth-shell"><div className="auth-aside"><button className="back-link" onClick={onBack}><ArrowRight size={15} className="rotate-180" /> Back to AAA Home Rides</button><div className="auth-aside-copy"><div className="eyebrow light"><span className="eyebrow-line light-line" /> DEMO ACCESS</div><h1>A clear ride plan starts here.</h1><p>Step into a fictional role to explore the rider, driver and operations workflows.</p><div className="aside-note"><ShieldCheck size={18} /><span>Demo mode is clearly labeled and uses fictional data only.</span></div></div><div className="auth-aside-bottom"><Mark light /><span>Non-emergency transportation only.<br />For medical emergencies, call 911.</span></div></div><div className="auth-content"><div className="auth-content-inner"><div className="mobile-auth-brand"><Mark /><span><strong>AAA Home Rides</strong><small>LOCAL MEDICAL TRANSPORTATION</small></span></div><div className="auth-heading"><div className="eyebrow">WELCOME BACK</div><h2>Open the ride console.</h2><p>Choose a demonstration account or continue with the managed platform login.</p></div><form onSubmit={submit} className="auth-form"><label>Email address<input value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" type="email" /></label><label>Password<div className="password-wrap"><input value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? "text" : "password"} /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? "Hide" : "Show"}</button></div></label>{notice && <div className="form-notice"><CircleHelp size={16} /> {notice}</div>}<button className="button button-primary button-full" type="submit">Continue to demo <ArrowRight size={16} /></button><button className="button button-quiet button-full" type="button" onClick={startLogin}>Sign in with managed account <ShieldCheck size={16} /></button></form><div className="auth-divider"><span>OR CHOOSE A DEMO PERSONA</span></div><div className="demo-list">{accounts.map(account => <button key={account.email} className={`demo-row ${selected?.email === account.email ? "selected" : ""}`} onClick={() => choose(account)}><Avatar initials={account.initials} tone={account.tone} /><span className="demo-row-copy"><strong>{account.name}</strong><small>{account.role} · {account.email}</small></span>{selected?.email === account.email ? <Check size={18} className="demo-check" /> : <ArrowRight size={16} />}</button>)}</div><p className="demo-disclaimer">These demonstration accounts are fictional and intended for demonstration purposes only. They are usable in this Preview demo session; production authentication and database seeding still require configured server integrations.</p><div className="auth-footer-links"><a href="/sign-up">Sign up</a><a href="/forgot-password">Forgot password?</a></div></div></div></div>;
}

function AppShell({ account, activeView, onViewChange, onSignOut, children }: { account: DemoAccount; activeView: View; onViewChange: (view: View) => void; onSignOut: () => void; children: React.ReactNode }) {
  const [openMobile, setOpenMobile] = useState(false);
  const isOps = account.role === "Dispatcher" || account.role === "Admin";
  return <div className="app-shell"><aside className={`app-rail ${openMobile ? "open" : ""}`}><div className="rail-header"><a className="brand brand-compact" href="/" onClick={event => { event.preventDefault(); window.location.href = "/"; }}><Mark /><span><strong>AAA Home Rides</strong><small>RIDE CONSOLE</small></span></a><button className="rail-close" onClick={() => setOpenMobile(false)} aria-label="Close navigation"><X size={20} /></button></div><div className="rail-context"><span className="eyebrow">{isOps ? "OPERATIONS" : "MY RIDE PLAN"}</span><strong>{account.role === "Caregiver / Clinic Intake" ? "Harbor Clinic" : account.role}</strong><small>Demo workspace</small></div><nav className="rail-nav" aria-label="Console navigation">{navItems.map(item => <button key={item.id} className={activeView === item.id ? "active" : ""} onClick={() => { onViewChange(item.id); setOpenMobile(false); }}><item.icon size={17} /><span>{item.label}</span>{item.id === "operations" && isOps && <span className="nav-badge">3</span>}</button>)}</nav><div className="rail-bottom"><div className="support-mini"><Bell size={16} /><span><strong>Rider support</strong><a href="tel:+15713007806">(571) 300-7806</a></span></div><button className="account-mini" onClick={() => onViewChange("account")}><Avatar initials={account.initials} tone={account.tone} /><span><strong>{account.name}</strong><small>{account.role}</small></span><ChevronDown size={15} /></button><button className="signout-link" onClick={onSignOut}><LogOut size={15} /> Sign out</button></div></aside><div className="app-main"><header className="app-topbar"><button className="mobile-menu" onClick={() => setOpenMobile(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="topbar-breadcrumb"><span>AAA Home Rides</span><ArrowRight size={13} /><strong>{activeView === "overview" ? "Overview" : navItems.find(item => item.id === activeView)?.label}</strong></div><div className="topbar-actions"><span className="demo-pill"><span className="live-dot" /> DEMO SESSION</span><button className="icon-button" aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button></div></header><div className="app-content">{children}</div></div></div>;
}

function RiderDashboard({ account, bookings, setBookings }: { account: DemoAccount; bookings: Booking[]; setBookings: React.Dispatch<React.SetStateAction<Booking[]>> }) {
  const [showBooking, setShowBooking] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const visibleBookings = activeTab === "upcoming" ? bookings.filter(booking => booking.status !== "Completed") : bookings.filter(booking => booking.status === "Completed");
  return <div className="dashboard-page"><PageHeading eyebrow="MY RIDE PLAN" title={`Good morning, ${account.name.split(" ")[0]}.`} subtitle="Here is what is happening with your next ride." action={<button className="button button-primary" onClick={() => setShowBooking(true)}><Plus size={17} /> Book a ride</button>} /><section className="rider-grid"><div className="next-ride card"><div className="card-topline"><span className="eyebrow">01 / NEXT RIDE</span><StatusPill status="Driver en route" /></div><div className="ride-date"><strong>Today</strong><span>Monday, November 4 · 10:30 AM</span></div><div className="ride-route"><div className="route-marker pickup"><MapPin size={15} /></div><div className="route-copy"><strong>7906 Andrus Road</strong><span>Alexandria, VA 22306</span></div><div className="route-line" /><div className="route-marker destination"><HeartPulse size={15} /></div><div className="route-copy"><strong>Alexandria Dialysis Center</strong><span>2401 Mill Road</span></div></div><div className="ride-footer"><span><Clock3 size={15} /> Last updated 2 min ago</span><span className="status-note"><span className="live-dot" /> Demo GPS location</span></div></div><div className="driver-card card"><div className="card-topline"><span className="eyebrow">YOUR DRIVER</span><span className="verified-label"><ShieldCheck size={14} /> Approved</span></div><div className="driver-profile"><Avatar initials="AW" tone="teal" large /><div><h3>Andre Washington</h3><p>AAA Home Rides · 4.9 rider rating</p></div></div><div className="vehicle-line"><CarFront size={17} /><span><strong>Blue Toyota Sienna</strong><small>VA · HMR-2048</small></span></div><a className="button button-dark button-full" href="tel:+15713007806"><Phone size={16} /> Call driver</a><p className="small-note">Calls use your device's normal phone app. Platform telephony is not enabled in this demo.</p></div></section><section className="map-card card"><div className="map-card-copy"><span className="eyebrow">ACTIVE TRIP VIEW</span><h2>Know where the ride stands.</h2><p>The assigned driver's latest available location is shown during an eligible trip. No ETA is estimated here.</p><div className="location-state"><span className="live-dot" /><span><strong>Location available</strong><small>Last update 2 minutes ago · Demo GPS mode</small></span></div></div><MiniMap /></section><section className="table-card card"><div className="table-heading"><div><span className="eyebrow">YOUR BOOKINGS</span><h2>Upcoming rides</h2></div><div className="segmented"><button className={activeTab === "upcoming" ? "active" : ""} onClick={() => setActiveTab("upcoming")}>Upcoming</button><button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>History</button></div></div><div className="booking-table">{visibleBookings.length ? visibleBookings.map(booking => <BookingRow key={booking.id} booking={booking} />) : <div className="empty-state">Completed rides will appear here after a trip ends.</div>}</div></section>{showBooking && <BookingModal onClose={() => setShowBooking(false)} onCreate={booking => { setBookings(current => [booking, ...current]); setShowBooking(false); }} />}</div>;
}

function DriverDashboard({ account }: { account: DemoAccount }) {
  const [gps, setGps] = useState<"off" | "live" | "simulated">("off");
  const [onShift, setOnShift] = useState(false);
  const [tripStatus, setTripStatus] = useState<Status>("Assigned");
  const startGps = () => { if (!navigator.geolocation) { setGps("simulated"); return; } navigator.geolocation.getCurrentPosition(() => setGps("live"), () => setGps("simulated"), { enableHighAccuracy: true, timeout: 5000 }); };
  const nextTripStatus = () => setTripStatus(value => value === "Assigned" ? "Driver en route" : value === "Driver en route" ? "Completed" : "Completed");
  return <div className="dashboard-page"><PageHeading eyebrow="DRIVER CONSOLE" title={`Ready for the road, ${account.name.split(" ")[0]}.`} subtitle="Your trip details, onboarding and location controls live here." action={<button className={`button ${onShift ? "button-dark" : "button-primary"}`} onClick={() => setOnShift(value => !value)}>{onShift ? <><span className="live-dot" /> On shift</> : <>Start shift <ArrowRight size={16} /></>}</button>} /><div className="driver-kpis"><Metric label="Today's trips" value="03" detail="1 active now" icon={<Route />} /><Metric label="Onboarding" value="Approved" detail="Reviewed Oct 21" icon={<ShieldCheck />} /><Metric label="Documents" value="4 / 4" detail="Current for demo" icon={<FileCheck2 />} /><Metric label="Vehicle" value="HMR-2048" detail="Toyota Sienna" icon={<CarFront />} /></div><section className="driver-main-grid"><div className="card assigned-trip"><div className="card-topline"><span className="eyebrow">ASSIGNED TRIP · AR-1048</span><StatusPill status={tripStatus} /></div><h2>Maria Lopez</h2><p className="trip-type"><Stethoscope size={15} /> Dialysis appointment · Round trip</p><div className="driver-route"><div><span className="route-index">01</span><strong>7906 Andrus Road</strong><small>Pickup · Today at 10:30 AM</small></div><ArrowRight size={18} /><div><span className="route-index">02</span><strong>Alexandria Dialysis Center</strong><small>2401 Mill Road</small></div></div><div className="passenger-note"><Users size={16} /><span><strong>Passenger details</strong><small>Mobility assistance requested · Call support if anything changes.</small></span></div><div className="trip-actions"><button className="button button-primary" onClick={nextTripStatus}>{tripStatus === "Assigned" ? "Acknowledge trip" : tripStatus === "Driver en route" ? "Mark trip complete" : "Trip complete"} <ArrowRight size={15} /></button><button className="button button-quiet" onClick={startGps}><LocateFixed size={16} /> Share location</button></div></div><div className="card gps-card"><div className="card-topline"><span className="eyebrow">LOCATION SHARING</span><span className="status-chip">ACTIVE TRIP ONLY</span></div><div className="gps-ring"><LocateFixed size={28} /></div><h3>{gps === "off" ? "Location sharing is off" : gps === "live" ? "Live location enabled" : "Demo location enabled"}</h3><p>{gps === "off" ? "Start it only when you are participating in the assigned trip." : gps === "live" ? "Your browser granted location permission. Updates are sent while this trip remains eligible." : "A fictional location is shown for demonstration because live GPS was unavailable or declined."}</p><button className="button button-dark button-full" onClick={startGps}>{gps === "off" ? "Start GPS sharing" : "Refresh location permission"}</button><div className="gps-restriction"><ShieldCheck size={15} /><span>Off-duty tracking is not enabled.</span></div></div></section><section className="two-column-section"><div className="card checklist-card"><div className="card-heading"><span className="eyebrow">ONBOARDING</span><h2>Driver readiness</h2></div><ChecklistRow label="Personal details" /><ChecklistRow label="Driver photograph" /><ChecklistRow label="Licence information" /><ChecklistRow label="Vehicle information" /><ChecklistRow label="Required documents" /></div><div className="card document-card"><div className="card-heading"><span className="eyebrow">DOCUMENTS</span><h2>Keep the folder current.</h2></div><p>Identity and vehicle documents are reviewed by authorized staff. Uploads become trusted operational information only after review.</p><div className="document-status"><FileCheck2 size={19} /><span><strong>All demo documents current</strong><small>Last reviewed October 21, 2026</small></span></div><button className="button button-quiet button-full">View document status <ArrowRight size={15} /></button></div></section></div>;
}

function DispatchDashboard({ bookings, setBookings }: { bookings: Booking[]; setBookings: React.Dispatch<React.SetStateAction<Booking[]>> }) {
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(bookings[0]);
  const filtered = filter === "All" ? bookings : bookings.filter(booking => booking.status === filter);
  const assign = (id: string) => { setBookings(current => current.map(booking => booking.id === id ? { ...booking, status: "Assigned", driver: "Priya Raman" } : booking)); setSelectedBooking(current => current && current.id === id ? { ...current, status: "Assigned", driver: "Priya Raman" } : current); };
  return <div className="dashboard-page"><PageHeading eyebrow="DISPATCH DESK" title="A calm view of the road ahead." subtitle="Coordinate bookings, drivers and trip exceptions from one operational surface." action={<button className="button button-dark"><Bell size={16} /> Review alerts <span className="button-count">3</span></button>} /><div className="dispatch-kpis"><Metric label="Today's bookings" value="12" detail="2 need assignment" icon={<CalendarDays />} /><Metric label="Active trips" value="04" detail="All locations available" icon={<Navigation />} /><Metric label="Approved drivers" value="08" detail="3 available now" icon={<CarFront />} /><Metric label="Open exceptions" value="02" detail="Review before 4 PM" icon={<CircleHelp />} /></div><section className="dispatch-layout"><div className="card dispatch-list"><div className="table-heading"><div><span className="eyebrow">BOOKING QUEUE</span><h2>Today's transportation</h2></div><select value={filter} onChange={event => setFilter(event.target.value as "All" | Status)}><option>All</option><option>Requested</option><option>Assigned</option><option>Driver en route</option><option>Completed</option></select></div><div className="filter-tabs">{(["All", "Requested", "Assigned", "Driver en route"] as const).map(value => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value}</button>)}</div><div className="dispatch-bookings">{filtered.map(booking => <button key={booking.id} className={`dispatch-row ${selectedBooking?.id === booking.id ? "selected" : ""}`} onClick={() => setSelectedBooking(booking)}><span className="dispatch-time"><strong>{booking.time}</strong><small>{booking.id}</small></span><span className="dispatch-passenger"><strong>{booking.passenger}</strong><small>{booking.type} · {booking.pickup}</small></span><StatusPill status={booking.status} /><ArrowRight size={16} /></button>)}</div></div><div className="dispatch-side"><div className="card dispatch-detail">{selectedBooking ? <><div className="card-topline"><span className="eyebrow">BOOKING DETAIL · {selectedBooking.id}</span><StatusPill status={selectedBooking.status} /></div><h2>{selectedBooking.passenger}</h2><div className="detail-route"><div><MapPin size={16} /><span><small>Pickup</small><strong>{selectedBooking.pickup}</strong></span></div><div><HeartPulse size={16} /><span><small>Destination</small><strong>{selectedBooking.destination}</strong></span></div></div><div className="detail-line"><span>Assigned driver</span><strong>{selectedBooking.driver ?? "Unassigned"}</strong></div><div className="detail-line"><span>Vehicle requirement</span><strong>Standard / mobility-ready</strong></div>{selectedBooking.status === "Requested" && <button className="button button-primary button-full" onClick={() => assign(selectedBooking.id)}>Assign Priya Raman <ArrowRight size={15} /></button>}<button className="button button-quiet button-full">Open event history <ArrowRight size={15} /></button></> : <div className="empty-state">Select a booking to inspect its details.</div>}</div><div className="card active-map-card"><div className="card-topline"><span className="eyebrow">ACTIVE TRIP MAP</span><span className="status-chip">4 LIVE</span></div><MiniMap compact /><div className="map-legend"><span><i className="legend-dot driver-dot" /> Driver</span><span><i className="legend-dot pickup-dot" /> Pickup</span><span><i className="legend-dot stale-dot" /> Stale</span></div></div></div></section></div>;
}

function AdminDashboard() {
  return <div className="dashboard-page"><PageHeading eyebrow="ADMINISTRATION" title="Keep the operation ready." subtitle="Review people, permissions and operational signals without losing the human details." action={<button className="button button-primary"><Plus size={16} /> Invite staff</button>} /><div className="admin-grid"><Metric label="Active users" value="18" detail="6 demo accounts" icon={<Users />} /><Metric label="Driver approvals" value="02" detail="Awaiting review" icon={<ShieldCheck />} /><Metric label="Documents" value="14" detail="2 need attention" icon={<FileCheck2 />} /><Metric label="Audit events" value="128" detail="Last 24 hours" icon={<Activity />} /></div><section className="admin-columns"><div className="card review-card"><div className="card-heading"><span className="eyebrow">REVIEW QUEUE</span><h2>What needs an eye today</h2></div><ReviewItem icon={<CarFront />} title="Priya Raman · driver application" detail="Submitted Nov 1 · 4 documents" action="Review" /><ReviewItem icon={<FileCheck2 />} title="Andre Washington · licence renewal" detail="Due in 12 days · no action yet" action="Open" /><ReviewItem icon={<Bell />} title="2 booking exceptions" detail="Dispatch desk · last updated 11:42 AM" action="View" /></div><div className="card roles-card"><div className="card-heading"><span className="eyebrow">ROLE COVERAGE</span><h2>People with access</h2></div>{accounts.slice(0, 5).map(account => <div className="role-row" key={account.email}><Avatar initials={account.initials} tone={account.tone} /><span><strong>{account.name}</strong><small>{account.role}</small></span><span className="role-state">Active</span></div>)}</div></section><section className="card audit-card"><div className="table-heading"><div><span className="eyebrow">AUDIT TRAIL</span><h2>Recent operational events</h2></div><button className="text-link">View all <ArrowRight size={15} /></button></div><div className="audit-list"><AuditRow time="11:42 AM" actor="Denise Carter" action="assigned booking AR-1056 to Priya Raman" /><AuditRow time="10:18 AM" actor="Andre Washington" action="acknowledged trip AR-1048" /><AuditRow time="Yesterday" actor="Alina Petrova" action="created a clinic intake booking" /></div></section></div>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="page-heading-action">{action}</div>}</div>;
}

function Feature({ number, title, copy, icon }: { number: string; title: string; copy: string; icon: React.ReactNode }) { return <article className="feature-item"><span className="feature-number">{number}</span><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{copy}</p><ArrowRight size={17} /></article>; }
function Mark({ light = false }: { light?: boolean }) { return <span className={`mark ${light ? "mark-light" : ""}`} aria-hidden="true"><span /><span /><span /></span>; }
function Avatar({ initials, tone, large = false }: { initials: string; tone: string; large?: boolean }) { return <span className={`avatar avatar-${tone} ${large ? "avatar-large" : ""}`}>{initials}</span>; }
function StatusPill({ status }: { status: string }) { const key = status.toLowerCase().replaceAll(" ", "-"); return <span className={`status-pill status-${key}`}><span />{status}</span>; }
function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) { return <div className="metric-card card"><div className="metric-icon">{icon}</div><div><span className="eyebrow">{label}</span><strong>{value}</strong><small>{detail}</small></div></div>; }
function BookingRow({ booking }: { booking: Booking }) { return <div className="booking-row"><div className="booking-date"><strong>{booking.date}</strong><small>{booking.time}</small></div><div className="booking-route"><strong>{booking.destination}</strong><small>{booking.pickup}</small></div><div className="booking-kind">{booking.type}</div><StatusPill status={booking.status} /><ArrowRight size={16} /></div>; }
function MiniMap({ compact = false }: { compact?: boolean }) { return <div className={`mini-map ${compact ? "mini-map-compact" : ""}`}><div className="map-grid" /><div className="map-water" /><div className="map-route map-route-a" /><div className="map-route map-route-b" /><span className="map-marker map-marker-driver"><CarFront size={13} /></span><span className="map-marker map-marker-pickup"><MapPin size={13} /></span><span className="map-marker map-marker-care"><HeartPulse size={13} /></span><div className="map-label label-driver">Andre · last update 2 min</div><div className="map-label label-care">Alexandria Dialysis Center</div></div>; }
function ChecklistRow({ label }: { label: string }) { return <div className="checklist-row"><span className="check-circle"><Check size={13} /></span><span>{label}</span><small>Complete</small></div>; }
function ReviewItem({ icon, title, detail, action }: { icon: React.ReactNode; title: string; detail: string; action: string }) { return <div className="review-item"><span className="review-icon">{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><button className="text-link">{action} <ArrowRight size={14} /></button></div>; }
function AuditRow({ time, actor, action }: { time: string; actor: string; action: string }) { return <div className="audit-row"><span>{time}</span><strong>{actor}</strong><p>{action}</p><Check size={16} /></div>; }

function BookingModal({ onClose, onCreate }: { onClose: () => void; onCreate: (booking: Booking) => void }) {
  const [form, setForm] = useState({ passenger: "Maria Lopez", pickup: "", destination: "", date: "", time: "", type: "Doctor appointment" });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); onCreate({ id: `AR-${1060 + Math.floor(Math.random() * 20)}`, passenger: form.passenger, pickup: form.pickup || "Pickup to be confirmed", destination: form.destination || "Destination to be confirmed", date: form.date || "Requested", time: form.time || "Time to be confirmed", type: form.type, status: "Requested" }); };
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card"><div className="modal-heading"><div><span className="eyebrow">NEW REQUEST</span><h2>Plan a ride</h2><p>Start with the details you know. The scheduling team can confirm availability.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><form className="booking-form" onSubmit={submit}><label>Passenger<select value={form.passenger} onChange={event => update("passenger", event.target.value)}><option>Maria Lopez</option><option>James Lopez</option></select></label><div className="form-grid"><label>Pickup address<input value={form.pickup} onChange={event => update("pickup", event.target.value)} placeholder="Street, city, state" /></label><label>Destination<input value={form.destination} onChange={event => update("destination", event.target.value)} placeholder="Clinic or appointment" /></label></div><div className="form-grid"><label>Date<input value={form.date} onChange={event => update("date", event.target.value)} type="date" /></label><label>Pickup time<input value={form.time} onChange={event => update("time", event.target.value)} type="time" /></label></div><label>Ride type<select value={form.type} onChange={event => update("type", event.target.value)}><option>Doctor appointment</option><option>Therapy</option><option>Dialysis</option><option>Other non-emergency care</option></select></label><div className="modal-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">Submit request <ArrowRight size={15} /></button></div></form></div></div>;
}

export default App;
