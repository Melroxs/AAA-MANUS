import { useEffect, useRef, useState } from "react";
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
type Status = "Requested" | "Assigned" | "Driver en route" | "Driver arrived" | "Passenger picked up" | "In progress" | "Completed" | "Cancelled" | "Exception";

type DemoAccount = {
  id?: number;
  name: string;
  role: Role | "Caregiver / Clinic Intake";
  serverRole?: string;
  email: string;
  initials: string;
  tone: string;
  destination: string;
  phone?: string | null;
};

type Booking = {
  id: string;
  dbId?: number;
  passenger: string;
  pickup: string;
  destination: string;
  date: string;
  time: string;
  type: string;
  status: Status;
  driver?: string;
  driverDetails?: { name: string; phone: string | null; vehicleMake: string; vehicleModel: string; vehicleColor: string; licensePlate: string; licenseState: string } | null;
  vehicle?: { id: number; make: string; model: string; color: string; licensePlate: string; licenseState: string; mobilityReady: boolean; status: string } | null;
  latestLocation?: { latitude: number; longitude: number; source: string; recordedAt: string; stale: boolean } | null;
};

const accounts: DemoAccount[] = [
  { name: "Maria Lopez", role: "Rider", email: "maria.lopez@example.com", initials: "ML", tone: "coral", destination: "/rider" },
  { name: "James Lopez", role: "Caregiver", email: "james.lopez@example.com", initials: "JL", tone: "blue", destination: "/rider" },
  { name: "Andre Washington", role: "Driver", email: "andre.washington@example.com", initials: "AW", tone: "teal", destination: "/driver" },
  { name: "Priya Raman", role: "Driver", email: "priya.raman@example.com", initials: "PR", tone: "gold", destination: "/driver" },
  { name: "Denise Carter", role: "Dispatcher", email: "dispatch@example.com", initials: "DC", tone: "navy", destination: "/dispatch" },
  { name: "Alina Petrova", role: "Caregiver / Clinic Intake", email: "intake@harborclinic.example", initials: "AP", tone: "plum", destination: "/rider" },
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

function fromServerAccount(account: DemoAccount & { roleLabel?: string; serverRole?: string }): DemoAccount {
  return { ...account, role: account.roleLabel as DemoAccount["role"] ?? account.role, serverRole: account.serverRole ?? account.role };
}

function fromServerBooking(booking: Booking & { dbId?: number }): Booking {
  return { ...booking, dbId: booking.dbId };
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { credentials: "include", ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Request could not be completed.");
  return body as T;
}

function App() {
  const [location, setLocation] = useLocation();
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>("overview");
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    getJson<{ account: DemoAccount | null }>("/api/auth/me")
      .then(result => setAccount(result.account ? fromServerAccount(result.account) : null))
      .catch(() => setAccount(null))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!account) return;
    getJson<{ bookings: Booking[] }>("/api/bookings")
      .then(result => setBookings(result.bookings.map(fromServerBooking)))
      .catch(() => setBookings([]));
  }, [account?.id]);

  useEffect(() => {
    const pathView = location.replace("/", "");
    if (["overview", "bookings", "drivers", "drivers&vehicles", "operations", "account"].includes(pathView)) setView((pathView === "drivers&vehicles" ? "drivers" : pathView) as View);
  }, [location]);

  const signIn = async (email: string, password: string) => {
    const result = await getJson<{ account: DemoAccount }>("/api/auth/demo-login", { method: "POST", body: JSON.stringify({ email, password }) });
    const next = fromServerAccount(result.account);
    setAccount(next);
    setLocation(next.destination);
  };

  const signOut = async () => {
    await getJson("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setAccount(null);
    setLocation("/");
  };

  if (location === "/sign-in" || location === "/sign-up" || location === "/forgot-password") {
    return <SignInPage selectedAccount={account} onSignIn={signIn} onBack={() => setLocation("/")} />;
  }

  if (authLoading && location !== "/") return <LoadingScreen />;

  if (!account && location !== "/") {
    setLocation("/sign-in");
    return null;
  }

  if (location === "/" || !account) {
    return <LandingPage onSignIn={() => setLocation("/sign-in")} />;
  }

  const role = account.serverRole === "driver" ? "Driver" : account.serverRole === "dispatcher" ? "Dispatcher" : account.serverRole === "admin" ? "Admin" : "Caregiver";
  const activeView = view;
  const setRoleView = (next: View) => {
    setView(next);
    setLocation(next === "overview" ? "/overview" : `/${next}`);
  };

  return (
    <AppShell account={account} activeView={activeView} onViewChange={setRoleView} onSignOut={signOut}>
      {activeView === "bookings" ? (
        <BookingsPage account={account} bookings={bookings} setBookings={setBookings} />
      ) : activeView === "drivers" ? (
        <DriversVehiclesPage account={account} bookings={bookings} />
      ) : activeView === "operations" ? (
        <OperationsPage account={account} bookings={bookings} setBookings={setBookings} />
      ) : activeView === "account" ? (
        <AccountPage account={account} />
      ) : role === "Driver" ? (
        <DriverDashboard account={account} bookings={bookings} setBookings={setBookings} />
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
          <div className="hero-art hero-art-image" aria-label="AAA Home Rides routebook showing a pickup and appointment route">
            <div className="art-topline"><span><span className="live-dot" /> RIDES THAT MATTER</span><span>01 / 04</span></div>
            <img className="hero-routebook" src="/manus-storage/pasted_file_LUfwar_image_f575b0f9.png" alt="AAA Home Rides demonstration route from pickup to appointment" />
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

function SignInPage({ selectedAccount, onSignIn, onBack }: { selectedAccount: DemoAccount | null; onSignIn: (email: string, password: string) => Promise<void>; onBack: () => void }) {
  const [selected, setSelected] = useState<DemoAccount | null>(selectedAccount);
  const [email, setEmail] = useState(selectedAccount?.email ?? "");
  const [password, setPassword] = useState("HomeRide2026!");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const choose = (account: DemoAccount) => { setSelected(account); setEmail(account.email); setPassword("HomeRide2026!"); setNotice(""); };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setNotice(""); try { await onSignIn(email, password); } catch (error) { setNotice(error instanceof Error ? error.message : "Email or password is incorrect."); } };

 return <div className="auth-shell"><div className="auth-aside"><button className="back-link" onClick={onBack}><ArrowRight size={15} className="rotate-180" /> Back to AAA Home Rides</button><div className="auth-aside-copy"><div className="eyebrow light"><span className="eyebrow-line light-line" /> SECURE DEMO ACCESS</div><h1>A clear ride plan starts here.</h1><p>Sign in to a persistent fictional account and explore the rider, driver and operations workflows.</p><div className="aside-note"><ShieldCheck size={18} /><span>Passwords are verified on the backend and sessions persist across refreshes.</span></div></div><div className="auth-aside-bottom"><Mark light /><span>Non-emergency transportation only.<br />For medical emergencies, call 911.</span></div></div><div className="auth-content"><div className="auth-content-inner"><div className="mobile-auth-brand"><Mark /><span><strong>AAA Home Rides</strong><small>LOCAL MEDICAL TRANSPORTATION</small></span></div><div className="auth-heading"><div className="eyebrow">WELCOME BACK</div><h2>Open the ride console.</h2><p>Choose a demonstration account or continue with the managed platform login.</p></div><form onSubmit={submit} className="auth-form"><label>Email address<input value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" type="email" /></label><label>Password<div className="password-wrap"><input value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? "text" : "password"} /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? "Hide" : "Show"}</button></div></label>{notice && <div className="form-notice"><CircleHelp size={16} /> {notice}</div>}<button className="button button-primary button-full" type="submit">Sign in securely <ArrowRight size={16} /></button><button className="button button-quiet button-full" type="button" onClick={startLogin}>Sign in with managed account <ShieldCheck size={16} /></button></form><div className="auth-divider"><span>OR CHOOSE A DEMO PERSONA</span></div><div className="demo-list">{accounts.map(account => <button key={account.email} type="button" className={`demo-row ${selected?.email === account.email ? "selected" : ""}`} onClick={() => choose(account)}><Avatar initials={account.initials} tone={account.tone} /><span className="demo-row-copy"><strong>{account.name}</strong><small>{account.role} · {account.email}</small></span>{selected?.email === account.email ? <Check size={18} className="demo-check" /> : <ArrowRight size={16} />}</button>)}</div><p className="demo-disclaimer">These demonstration accounts are fictional, seeded in the configured application database, and intended for demonstration purposes only. Shared password: <strong>HomeRide2026!</strong></p><div className="auth-footer-links"><a href="/sign-up">Sign up</a><a href="/forgot-password">Forgot password?</a></div></div></div></div>;
}

function LoadingScreen() {
  return <div className="loading-screen"><div className="loading-mark"><Mark /></div><strong>Opening your secure ride console…</strong><span>Checking your persistent session.</span></div>;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: number; title: string; body: string; readAt: string | null }>>([]);
  const unread = notifications.filter(item => !item.readAt).length;
  const load = async () => {
    try {
      const result = await getJson<{ notifications: typeof notifications }>("/api/notifications");
      setNotifications(result.notifications);
    } catch {
      setNotifications([]);
    }
  };
  return <div className="notification-wrap"><button className="icon-button" aria-label="Notifications" onClick={() => { setOpen(value => !value); void load(); }}><Bell size={18} />{unread > 0 && <span className="notification-dot" />}</button>{open && <div className="notification-popover"><div className="notification-popover-heading"><strong>Notifications</strong><span>{unread} unread</span></div>{notifications.length ? notifications.slice(0, 8).map(item => <button key={item.id} className={`notification-item ${item.readAt ? "read" : ""}`} onClick={() => { void getJson(`/api/notifications/${item.id}/read`, { method: "POST" }); setNotifications(current => current.map(notification => notification.id === item.id ? { ...notification, readAt: new Date().toISOString() } : notification)); }}><strong>{item.title}</strong><span>{item.body}</span></button>) : <div className="notification-empty">No in-app notifications yet.</div>}</div>}</div>;
}

function DocumentUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const chooseFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      const presigned = await getJson<{ url: string; documentId: number | null }>("/api/documents/presign-upload", { method: "POST", body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", size: file.size, category: "driver_identity" }) });
      const upload = await fetch(presigned.url, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!upload.ok || !presigned.documentId) throw new Error("The private upload did not complete.");
      await getJson(`/api/documents/${presigned.documentId}/complete`, { method: "POST" });
      setMessage("Private document uploaded and indexed for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Private upload is unavailable.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return <div className="document-upload"><input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={chooseFile} /><button className="button button-quiet button-full" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? "Uploading securely…" : "Upload identity document"} <ArrowRight size={15} /></button>{message && <small className="upload-message">{message}</small>}</div>;
}

function AppShell({ account, activeView, onViewChange, onSignOut, children }: { account: DemoAccount; activeView: View; onViewChange: (view: View) => void; onSignOut: () => void; children: React.ReactNode }) {
  const [openMobile, setOpenMobile] = useState(false);
  const isOps = account.role === "Dispatcher" || account.role === "Admin";
  const allowed = account.role === "Driver" ? ["overview", "drivers", "account"] : account.role === "Rider" || account.role === "Caregiver" || account.role === "Caregiver / Clinic Intake" ? ["overview", "bookings", "account"] : ["overview", "bookings", "drivers", "operations", "account"];
  return <div className="app-shell"><aside className={`app-rail ${openMobile ? "open" : ""}`}><div className="rail-header"><a className="brand brand-compact" href="/" onClick={event => { event.preventDefault(); window.location.href = "/"; }}><Mark /><span><strong>AAA Home Rides</strong><small>RIDE CONSOLE</small></span></a><button className="rail-close" onClick={() => setOpenMobile(false)} aria-label="Close navigation"><X size={20} /></button></div><div className="rail-context"><span className="eyebrow">{isOps ? "OPERATIONS" : "MY RIDE PLAN"}</span><strong>{account.role === "Caregiver / Clinic Intake" ? "Harbor Clinic" : account.role}</strong><small>Secure backend session</small></div><nav className="rail-nav" aria-label="Console navigation">{navItems.map(item => <button key={item.id} className={activeView === item.id ? "active" : ""} onClick={() => { onViewChange(item.id); setOpenMobile(false); }} disabled={!allowed.includes(item.id)}><item.icon size={17} /><span>{item.label}</span>{item.id === "operations" && isOps && <span className="nav-badge">3</span>}</button>)}</nav><div className="rail-bottom"><div className="support-mini"><Bell size={16} /><span><strong>Rider support</strong><a href="tel:+15713007806">(571) 300-7806</a></span></div><button className="account-mini" onClick={() => onViewChange("account")}><Avatar initials={account.initials} tone={account.tone} /><span><strong>{account.name}</strong><small>{account.role}</small></span><ChevronDown size={15} /></button><button className="signout-link" onClick={onSignOut}><LogOut size={15} /> Sign out</button></div></aside><div className="app-main"><header className="app-topbar"><button className="mobile-menu" onClick={() => setOpenMobile(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="topbar-breadcrumb"><span>AAA Home Rides</span><ArrowRight size={13} /><strong>{activeView === "overview" ? "Overview" : navItems.find(item => item.id === activeView)?.label}</strong></div><div className="topbar-actions"><span className="demo-pill"><span className="live-dot" /> SECURE SESSION</span><NotificationBell /></div></header><div className="app-content">{children}</div></div></div>;
}

function BookingsPage({ account, bookings, setBookings }: { account: DemoAccount; bookings: Booking[]; setBookings: React.Dispatch<React.SetStateAction<Booking[]>> }) {
  const [showBooking, setShowBooking] = useState(false);
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [notice, setNotice] = useState("");
  const canCreate = ["Rider", "Caregiver", "Caregiver / Clinic Intake"].includes(account.role);
  const filtered = filter === "All" ? bookings : bookings.filter(item => item.status === filter);
  const create = async (input: Omit<Booking, "id" | "status">) => { try { await getJson("/api/bookings", { method: "POST", body: JSON.stringify(input) }); const result = await getJson<{ bookings: Booking[] }>("/api/bookings"); setBookings(result.bookings.map(fromServerBooking)); setShowBooking(false); setNotice("Booking request saved as Requested."); } catch (error) { setNotice(error instanceof Error ? error.message : "Booking could not be created."); } };
  const cancel = async (id: string) => { try { await getJson(`/api/bookings/${id}/cancel`, { method: "POST", body: JSON.stringify({ note: "Cancelled by authorized user" }) }); const result = await getJson<{ bookings: Booking[] }>("/api/bookings"); setBookings(result.bookings.map(fromServerBooking)); setNotice(`${id} cancelled and any assignment released.`); } catch (error) { setNotice(error instanceof Error ? error.message : "Cancellation failed."); } };
  return <div className="dashboard-page"><PageHeading eyebrow="BOOKINGS" title="Every request, clearly accounted for." subtitle="Create, monitor, cancel and inspect the persistent trip history visible to your role." action={canCreate ? <button className="button button-primary" onClick={() => setShowBooking(true)}><Plus size={16} /> New request</button> : undefined} />{notice && <div className="form-notice"><CircleHelp size={16} /> {notice}</div>}<div className="filter-tabs">{(["All", "Requested", "Assigned", "Driver en route", "Completed", "Cancelled"] as const).map(value => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value}</button>)}</div><section className="table-card card"><div className="booking-table">{filtered.length ? filtered.map(item => <div className="booking-row" key={item.id}><div className="booking-date"><strong>{item.date}</strong><small>{item.time}</small></div><div className="booking-route"><strong>{item.destination}</strong><small>{item.pickup} · {item.passenger}</small></div><div className="booking-kind">{item.type}{item.vehicle ? ` · ${item.vehicle.licensePlate}` : ""}</div><StatusPill status={item.status} />{!['Completed', 'Cancelled'].includes(item.status) && (account.role !== "Driver") && <button className="text-link" onClick={() => cancel(item.id)}>Cancel</button>}</div>) : <div className="empty-state">No bookings are visible for this account and filter.</div>}</div></section>{showBooking && <BookingModal onClose={() => setShowBooking(false)} onCreate={create} />}</div>;
}

function DriversVehiclesPage({ account, bookings }: { account: DemoAccount; bookings: Booking[] }) {
  const [vehicles, setVehicles] = useState<Array<{ id: number; ownerName?: string; make: string; model: string; color: string; licensePlate: string; licenseState: string; status: string; mobilityReady: string | boolean }>>([]);
  const [drivers, setDrivers] = useState<Array<{ id: number; name: string; onboardingStatus: string; licensePlate: string; vehicles?: Array<{ id: number; label: string; status: string }> }>>([]);
  useEffect(() => { getJson<{ vehicles: typeof vehicles }>("/api/vehicles").then(result => setVehicles(result.vehicles)).catch(() => setVehicles([])); getJson<{ drivers: typeof drivers }>("/api/drivers").then(result => setDrivers(result.drivers)).catch(() => setDrivers([])); }, []);
  return <div className="dashboard-page"><PageHeading eyebrow="DRIVERS & VEHICLES" title={account.role === "Driver" ? "Your road-ready profile." : "Know who and what is available."} subtitle="Approval, onboarding, vehicle records and assignment eligibility come from the protected backend." /><section className="two-column-section"><div className="card review-card"><div className="card-heading"><span className="eyebrow">DRIVER PROFILES</span><h2>{account.role === "Driver" ? "Your profile" : "Approved drivers"}</h2></div>{account.role === "Driver" ? <div className="role-row"><Avatar initials={account.initials} tone={account.tone} /><span><strong>{account.name}</strong><small>Only your own profile and assigned trips are visible.</small></span><span className="role-state">{bookings.length} trips</span></div> : drivers.map(driver => <div className="role-row" key={driver.id}><Avatar initials={driver.name.split(" ").map(part => part[0]).join("")} tone="teal" /><span><strong>{driver.name}</strong><small>{driver.onboardingStatus} · {driver.vehicles?.length ?? 0} vehicle(s)</small></span><span className="role-state">Eligible</span></div>)}</div><div className="card roles-card"><div className="card-heading"><span className="eyebrow">VEHICLE RECORDS</span><h2>Assignment-ready vehicles</h2></div>{vehicles.length ? vehicles.map(vehicle => <div className="role-row" key={vehicle.id}><CarFront size={18} /><span><strong>{vehicle.color} {vehicle.make} {vehicle.model}</strong><small>{vehicle.licenseState} · {vehicle.licensePlate} · {vehicle.ownerName ?? account.name}</small></span><span className="role-state">{vehicle.status}</span></div>) : <div className="empty-state">No vehicle records are available to this role.</div>}</div></section></div>;
}

function OperationsPage({ account, bookings, setBookings }: { account: DemoAccount; bookings: Booking[]; setBookings: React.Dispatch<React.SetStateAction<Booking[]>> }) {
  if (account.role !== "Dispatcher" && account.role !== "Admin") return <div className="dashboard-page"><PageHeading eyebrow="OPERATIONS" title="Access is limited." subtitle="Only dispatchers and administrators can monitor the operational queue." /><div className="empty-state">Your role cannot view organization-wide operations.</div></div>;
  return <DispatchDashboard bookings={bookings} setBookings={setBookings} />;
}

function AccountPage({ account }: { account: DemoAccount }) {
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone ?? "");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setNotice("");
    try { const result = await getJson<{ account: DemoAccount }>("/api/account", { method: "PATCH", body: JSON.stringify({ name, phone: phone || null }) }); setNotice(result.account ? "Profile details saved." : "Profile saved."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Profile could not be saved."); }
    finally { setSaving(false); }
  };
  return <div className="dashboard-page"><PageHeading eyebrow="ACCOUNT" title="Your account, clearly set up." subtitle="Update the contact details used for authorized trip coordination." />{notice && <div className="form-notice"><CircleHelp size={16} /> {notice}</div>}<section className="two-column-section"><form className="card review-card" onSubmit={save}><div className="card-heading"><span className="eyebrow">PROFILE</span><h2>Contact details</h2></div><label className="field-label">Full name<input value={name} onChange={event => setName(event.target.value)} required /></label><label className="field-label">Phone<input value={phone} onChange={event => setPhone(event.target.value)} placeholder="(571) 300-7806" /></label><div className="detail-line"><span>Email</span><strong>{account.email}</strong></div><div className="detail-line"><span>Role</span><strong>{account.role}</strong></div><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></form><div className="card roles-card"><div className="card-heading"><span className="eyebrow">SECURITY & NOTIFICATIONS</span><h2>Session controls</h2></div><div className="checklist-row"><span className="check-circle"><Check size={13} /></span><span>Persistent secure session</span><small>Active</small></div><div className="checklist-row"><span className="check-circle"><Check size={13} /></span><span>In-app notifications</span><small>Enabled</small></div><div className="checklist-row"><span className="check-circle check-circle-pending"><Clock3 size={13} /></span><span>Email/SMS delivery</span><small>Provider pending</small></div><p className="small-note">Password reset and external notification providers remain intentionally gated until their credentials are configured.</p></div></section></div>;
}

function RiderDashboard({ account, bookings, setBookings }: { account: DemoAccount; bookings: Booking[]; setBookings: React.Dispatch<React.SetStateAction<Booking[]>> }) {
  const [showBooking, setShowBooking] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const [bookingError, setBookingError] = useState("");
  const nextRide = bookings.find(booking => booking.status !== "Completed" && booking.status !== "Cancelled");
  const driver = nextRide?.driverDetails;
  const [location, setLocation] = useState<Booking["latestLocation"]>(nextRide?.latestLocation ?? null);
  useEffect(() => { if (!nextRide?.id) { setLocation(null); return; } getJson<{ location: Booking["latestLocation"] }>(`/api/bookings/${nextRide.id}/location`).then(result => setLocation(result.location)).catch(() => setLocation(null)); }, [nextRide?.id, nextRide?.status]);
  const visibleBookings = activeTab === "upcoming" ? bookings.filter(booking => booking.status !== "Completed") : bookings.filter(booking => booking.status === "Completed");
  const createBooking = async (input: Omit<Booking, "id" | "status">) => {
    try {
      await getJson("/api/bookings", { method: "POST", body: JSON.stringify(input) });
      const result = await getJson<{ bookings: Booking[] }>("/api/bookings");
      setBookings(result.bookings.map(fromServerBooking));
      setShowBooking(false);
      setBookingError("");
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "The booking could not be created.");
    }
  };
  return <div className="dashboard-page"><PageHeading eyebrow="MY RIDE PLAN" title={`Good morning, ${account.name.split(" ")[0]}.`} subtitle="Here is what is happening with your next ride." action={<button className="button button-primary" onClick={() => setShowBooking(true)}><Plus size={17} /> Book a ride</button>} /><section className="rider-grid"><div className="next-ride card"><div className="card-topline"><span className="eyebrow">01 / NEXT RIDE</span><StatusPill status={nextRide?.status ?? "Requested"} /></div><div className="ride-date"><strong>{nextRide?.date ?? "No upcoming ride"}</strong><span>{nextRide ? `${nextRide.time} · ${nextRide.type}` : "Create a request to begin"}</span></div><div className="ride-route"><div className="route-marker pickup"><MapPin size={15} /></div><div className="route-copy"><strong>{nextRide?.pickup ?? "Pickup to be confirmed"}</strong><span>Pickup location</span></div><div className="route-line" /><div className="route-marker destination"><HeartPulse size={15} /></div><div className="route-copy"><strong>{nextRide?.destination ?? "Destination to be confirmed"}</strong><span>Care destination</span></div></div><div className="ride-footer"><span><Clock3 size={15} /> Server-backed booking status</span><span className="status-note"><span className="live-dot" /> {nextRide?.driver ? "Driver assigned" : "Awaiting assignment"}</span></div></div><div className="driver-card card"><div className="card-topline"><span className="eyebrow">YOUR DRIVER</span><span className="verified-label"><ShieldCheck size={14} /> {driver ? "Assigned" : "Not assigned"}</span></div>{driver ? <><div className="driver-profile"><Avatar initials={driver.name.split(" ").map(part => part[0]).join("")} tone="teal" large /><div><h3>{driver.name}</h3><p>Assigned through the dispatch workflow</p></div></div><div className="vehicle-line"><CarFront size={17} /><span><strong>{driver.vehicleColor} {driver.vehicleMake} {driver.vehicleModel}</strong><small>{driver.licenseState} · {driver.licensePlate}</small></span></div>{driver.phone ? <a className="button button-dark button-full" href={`tel:${driver.phone}`}><Phone size={16} /> Call driver</a> : <div className="small-note">Driver contact is unavailable for this booking.</div>}<p className="small-note">Calls use your device's normal phone app.</p></> : <div className="empty-state">A driver will appear here after an authorized dispatcher assigns the trip.</div>}</div></section><section className="map-card card"><div className="map-card-copy"><span className="eyebrow">ACTIVE TRIP VIEW</span><h2>Know where the ride stands.</h2><p>Only a permitted active-trip location is shown. No ETA is estimated here.</p><div className="location-state"><span className={location?.stale ? "stale-dot" : "live-dot"} /><span><strong>{location ? (location.stale ? "Last location is stale" : "Location is available") : driver ? "No location has been shared" : "Waiting for an assigned driver"}</strong><small>{location ? `Last update ${new Date(location.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${location.source === "simulated" ? "demo coordinate" : "browser GPS"}` : driver ? "The driver must opt in during an eligible active trip." : "The map will activate after assignment."}</small></span></div></div><MiniMap /></section><section className="table-card card"><div className="table-heading"><div><span className="eyebrow">YOUR BOOKINGS</span><h2>Upcoming rides</h2></div><div className="segmented"><button className={activeTab === "upcoming" ? "active" : ""} onClick={() => setActiveTab("upcoming")}>Upcoming</button><button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>History</button></div></div><div className="booking-table">{visibleBookings.length ? visibleBookings.map(booking => <BookingRow key={booking.id} booking={booking} />) : <div className="empty-state">{bookingError || "No persisted bookings are available for this account."}</div>}</div></section>{showBooking && <BookingModal error={bookingError} onClose={() => setShowBooking(false)} onCreate={createBooking} />}</div>;
}

function DriverDashboard({ account, bookings, setBookings }: { account: DemoAccount; bookings: Booking[]; setBookings: React.Dispatch<React.SetStateAction<Booking[]>> }) {
  const [gps, setGps] = useState<"off" | "live" | "simulated">("off");
  const [onShift, setOnShift] = useState(false);
  const [onboarding, setOnboarding] = useState<{ profile?: { onboardingStatus: string; verificationStatus: string; verificationMessage: string; verificationProviderConfigured: boolean } } | null>(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const trip = bookings.find(booking => booking.status !== "Completed" && booking.status !== "Cancelled");
  const [tripStatus, setTripStatus] = useState<Status>(trip?.status ?? "Assigned");
  useEffect(() => { if (trip?.status) setTripStatus(trip.status); }, [trip?.id, trip?.status]);
  useEffect(() => { getJson<typeof onboarding>("/api/driver/onboarding").then(setOnboarding).catch(() => setOnboarding(null)); }, [account.id]);
  const submitVerification = async () => { try { const result = await getJson<{ message: string }>("/api/driver/verification/submit", { method: "POST", body: JSON.stringify({}) }); setVerificationMessage(result.message); const refreshed = await getJson<typeof onboarding>("/api/driver/onboarding"); setOnboarding(refreshed); } catch (error) { setVerificationMessage(error instanceof Error ? error.message : "Verification submission failed."); } };
  const sendLocation = (latitude: number, longitude: number, source: "browser" | "simulated") => {
    if (trip?.dbId) getJson("/api/tracking/location", { method: "POST", body: JSON.stringify({ bookingId: trip.dbId, latitude, longitude, source }) }).catch(() => undefined);
    setGps(source === "browser" ? "live" : "simulated");
  };
  const startGps = () => { if (!trip?.dbId || !navigator.geolocation) { sendLocation(38.8048, -77.0469, "simulated"); return; } navigator.geolocation.getCurrentPosition(position => sendLocation(position.coords.latitude, position.coords.longitude, "browser"), () => sendLocation(38.8048, -77.0469, "simulated"), { enableHighAccuracy: true, timeout: 5000 }); };
  const nextTripStatus = async () => {
    if (!trip) return;
    const next = tripStatus === "Assigned" ? "driver_en_route" : tripStatus === "Driver en route" ? "driver_arrived" : tripStatus === "Driver arrived" ? "passenger_picked_up" : tripStatus === "Passenger picked up" ? "in_progress" : "completed";
    await getJson(`/api/bookings/${trip.id}/status`, { method: "POST", body: JSON.stringify({ status: next }) });
    const result = await getJson<{ bookings: Booking[] }>("/api/bookings");
    setBookings(result.bookings.map(fromServerBooking));
  };
  return <div className="dashboard-page"><PageHeading eyebrow="DRIVER CONSOLE" title={`Ready for the road, ${account.name.split(" ")[0]}.`} subtitle="Your trip details, onboarding and location controls live here." action={<button className={`button ${onShift ? "button-dark" : "button-primary"}`} onClick={() => setOnShift(value => !value)}>{onShift ? <><span className="live-dot" /> On shift</> : <>Start shift <ArrowRight size={16} /></>}</button>} /><div className="driver-kpis"><Metric label="Assigned trips" value={String(bookings.length).padStart(2, "0")} detail={trip ? "1 active now" : "No active assignment"} icon={<Route />} /><Metric label="Identity review" value={onboarding?.profile?.verificationStatus === "verified" ? "Verified" : "Pending"} detail={onboarding?.profile?.verificationMessage ?? "Loading verification status"} icon={<ShieldCheck />} /><Metric label="Documents" value="R2 gated" detail="Upload only when configured" icon={<FileCheck2 />} /><Metric label="Vehicle" value={trip?.driverDetails?.licensePlate ?? "On file"} detail={trip?.driverDetails ? `${trip.driverDetails.vehicleMake} ${trip.driverDetails.vehicleModel}` : "No vehicle attached"} icon={<CarFront />} /></div><section className="driver-main-grid"><div className="card assigned-trip"><div className="card-topline"><span className="eyebrow">ASSIGNED TRIP · {trip?.id ?? "NONE"}</span><StatusPill status={tripStatus} /></div><h2>{trip?.passenger ?? "No assigned passenger"}</h2><p className="trip-type"><Stethoscope size={15} /> {trip?.type ?? "An authorized dispatcher assignment will appear here."}</p><div className="driver-route"><div><span className="route-index">01</span><strong>{trip?.pickup ?? "Pickup pending"}</strong><small>{trip?.date ?? "No date"} · {trip?.time ?? "No time"}</small></div><ArrowRight size={18} /><div><span className="route-index">02</span><strong>{trip?.destination ?? "Destination pending"}</strong><small>Destination</small></div></div><div className="passenger-note"><Users size={16} /><span><strong>Passenger details</strong><small>Details are available only for the assigned trip returned by the backend.</small></span></div><div className="trip-actions"><button className="button button-primary" onClick={nextTripStatus} disabled={!trip}>{tripStatus === "Assigned" ? "Acknowledge trip" : tripStatus === "Driver en route" ? "Mark arrived" : tripStatus === "Driver arrived" ? "Mark picked up" : tripStatus === "Passenger picked up" ? "Start trip" : "Complete trip"} <ArrowRight size={15} /></button><button className="button button-quiet" onClick={startGps} disabled={!trip}><LocateFixed size={16} /> Share location</button></div></div><div className="card gps-card"><div className="card-topline"><span className="eyebrow">LOCATION SHARING</span><span className="status-chip">ACTIVE TRIP ONLY</span></div><div className="gps-ring"><LocateFixed size={28} /></div><h3>{gps === "off" ? "Location sharing is off" : gps === "live" ? "Live location enabled" : "Demo location enabled"}</h3><p>{gps === "off" ? "Start it only when you are participating in the assigned trip." : gps === "live" ? "Your browser granted location permission. Updates are sent while this trip remains eligible." : "A clearly labeled simulated coordinate was sent because live GPS was unavailable or declined."}</p><button className="button button-dark button-full" onClick={startGps} disabled={!trip}>{gps === "off" ? "Start GPS sharing" : "Refresh location permission"}</button><div className="gps-restriction"><ShieldCheck size={15} /><span>Off-duty tracking is not enabled.</span></div></div></section><section className="two-column-section"><div className="card checklist-card"><div className="card-heading"><span className="eyebrow">ONBOARDING</span><h2>Driver readiness</h2></div><ChecklistRow label="Personal details" /><ChecklistRow label="Driver photograph" /><ChecklistRow label="Licence information" /><ChecklistRow label="Vehicle information" /><ChecklistRow label="Identity verification" complete={onboarding?.profile?.verificationStatus === "verified"} /><ChecklistRow label="Required documents" /><button className="button button-primary button-full" onClick={submitVerification}>Submit identity verification <ArrowRight size={15} /></button>{verificationMessage && <p className="small-note">{verificationMessage}</p>}</div><div className="card document-card"><div className="card-heading"><span className="eyebrow">DOCUMENTS</span><h2>Keep the folder current.</h2></div><p>Identity and vehicle documents are reviewed by authorized staff. Uploads become trusted operational information only after review.</p><div className="document-status"><FileCheck2 size={19} /><span><strong>Document records are backend-backed</strong><small>Private upload requires configured Cloudflare R2 credentials.</small></span></div><DocumentUpload /></div></section></div>;
}

function DispatchDashboard({ bookings, setBookings }: { bookings: Booking[]; setBookings: React.Dispatch<React.SetStateAction<Booking[]>> }) {
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(bookings[0] ?? null);
  const [drivers, setDrivers] = useState<Array<{ id: number; name: string; vehicles?: Array<{ id: number; label: string; status: string }> }>>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [eventHistory, setEventHistory] = useState<Array<{ actor: string; status: string; note: string | null }>>([]);
  const [dispatchNotice, setDispatchNotice] = useState("");
  useEffect(() => { getJson<{ drivers: Array<{ id: number; name: string; vehicles?: Array<{ id: number; label: string; status: string }> }> }>("/api/drivers").then(result => { setDrivers(result.drivers); if (result.drivers[0]) setSelectedDriverId(String(result.drivers[0].id)); }).catch(() => setDrivers([])); }, []);
  useEffect(() => { setSelectedBooking(current => bookings.find(booking => booking.id === current?.id) ?? bookings[0] ?? null); }, [bookings]);
  const filtered = filter === "All" ? bookings : bookings.filter(booking => booking.status === filter);
  const assign = async (id: string) => {
    const driver = drivers.find(item => String(item.id) === selectedDriverId) ?? drivers[0];
    if (!driver) return;
    const reason = selectedBooking?.id === id && selectedBooking.status !== "Requested" ? window.prompt("Reason for reassignment", "Operational reassignment") : undefined;
    if (selectedBooking?.id === id && selectedBooking.status !== "Requested" && !reason) return;
    await getJson(`/api/bookings/${id}/assign`, { method: "POST", body: JSON.stringify({ driverAccountId: driver.id, vehicleId: selectedVehicleId ? Number(selectedVehicleId) : undefined, reason }) });
    const result = await getJson<{ bookings: Booking[] }>("/api/bookings");
    setBookings(result.bookings.map(fromServerBooking));
  };
  const loadEvents = async () => { if (!selectedBooking) return; try { const result = await getJson<{ events: Array<{ actor: string; status: string; note: string | null }> }>(`/api/bookings/${selectedBooking.id}/events`); setEventHistory(result.events); setDispatchNotice(""); } catch (error) { setDispatchNotice(error instanceof Error ? error.message : "Event history is unavailable."); } };
  return <div className="dashboard-page"><PageHeading eyebrow="DISPATCH DESK" title="A calm view of the road ahead." subtitle="Coordinate bookings, drivers and trip exceptions from one operational surface." action={<button className="button button-dark" onClick={() => setFilter("Exception") }><Bell size={16} /> Review alerts <span className="button-count">3</span></button>} />{dispatchNotice && <div className="form-notice"><CircleHelp size={16} /> {dispatchNotice}</div>}<div className="dispatch-kpis"><Metric label="Today's bookings" value={String(bookings.length)} detail="Persisted booking queue" icon={<CalendarDays />} /><Metric label="Active trips" value={String(bookings.filter(booking => ["Assigned", "Driver en route", "Driver arrived", "Passenger picked up", "In progress"].includes(booking.status)).length).padStart(2, "0")} detail="Location is opt-in" icon={<Navigation />} /><Metric label="Approved drivers" value={String(drivers.length).padStart(2, "0")} detail="Server-approved profiles" icon={<CarFront />} /><Metric label="Open exceptions" value={String(bookings.filter(booking => booking.status === "Exception").length).padStart(2, "0")} detail="Review before assignment" icon={<CircleHelp />} /></div><section className="dispatch-layout"><div className="card dispatch-list"><div className="table-heading"><div><span className="eyebrow">BOOKING QUEUE</span><h2>Today's transportation</h2></div><select value={filter} onChange={event => setFilter(event.target.value as "All" | Status)}><option>All</option><option>Requested</option><option>Assigned</option><option>Driver en route</option><option>Completed</option><option>Exception</option></select></div><div className="filter-tabs">{(["All", "Requested", "Assigned", "Driver en route"] as const).map(value => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value}</button>)}</div><div className="dispatch-bookings">{filtered.length ? filtered.map(booking => <button key={booking.id} className={`dispatch-row ${selectedBooking?.id === booking.id ? "selected" : ""}`} onClick={() => { setSelectedBooking(booking); setEventHistory([]); }}><span className="dispatch-time"><strong>{booking.time}</strong><small>{booking.id}</small></span><span className="dispatch-passenger"><strong>{booking.passenger}</strong><small>{booking.type} · {booking.pickup}</small></span><StatusPill status={booking.status} /><ArrowRight size={16} /></button>) : <div className="empty-state">No bookings match this filter.</div>}</div></div><div className="dispatch-side"><div className="card dispatch-detail">{selectedBooking ? <><div className="card-topline"><span className="eyebrow">BOOKING DETAIL · {selectedBooking.id}</span><StatusPill status={selectedBooking.status} /></div><h2>{selectedBooking.passenger}</h2><div className="detail-route"><div><MapPin size={16} /><span><small>Pickup</small><strong>{selectedBooking.pickup}</strong></span></div><div><HeartPulse size={16} /><span><small>Destination</small><strong>{selectedBooking.destination}</strong></span></div></div><div className="detail-line"><span>Assigned driver</span><strong>{selectedBooking.driver ?? "Unassigned"}</strong></div><div className="detail-line"><span>Vehicle requirement</span><strong>Standard / mobility-ready</strong></div>{["Requested", "Assigned", "Driver en route", "Driver arrived", "Passenger picked up", "In progress"].includes(selectedBooking.status) && <><select value={selectedDriverId} onChange={event => { setSelectedDriverId(event.target.value); setSelectedVehicleId(""); }}><option value="">Select approved driver</option>{drivers.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select>{drivers.find(driver => String(driver.id) === selectedDriverId)?.vehicles?.length ? <select value={selectedVehicleId} onChange={event => setSelectedVehicleId(event.target.value)}><option value="">Select vehicle</option>{drivers.find(driver => String(driver.id) === selectedDriverId)?.vehicles?.filter(vehicle => vehicle.status === "active").map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>)}</select> : null}<button className="button button-primary button-full" onClick={() => assign(selectedBooking.id)}>{selectedBooking.status === "Requested" ? "Confirm assignment" : "Reassign trip"} <ArrowRight size={15} /></button></>}<button className="button button-quiet button-full" onClick={loadEvents}>Open event history <ArrowRight size={15} /></button>{eventHistory.length > 0 && <div className="event-history">{eventHistory.map((event, index) => <div className="event-row" key={`${event.actor}-${index}`}><strong>{event.status}</strong><span>{event.actor} · {event.note ?? "Status update"}</span></div>)}</div>}</> : <div className="empty-state">Select a booking to inspect its details.</div>}</div><div className="card active-map-card"><div className="card-topline"><span className="eyebrow">ACTIVE TRIP MAP</span><span className="status-chip">OPT-IN LOCATIONS</span></div><MiniMap compact /><div className="map-legend"><span><i className="legend-dot driver-dot" /> Driver</span><span><i className="legend-dot pickup-dot" /> Pickup</span><span><i className="legend-dot stale-dot" /> Stale</span></div></div></div></section></div>;
}

function AdminDashboard() {
  const [notice, setNotice] = useState("");
  const action = (label: string) => setNotice(`${label} is available from the protected administrator API once an admin session and required provider credentials are configured.`);
  return <div className="dashboard-page"><PageHeading eyebrow="ADMINISTRATION" title="Keep the operation ready." subtitle="Review people, permissions and operational signals without losing the human details." action={<button className="button button-primary" onClick={() => action("Staff invitations")}><Plus size={16} /> Invite staff</button>} />{notice && <div className="form-notice"><CircleHelp size={16} /> {notice}</div>}<div className="admin-grid"><Metric label="Active users" value="18" detail="6 demo accounts" icon={<Users />} /><Metric label="Driver approvals" value="02" detail="Awaiting review" icon={<ShieldCheck />} /><Metric label="Documents" value="14" detail="2 need attention" icon={<FileCheck2 />} /><Metric label="Audit events" value="128" detail="Last 24 hours" icon={<Activity />} /></div><section className="admin-columns"><div className="card review-card"><div className="card-heading"><span className="eyebrow">REVIEW QUEUE</span><h2>What needs an eye today</h2></div><ReviewItem icon={<CarFront />} title="Priya Raman · driver application" detail="Submitted Nov 1 · 4 documents" action="Review" onAction={action} /><ReviewItem icon={<FileCheck2 />} title="Andre Washington · licence renewal" detail="Due in 12 days · no action yet" action="Open" onAction={action} /><ReviewItem icon={<Bell />} title="2 booking exceptions" detail="Dispatch desk · last updated 11:42 AM" action="View" onAction={action} /></div><div className="card roles-card"><div className="card-heading"><span className="eyebrow">ROLE COVERAGE</span><h2>People with access</h2></div>{accounts.slice(0, 5).map(account => <div className="role-row" key={account.email}><Avatar initials={account.initials} tone={account.tone} /><span><strong>{account.name}</strong><small>{account.role}</small></span><span className="role-state">Active</span></div>)}</div></section><section className="card audit-card"><div className="table-heading"><div><span className="eyebrow">AUDIT TRAIL</span><h2>Recent operational events</h2></div><button className="text-link" onClick={() => action("Full audit history")}>View all <ArrowRight size={15} /></button></div><div className="audit-list"><AuditRow time="11:42 AM" actor="Denise Carter" action="assigned booking AR-1056 to Priya Raman" /><AuditRow time="10:18 AM" actor="Andre Washington" action="acknowledged trip AR-1048" /><AuditRow time="Yesterday" actor="Alina Petrova" action="created a clinic intake booking" /></div></section></div>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="page-heading-action">{action}</div>}</div>;
}

function Feature({ number, title, copy, icon }: { number: string; title: string; copy: string; icon: React.ReactNode }) { return <article className="feature-item"><span className="feature-number">{number}</span><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{copy}</p><ArrowRight size={17} /></article>; }
function Mark({ light = false }: { light?: boolean }) { return <img className={`brand-mark ${light ? "brand-mark-light" : ""}`} src="/brand/aaahomeride-mark.png" alt="AAA Home Rides" />; }
function Avatar({ initials, tone, large = false }: { initials: string; tone: string; large?: boolean }) { return <span className={`avatar avatar-${tone} ${large ? "avatar-large" : ""}`}>{initials}</span>; }
function StatusPill({ status }: { status: string }) { const key = status.toLowerCase().replaceAll(" ", "-"); return <span className={`status-pill status-${key}`}><span />{status}</span>; }
function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) { return <div className="metric-card card"><div className="metric-icon">{icon}</div><div><span className="eyebrow">{label}</span><strong>{value}</strong><small>{detail}</small></div></div>; }
function BookingRow({ booking }: { booking: Booking }) { return <div className="booking-row"><div className="booking-date"><strong>{booking.date}</strong><small>{booking.time}</small></div><div className="booking-route"><strong>{booking.destination}</strong><small>{booking.pickup}</small></div><div className="booking-kind">{booking.type}</div><StatusPill status={booking.status} /><ArrowRight size={16} /></div>; }
function MiniMap({ compact = false }: { compact?: boolean }) { return <div className={`mini-map ${compact ? "mini-map-compact" : ""}`}><div className="map-grid" /><div className="map-water" /><div className="map-route map-route-a" /><div className="map-route map-route-b" /><span className="map-marker map-marker-driver"><CarFront size={13} /></span><span className="map-marker map-marker-pickup"><MapPin size={13} /></span><span className="map-marker map-marker-care"><HeartPulse size={13} /></span><div className="map-label label-driver">Andre · last update 2 min</div><div className="map-label label-care">Alexandria Dialysis Center</div></div>; }
function ChecklistRow({ label, complete = true }: { label: string; complete?: boolean }) { return <div className="checklist-row"><span className={`check-circle ${complete ? "" : "check-circle-pending"}`}>{complete ? <Check size={13} /> : <Clock3 size={13} />}</span><span>{label}</span><small>{complete ? "Complete" : "Pending"}</small></div>; }
function ReviewItem({ icon, title, detail, action, onAction }: { icon: React.ReactNode; title: string; detail: string; action: string; onAction: (label: string) => void }) { return <div className="review-item"><span className="review-icon">{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><button className="text-link" onClick={() => onAction(`${action}: ${title}`)}>{action} <ArrowRight size={14} /></button></div>; }
function AuditRow({ time, actor, action }: { time: string; actor: string; action: string }) { return <div className="audit-row"><span>{time}</span><strong>{actor}</strong><p>{action}</p><Check size={16} /></div>; }

function BookingModal({ error, onClose, onCreate }: { error?: string; onClose: () => void; onCreate: (booking: Omit<Booking, "id" | "status">) => Promise<void> }) {
  const [form, setForm] = useState({ passenger: "Maria Lopez", pickup: "", destination: "", date: "", time: "", type: "Doctor appointment" });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); await onCreate({ passenger: form.passenger, pickup: form.pickup || "Pickup to be confirmed", destination: form.destination || "Destination to be confirmed", date: form.date || "Requested", time: form.time || "Time to be confirmed", type: form.type }); };
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card"><div className="modal-heading"><div><span className="eyebrow">NEW REQUEST</span><h2>Plan a ride</h2><p>Start with the details you know. The scheduling team can confirm availability.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>{error && <div className="form-notice"><CircleHelp size={16} /> {error}</div>}<form className="booking-form" onSubmit={submit}><label>Passenger<select value={form.passenger} onChange={event => update("passenger", event.target.value)}><option>Maria Lopez</option><option>James Lopez</option></select></label><div className="form-grid"><label>Pickup address<input value={form.pickup} onChange={event => update("pickup", event.target.value)} placeholder="Street, city, state" /></label><label>Destination<input value={form.destination} onChange={event => update("destination", event.target.value)} placeholder="Clinic or appointment" /></label></div><div className="form-grid"><label>Date<input value={form.date} onChange={event => update("date", event.target.value)} type="date" /></label><label>Pickup time<input value={form.time} onChange={event => update("time", event.target.value)} type="time" /></label></div><label>Ride type<select value={form.type} onChange={event => update("type", event.target.value)}><option>Doctor appointment</option><option>Therapy</option><option>Dialysis</option><option>Other non-emergency care</option></select></label><div className="modal-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">Submit request <ArrowRight size={15} /></button></div></form></div></div>;
}

export default App;
