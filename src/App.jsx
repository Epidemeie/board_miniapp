import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.DEV ? "http://localhost:3000/api" : "https://api.goservices.lol/api";

const DISTRICTS = ["Ваке", "Сабуртало", "Мтацминда", "Дидубе", "Глдани", "Исани", "Самгори", "Чугурети", "Крцаниси", "Надзаладеви"];
const URGENCY_OPTIONS = ["Срочно, сегодня", "Завтра", "На этой неделе", "Не срочно"];
const LANGUAGE_OPTIONS = ["Русский", "Английский", "Грузинский"];
const APP_LANGUAGES = ["Русский", "Английский"];

const FACTOR_LABELS = {
  service: "Совпадение по услуге",
  distance: "Расстояние",
  price: "Цена",
  rating: "Рейтинг",
  reviews: "Отзывы",
  speed: "Скорость ответа",
};
const FACTOR_WEIGHTS = { service: 30, distance: 20, price: 15, rating: 15, reviews: 10, speed: 10 };

/* ---------------------------------------------------------------
   Мок-данные личного кабинета мастера — визуализация UI до того,
   как соответствующие агрегаты появятся на backend (доход, конверсия,
   сообщения, финансы, аналитика). Реальные данные (рейтинг, услуги,
   районы, verified) подтягиваются из уже существующего Provider.
--------------------------------------------------------------- */

const MOCK_REQUESTS = {
  new: [
    { id: 501, service: "Сантехника", area: "Сабуртало", urgency: "Срочно, сегодня", description: "Течёт кран на кухне, нужно заменить смеситель.", budget: 80 },
    { id: 502, service: "Бойлеры", area: "Ваке", urgency: "На этой неделе", description: "Не греет воду, возможно сломался ТЭН.", budget: 120 },
    { id: 503, service: "Засоры", area: "Ортачала", urgency: "Завтра", description: "Засорилась раковина в ванной.", budget: 50 },
    { id: 504, service: "Смесители", area: "Сабуртало", urgency: "Не срочно", description: "Установить новый смеситель в ванной.", budget: 60 },
  ],
  inWork: [
    { id: 495, service: "Сантехника", area: "Ваке", description: "Замена труб в санузле.", price: 150 },
    { id: 490, service: "Бойлеры", area: "Ортачала", description: "Установка нового бойлера 80л.", price: 220 },
  ],
  completed: [
    { id: 470, service: "Сантехника", area: "Ваке", price: 100, date: "24 июля" },
    { id: 465, service: "Смесители", area: "Сабуртало", price: 70, date: "18 июля" },
  ],
  declined: [
    { id: 460, service: "Электрика", area: "Диди Дигоми", reason: "Отклонено мастером" },
  ],
};

const MOCK_ORDERS = {
  confirmed: [
    { id: 495, service: "Сантехника", description: "Замена труб в санузле, нужно заменить 3 метра трубы и один тройник.", price: 150, address: "ул. Тамарашвили 12, кв. 34", client: { name: "Георгий К.", photo: null, contact: "@giorgi_k" }, hasUnread: true },
    { id: 490, service: "Бойлеры", description: "Установка нового бойлера 80л взамен старого.", price: 220, address: "пр. Чавчавадзе 45", client: { name: "Нина Т.", photo: null, contact: "+995 555 12 34 56" }, hasUnread: false },
  ],
  completed: [
    { id: 470, service: "Сантехника", description: "Замена смесителя на кухне.", price: 100, address: "ул. Пекини 8", client: { name: "Анна В.", photo: null, contact: "@anna_v" } },
  ],
  cancelled: [
    { id: 455, service: "Электрика", description: "Клиент отменил заказ до начала работ.", price: 0, address: "ул. Марджанишвили 5", client: { name: "Давид Л.", photo: null, contact: "@david_l" } },
  ],
};

const MOCK_MESSAGES = {
  495: [
    { from: "client", text: "Добрый день! Когда сможете подъехать?", time: "10:12" },
    { from: "me", text: "Добрый день! Буду завтра к 15:00, устроит?", time: "10:20" },
    { from: "client", text: "Да, отлично, жду", time: "10:21" },
  ],
  490: [{ from: "client", text: "Здравствуйте, бойлер уже привезли?", time: "09:03" }],
};

const MOCK_REVIEWS = {
  distribution: [
    { stars: 5, count: 110 },
    { stars: 4, count: 12 },
    { stars: 3, count: 4 },
    { stars: 2, count: 1 },
    { stars: 1, count: 1 },
  ],
  list: [
    { name: "Мария Г.", text: "Очень быстро и качественно", rating: 5, date: "28 июля" },
    { name: "Тамаз Б.", text: "Всё сделал аккуратно, рекомендую", rating: 5, date: "22 июля" },
    { name: "Елена С.", text: "Хорошая работа, но немного опоздал", rating: 4, date: "15 июля" },
    { name: "Ирина Д.", text: "Отличный мастер!", rating: 5, date: "10 июля" },
    { name: "Гоча М.", text: "Всё понравилось", rating: 5, date: "2 июля" },
  ],
};

const MOCK_FINANCE = {
  balance: 2450,
  history: [
    { date: "28 июля", requestId: 495, amount: 150 },
    { date: "24 июля", requestId: 470, amount: 100 },
    { date: "18 июля", requestId: 465, amount: 70 },
  ],
};

const TAB_BAR_SCREENS = new Set(["provider-dashboard", "provider-requests", "provider-orders", "provider-profile-cabinet", "provider-more"]);

/* ---------------------------------------------------------------
   Telegram: кто открыл Mini App
--------------------------------------------------------------- */

function getTelegramUser() {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
  tg?.ready?.();
  tg?.expand?.();
  const u = tg?.initDataUnsafe?.user;
  if (u) {
    return {
      id: String(u.id),
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Пользователь",
      username: u.username,
      photoUrl: u.photo_url || null,
    };
  }
  // Фоллбэк для тестирования вне Telegram (обычный браузер)
  let demoId = sessionStorage.getItem("demo_telegram_id");
  if (!demoId) {
    demoId = "demo-" + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("demo_telegram_id", demoId);
  }
  return { id: demoId, name: "Гость", username: undefined, photoUrl: null };
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ошибка ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function groupServicesByCategory(list) {
  const groups = [];
  const byCat = {};
  for (const s of list) {
    const catId = s.category?.id ?? 0;
    if (!byCat[catId]) {
      byCat[catId] = { id: catId, name: s.category?.name || "Другое", icon: s.category?.icon || "", items: [] };
      groups.push(byCat[catId]);
    }
    byCat[catId].items.push(s);
  }
  return groups;
}

/* ---------------------------------------------------------------
   Мелкие компоненты
--------------------------------------------------------------- */

function Chip({ label, active, onClick }) {
  return (
    <button type="button" className={`tms-chip ${active ? "is-active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function MatchRing({ score, size = 44, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="tms-matchring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="51%" textAnchor="middle" dominantBaseline="middle" className="tms-matchring-text">{score}</text>
    </svg>
  );
}

function Header({ title, onBack, onClose }) {
  return (
    <div className="tms-header">
      {onBack ? <button className="tms-header-btn" onClick={onBack} aria-label="Назад">←</button> : <span className="tms-header-spacer" />}
      <span className="tms-header-title">{title}</span>
      <button className="tms-header-btn" onClick={onClose} aria-label="Начать заново">✕</button>
    </div>
  );
}

function BottomBar({ label, onClick, disabled, hint }) {
  if (!label) return null;
  return (
    <div className="tms-bottombar">
      {hint && <p className="tms-bottombar-hint">{hint}</p>}
      <button className="tms-mainbutton" onClick={onClick} disabled={disabled}>{label}</button>
    </div>
  );
}

function ProviderTabBar({ active, onNavigate }) {
  const items = [
    { key: "provider-dashboard", icon: "🏠", label: "Главная" },
    { key: "provider-requests", icon: "📋", label: "Заявки" },
    { key: "provider-orders", icon: "📦", label: "Заказы" },
    { key: "provider-profile-cabinet", icon: "👤", label: "Профиль" },
    { key: "provider-more", icon: "⋯", label: "Ещё" },
  ];
  return (
    <div className="tms-tabbar">
      {items.map((it) => (
        <button key={it.key} className={`tms-tabbar-item ${active === it.key ? "is-active" : ""}`} onClick={() => onNavigate(it.key)}>
          <span className="tms-tabbar-icon">{it.icon}</span>
          <span className="tms-tabbar-label">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, onClick, tone }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`tms-stat-card ${onClick ? "is-clickable" : ""} ${tone ? `tms-stat-${tone}` : ""}`} onClick={onClick}>
      <span className="tms-stat-icon">{icon}</span>
      <span className="tms-stat-body">
        <span className="tms-stat-value">{value}</span>
        <span className="tms-stat-label">{label}</span>
      </span>
      {onClick && <span className="tms-chevron">→</span>}
    </Tag>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="tms-segmented">
      {options.map((o) => (
        <button key={o.value} className={`tms-segmented-item ${value === o.value ? "is-active" : ""}`} onClick={() => onChange(o.value)}>
          {o.label}
          {typeof o.count === "number" && <span className="tms-segmented-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, sub }) {
  return (
    <div className="tms-toggle-row">
      <span className="tms-toggle-text">
        <span>{label}</span>
        {sub && <span className="tms-toggle-sub">{sub}</span>}
      </span>
      <button type="button" className={`tms-toggle ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)} aria-label={label}>
        <span className="tms-toggle-knob" />
      </button>
    </div>
  );
}

function ReviewRow({ review }) {
  return (
    <div className="tms-review-row">
      <div className="tms-review-top">
        <span className="tms-provider-name">{review.name}</span>
        <span className="tms-review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
      </div>
      <p className="tms-review-text">«{review.text}»</p>
      <span className="tms-provider-meta">{review.date}</span>
    </div>
  );
}

function ChatThread({ messages }) {
  return (
    <div className="tms-chat-thread">
      {messages.map((m, i) => (
        <div key={i} className={`tms-chat-bubble ${m.from === "me" ? "is-me" : "is-client"}`}>
          <p className="tms-chat-text">{m.text}</p>
          <span className="tms-chat-time">{m.time}</span>
        </div>
      ))}
      {messages.length === 0 && <p className="muted">Сообщений пока нет.</p>}
    </div>
  );
}

function ChatInputBar({ value, onChange, onSend }) {
  return (
    <div className="tms-chatbar">
      <input className="tms-chatbar-input" placeholder="Написать сообщение…" value={value}
        onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSend(); }} />
      <button className="tms-chatbar-send" onClick={onSend} disabled={!value.trim()} aria-label="Отправить">➤</button>
    </div>
  );
}

/* ---------------------------------------------------------------
   Основной компонент
--------------------------------------------------------------- */

export default function TbilisiMiniApp() {
  const tgUser = useMemo(getTelegramUser, []);

  const [history, setHistory] = useState([]);
  const [screen, setScreen] = useState("role");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---- Клиент ----
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ categoryId: null, categoryName: null, serviceId: null, serviceName: null, description: "", district: null, urgency: null, budget: 100 });
  const [candidates, setCandidates] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedOffers, setSelectedOffers] = useState([]);
  const [expandedCandidate, setExpandedCandidate] = useState(null);

  // ---- Мастер: регистрация / реальные данные ----
  const [provider, setProvider] = useState(null);
  const [allServices, setAllServices] = useState([]);
  const [providerForm, setProviderForm] = useState({ description: "", priceFrom: "", serviceIds: [], areas: [] });

  // ---- Мастер: личный кабинет (визуализация, часть данных — мок) ----
  const [requestsTab, setRequestsTab] = useState("new");
  const [ordersTab, setOrdersTab] = useState("confirmed");
  const [requestsState, setRequestsState] = useState(MOCK_REQUESTS);
  const [ordersState, setOrdersState] = useState(MOCK_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [chatMessages, setChatMessages] = useState(MOCK_MESSAGES);
  const [chatDraft, setChatDraft] = useState("");
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [profileExtra, setProfileExtra] = useState({
    languages: ["Русский"],
    phone: "",
    telegramContact: tgUser.username ? `@${tgUser.username}` : "",
    email: "",
    contactsHidden: false,
    calloutPrice: "",
    minOrderPrice: "",
    hourlyRate: "",
  });
  const [settingsForm, setSettingsForm] = useState({
    name: tgUser.name,
    phone: "",
    email: "",
    notifyRequests: true,
    notifyReviews: true,
    notifyOrders: true,
    notifyChat: true,
    appLanguage: "Русский",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportDraft, setSupportDraft] = useState("");

  function navigate(next) {
    setError(null);
    setHistory((h) => [...h, screen]);
    setScreen(next);
  }
  function goBack() {
    setError(null);
    setHistory((h) => {
      const copy = [...h];
      const prev = copy.pop();
      if (prev) setScreen(prev);
      return copy;
    });
  }
  function goHome() {
    setHistory([]);
    setError(null);
    setScreen("role");
  }
  function goTab(next) {
    setError(null);
    setHistory([]);
    setScreen(next);
  }

  async function withLoading(fn) {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  // ---- Роль: клиент ----

  async function chooseClient() {
    navigate("client-home");
    await withLoading(async () => setCategories(await api("/categories")));
  }

  async function pickCategory(cat) {
    setForm((f) => ({ ...f, categoryId: cat.id, categoryName: cat.name, serviceId: null }));
    navigate("client-services");
    await withLoading(async () => setServices(await api(`/services?categoryId=${cat.id}`)));
  }

  function pickService(s) {
    setForm((f) => ({ ...f, serviceId: s.id, serviceName: s.name }));
    navigate("client-request");
  }

  async function submitRequest() {
    await withLoading(async () => {
      const created = await api("/requests", {
        method: "POST",
        body: JSON.stringify({
          telegramId: tgUser.id,
          name: tgUser.name,
          username: tgUser.username,
          serviceId: form.serviceId,
          description: form.description,
          budget: form.budget,
          urgency: form.urgency,
          area: form.district,
        }),
      });
      const matched = await api(`/requests/${created.id}/candidates`);
      setCandidates(matched);
      navigate("client-matches");
    });
  }

  async function openMyRequests() {
    navigate("client-my");
    await withLoading(async () => setMyRequests(await api(`/requests/mine?telegramId=${tgUser.id}`)));
  }

  async function openRequestOffers(request) {
    setSelectedRequest(request);
    navigate("client-offers");
    await withLoading(async () => setSelectedOffers(await api(`/offers/request/${request.id}`)));
  }

  async function respondToOffer(offerId, status) {
    await withLoading(async () => {
      await api(`/offers/${offerId}/respond`, { method: "PUT", body: JSON.stringify({ status }) });
      setSelectedOffers(await api(`/offers/request/${selectedRequest.id}`));
    });
  }

  // ---- Роль: мастер ----

  async function ensureAllServices() {
    if (allServices.length === 0) {
      const all = await api("/services");
      setAllServices(all);
    }
  }

  async function chooseProvider() {
    await withLoading(async () => {
      const existing = await api(`/providers/by-telegram/${tgUser.id}`);
      if (existing) {
        setProvider(existing);
        setProviderForm({
          description: existing.description || "",
          priceFrom: existing.priceFrom ?? "",
          serviceIds: (existing.services || []).map((s) => s.serviceId ?? s.service?.id).filter(Boolean),
          areas: (existing.areas || []).map((a) => a.area ?? a),
        });
        await ensureAllServices();
        goTab("provider-dashboard");
      } else {
        await ensureAllServices();
        navigate("provider-register");
      }
    });
  }

  function toggleProviderArea(area) {
    setProviderForm((f) => ({
      ...f,
      areas: f.areas.includes(area) ? f.areas.filter((a) => a !== area) : [...f.areas, area],
    }));
  }

  function toggleProviderService(id) {
    setProviderForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id],
    }));
  }

  async function submitProviderRegister() {
    await withLoading(async () => {
      const created = await api("/providers/register", {
        method: "POST",
        body: JSON.stringify({
          telegramId: tgUser.id,
          name: tgUser.name,
          username: tgUser.username,
          description: providerForm.description,
          priceFrom: providerForm.priceFrom ? Number(providerForm.priceFrom) : undefined,
          serviceIds: providerForm.serviceIds,
          areas: providerForm.areas,
        }),
      });
      setProvider(created);
      goTab("provider-dashboard");
    });
  }

  function openProfileTab() {
    goTab("provider-profile-cabinet");
    ensureAllServices().catch((e) => setError(e.message));
  }

  function toggleProfileLanguage(lang) {
    setProfileExtra((f) => ({
      ...f,
      languages: f.languages.includes(lang) ? f.languages.filter((l) => l !== lang) : [...f.languages, lang],
    }));
  }

  // Средний рейтинг и аналитика считаются из одних и тех же данных, которые
  // видны пользователю на экранах «Отзывы»/«Заявки»/«Заказы» — никаких
  // отдельных чисел-заглушек, не связанных с остальным кабинетом.
  function getReviewStats() {
    const dist = MOCK_REVIEWS.distribution;
    const total = dist.reduce((s, d) => s + d.count, 0);
    const sum = dist.reduce((s, d) => s + d.count * d.stars, 0);
    return { avg: total ? sum / total : 0, total };
  }

  function getMonthIncome() {
    return ordersState.completed.reduce((s, o) => s + (o.price || 0), 0);
  }

  function getFunnelStats() {
    const received = requestsState.new.length + requestsState.inWork.length + requestsState.completed.length + requestsState.declined.length;
    const responded = requestsState.inWork.length + requestsState.completed.length + requestsState.declined.length;
    const chosen = ordersState.confirmed.length + ordersState.completed.length;
    const conversion = received ? Math.round((chosen / received) * 100) : 0;
    return { received, responded, chosen, conversion };
  }

  function getRepeatClients() {
    const all = [...ordersState.confirmed, ...ordersState.completed, ...ordersState.cancelled];
    const counts = {};
    for (const o of all) counts[o.client.contact] = (counts[o.client.contact] || 0) + 1;
    return Object.values(counts).filter((c) => c > 1).length;
  }

  function acceptRequest(id) {
    const item = requestsState.new.find((r) => r.id === id);
    if (!item) return;
    setRequestsState((s) => ({ ...s, new: s.new.filter((r) => r.id !== id), inWork: [{ ...item, price: item.budget }, ...s.inWork] }));
    setOrdersState((s) => ({
      ...s,
      confirmed: [
        {
          id: item.id,
          service: item.service,
          description: item.description,
          price: item.budget,
          address: item.area,
          client: { name: "Клиент по заявке", photo: null, contact: "—" },
          hasUnread: false,
        },
        ...s.confirmed,
      ],
    }));
  }
  function declineRequest(id) {
    setRequestsState((s) => {
      const item = s.new.find((r) => r.id === id);
      if (!item) return s;
      return { ...s, new: s.new.filter((r) => r.id !== id), declined: [{ ...item, reason: "Отклонено мастером" }, ...s.declined] };
    });
  }

  function openOrderDetail(order) {
    setSelectedOrder(order);
    navigate("provider-order-detail");
  }

  function openChat(order) {
    setActiveChatOrder(order);
    setOrdersState((s) => ({ ...s, confirmed: s.confirmed.map((o) => (o.id === order.id ? { ...o, hasUnread: false } : o)) }));
    navigate("provider-chat");
  }

  function sendChatMessage() {
    if (!chatDraft.trim() || !activeChatOrder) return;
    const orderId = activeChatOrder.id;
    setChatMessages((m) => ({ ...m, [orderId]: [...(m[orderId] || []), { from: "me", text: chatDraft.trim(), time: "сейчас" }] }));
    setChatDraft("");
  }

  function sendSupportMessage() {
    if (!supportDraft.trim()) return;
    setSupportMessages((m) => [...m, { from: "me", text: supportDraft.trim(), time: "сейчас" }]);
    setSupportDraft("");
  }

  function confirmDeleteAccount() {
    setShowDeleteConfirm(false);
    setProvider(null);
    goHome();
  }

  /* -------------------------- Экраны: клиент (без изменений) -------------------------- */

  function renderRole() {
    return (
      <div className="tms-screen">
        <div className="tms-hero">
          <p className="tms-greeting">{tgUser.name}, привет</p>
          <h1 className="tms-hero-title">Вы клиент или мастер?</h1>
        </div>
        <div className="tms-role-grid">
          <button className="tms-role-card" onClick={chooseClient}>
            <span className="tms-role-emoji">🔍</span>
            <span className="tms-role-title">Я клиент</span>
            <span className="tms-role-sub">Ищу мастера для задачи</span>
          </button>
          <button className="tms-role-card" onClick={chooseProvider}>
            <span className="tms-role-emoji">🛠️</span>
            <span className="tms-role-title">Я мастер</span>
            <span className="tms-role-sub">Хочу получать заявки</span>
          </button>
        </div>
        {error && <p className="tms-error">{error}</p>}
      </div>
    );
  }

  function renderClientHome() {
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <button className="tms-link-row" onClick={openMyRequests}>Мои заявки →</button>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Категории</p>
          {loading && <p className="muted">Загрузка…</p>}
          {error && <p className="tms-error">{error}</p>}
          <div className="tms-cat-grid">
            {categories.map((cat) => (
              <button key={cat.id} className="tms-cat-card" onClick={() => pickCategory(cat)}>
                <span className="tms-cat-icon">{cat.icon || "•"}</span>
                <span className="tms-cat-name">{cat.name}</span>
              </button>
            ))}
          </div>
          {!loading && categories.length === 0 && !error && (
            <p className="muted">Категорий пока нет — загляните позже.</p>
          )}
        </div>
      </div>
    );
  }

  function renderClientServices() {
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">{form.categoryName}</p>
          {loading && <p className="muted">Загрузка…</p>}
          <div className="tms-list">
            {services.map((s) => (
              <button key={s.id} className="tms-list-row" onClick={() => pickService(s)}>
                <span>{s.name}</span><span className="tms-chevron">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderClientRequest() {
    const ready = form.district && form.urgency;
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">Услуга</p>
          <div className="tms-summary-pill">{form.categoryName} · {form.serviceName}</div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Описание</p>
          <textarea className="tms-textarea" rows={2} placeholder="Опишите задачу"
            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Район</p>
          <div className="tms-chip-wrap">
            {DISTRICTS.map((d) => <Chip key={d} label={d} active={form.district === d} onClick={() => setForm((f) => ({ ...f, district: d }))} />)}
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Срочность</p>
          <div className="tms-chip-wrap">
            {URGENCY_OPTIONS.map((u) => <Chip key={u} label={u} active={form.urgency === u} onClick={() => setForm((f) => ({ ...f, urgency: u }))} />)}
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Бюджет — до {form.budget} ₾</p>
          <input type="range" min={20} max={300} step={5} value={form.budget}
            onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))} className="tms-range" />
        </div>
        {error && <p className="tms-error">{error}</p>}
        {!ready && <p className="muted">Выберите район и срочность, чтобы продолжить</p>}
      </div>
    );
  }

  function renderClientMatches() {
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">Заявка отправлена</p>
          <p className="muted">Эти мастера подходят под вашу задачу и могут откликнуться:</p>
        </div>
        <div className="tms-provider-list">
          {candidates.map(({ provider: p, overall, breakdown }) => (
            <div key={p.id} className="tms-provider-row">
              <button className="tms-provider-main" onClick={() => setExpandedCandidate(expandedCandidate === p.id ? null : p.id)}>
                <span className="tms-provider-avatar">👤</span>
                <span className="tms-provider-info">
                  <span className="tms-provider-name">{p.user.name}</span>
                  <span className="tms-provider-meta">{p.rating.toFixed(1)} · {p.reviewCount} отз.</span>
                </span>
                <MatchRing score={overall} />
              </button>
              {expandedCandidate === p.id && (
                <div className="tms-legend">
                  {Object.entries(breakdown).map(([key, score]) => (
                    <div className="tms-legend-row" key={key}>
                      <span className="tms-legend-label">{FACTOR_LABELS[key]}</span>
                      <span className="tms-legend-bar-track"><span className="tms-legend-bar-fill" style={{ width: `${score}%` }} /></span>
                      <span className="tms-legend-weight">{FACTOR_WEIGHTS[key]}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {candidates.length === 0 && <p className="muted">Подходящих мастеров пока нет — загляните позже в «Мои заявки».</p>}
        </div>
      </div>
    );
  }

  function renderClientMy() {
    return (
      <div className="tms-screen">
        <div className="tms-section"><p className="tms-section-label">Мои заявки</p></div>
        {loading && <p className="muted">Загрузка…</p>}
        <div className="tms-list">
          {myRequests.map((r) => (
            <button key={r.id} className="tms-list-row" onClick={() => openRequestOffers(r)}>
              <span>{r.service.name} · {r.status === "open" ? "открыта" : r.status === "matched" ? "мастер выбран" : r.status}</span>
              <span className="tms-chevron">{r.offers.length} откл. →</span>
            </button>
          ))}
        </div>
        {!loading && myRequests.length === 0 && <p className="muted">Заявок пока нет.</p>}
      </div>
    );
  }

  function renderClientOffers() {
    return (
      <div className="tms-screen">
        <div className="tms-section"><p className="tms-section-label">Отклики</p></div>
        {loading && <p className="muted">Загрузка…</p>}
        <div className="tms-offer-list">
          {selectedOffers.map((o) => (
            <div key={o.id} className="tms-offer-row">
              <div className="tms-offer-top">
                <span className="tms-provider-avatar">👤</span>
                <div><p className="tms-provider-name">{o.provider.user.name}</p><p className="tms-provider-meta">{o.status}</p></div>
                <p className="tms-offer-terms">{o.price} ₾</p>
              </div>
              {o.comment && <p className="tms-offer-comment">«{o.comment}»</p>}
              {o.status === "pending" && (
                <div className="tms-offer-actions">
                  <button className="tms-select-btn" onClick={() => respondToOffer(o.id, "accepted")}>Выбрать</button>
                  <button className="tms-decline-btn" onClick={() => respondToOffer(o.id, "declined")}>Отклонить</button>
                </div>
              )}
            </div>
          ))}
        </div>
        {!loading && selectedOffers.length === 0 && <p className="muted">Пока никто не откликнулся.</p>}
      </div>
    );
  }

  /* -------------------------- Экраны: мастер — регистрация -------------------------- */

  function renderProviderRegister() {
    const ready = providerForm.serviceIds.length > 0 && providerForm.areas.length > 0;
    const groups = groupServicesByCategory(allServices);
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">Какие услуги оказываете</p>
          <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>Можно выбрать несколько</p>
          {groups.map((group) => (
            <div key={group.id} className="tms-cat-group">
              <p className="tms-cat-group-title">{group.icon} {group.name}</p>
              <div className="tms-list">
                {group.items.map((s) => (
                  <button key={s.id}
                    className={`tms-list-row ${providerForm.serviceIds.includes(s.id) ? "is-active-row" : ""}`}
                    onClick={() => toggleProviderService(s.id)}>
                    <span>{s.name}</span>
                    {providerForm.serviceIds.includes(s.id) && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Районы работы {providerForm.areas.length === 0 && <span className="tms-hint-inline">— выберите хотя бы один, иначе анкету не отправить</span>}</p>
          <div className="tms-chip-wrap">
            {DISTRICTS.map((d) => <Chip key={d} label={d} active={providerForm.areas.includes(d)} onClick={() => toggleProviderArea(d)} />)}
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Цена от (₾)</p>
          <input className="tms-textarea" type="number" placeholder="50"
            value={providerForm.priceFrom} onChange={(e) => setProviderForm((f) => ({ ...f, priceFrom: e.target.value }))} />
        </div>
        <div className="tms-section">
          <p className="tms-section-label">О себе</p>
          <textarea className="tms-textarea" rows={2} placeholder="Опыт, специализация"
            value={providerForm.description} onChange={(e) => setProviderForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        {error && <p className="tms-error">{error}</p>}
      </div>
    );
  }

  /* -------------------------- Экраны: мастер — личный кабинет -------------------------- */

  function renderProviderDashboard() {
    const funnel = getFunnelStats();
    const monthIncome = getMonthIncome();
    const { avg: ratingAvg } = getReviewStats();
    return (
      <div className="tms-screen">
        <div className="tms-hero">
          <p className="tms-greeting">Сегодня</p>
          <h1 className="tms-hero-title">{tgUser.name}</h1>
        </div>
        <div className="tms-stat-grid">
          <StatCard icon="🔔" label="Новых заявок" value={requestsState.new.length} />
          <StatCard icon="🟢" label="В работе" value={ordersState.confirmed.length} tone="accent"
            onClick={() => { setOrdersTab("confirmed"); navigate("provider-orders"); }} />
          <StatCard icon="⭐" label="Рейтинг" value={ratingAvg.toFixed(1)}
            onClick={() => navigate("provider-reviews")} />
          <StatCard icon="💬" label="Новых сообщений" value={ordersState.confirmed.filter((o) => o.hasUnread).length}
            onClick={() => navigate("provider-messages")} />
        </div>
        <div className="tms-section">
          <div className="tms-income-card">
            <span className="tms-provider-meta">Доход за месяц</span>
            <span className="tms-income-value">{monthIncome.toLocaleString("ru-RU")} ₾</span>
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Конверсия</p>
          <div className="tms-funnel">
            <div className="tms-funnel-step"><span className="tms-funnel-value">{funnel.received}</span><span className="tms-provider-meta">заявок</span></div>
            <span className="tms-funnel-arrow">→</span>
            <div className="tms-funnel-step"><span className="tms-funnel-value">{funnel.responded}</span><span className="tms-provider-meta">обработано</span></div>
            <span className="tms-funnel-arrow">→</span>
            <div className="tms-funnel-step"><span className="tms-funnel-value">{funnel.chosen}</span><span className="tms-provider-meta">заказов</span></div>
            <span className="tms-funnel-arrow">→</span>
            <div className="tms-funnel-step"><span className="tms-funnel-value">{funnel.conversion}%</span><span className="tms-provider-meta">конверсия</span></div>
          </div>
        </div>
      </div>
    );
  }

  function renderProviderRequests() {
    const tabs = [
      { value: "new", label: "Новые", count: requestsState.new.length },
      { value: "inWork", label: "В работе", count: requestsState.inWork.length },
      { value: "completed", label: "Завершённые", count: requestsState.completed.length },
      { value: "declined", label: "Отклонённые", count: requestsState.declined.length },
    ];
    const list = requestsState[requestsTab];
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <Segmented options={tabs} value={requestsTab} onChange={setRequestsTab} />
        </div>
        <div className="tms-provider-list" style={{ marginTop: 16 }}>
          {list.map((r) => (
            <div key={r.id} className="tms-provider-row">
              <div className="tms-provider-info" style={{ flex: 1 }}>
                <span className="tms-provider-name">{r.service}</span>
                <span className="tms-provider-meta">{r.area}{r.urgency ? ` · ${r.urgency}` : ""}</span>
                {r.description && <span className="tms-provider-meta">{r.description}</span>}
                {typeof r.budget === "number" && <span className="tms-provider-meta">до {r.budget} ₾</span>}
                {typeof r.price === "number" && <span className="tms-provider-meta">{r.price} ₾</span>}
                {r.date && <span className="tms-provider-meta">Завершено {r.date}</span>}
                {r.reason && <span className="tms-provider-meta">{r.reason}</span>}
              </div>
              {requestsTab === "new" && (
                <div className="tms-offer-actions" style={{ marginTop: 0 }}>
                  <button className="tms-select-btn" onClick={() => acceptRequest(r.id)}>Взять в работу</button>
                  <button className="tms-decline-btn" onClick={() => declineRequest(r.id)}>Отказаться</button>
                </div>
              )}
            </div>
          ))}
          {list.length === 0 && <p className="muted">Здесь пока пусто.</p>}
        </div>
      </div>
    );
  }

  function renderProviderOrders() {
    const tabs = [
      { value: "confirmed", label: "Подтверждённые", count: ordersState.confirmed.length },
      { value: "completed", label: "Завершённые", count: ordersState.completed.length },
      { value: "cancelled", label: "Отменённые", count: ordersState.cancelled.length },
    ];
    const list = ordersState[ordersTab];
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <Segmented options={tabs} value={ordersTab} onChange={setOrdersTab} />
        </div>
        <div className="tms-provider-list" style={{ marginTop: 16 }}>
          {list.map((o) => (
            <button key={o.id} className="tms-order-card" onClick={() => openOrderDetail(o)}>
              <div className="tms-provider-info" style={{ flex: 1 }}>
                <span className="tms-provider-name">{o.service}</span>
                <span className="tms-provider-meta">{o.client.name} · {o.address}</span>
              </div>
              <span className="tms-offer-terms">{o.price} ₾</span>
              {ordersTab === "confirmed" && o.hasUnread && <span className="tms-badge">●</span>}
              <span className="tms-chevron">→</span>
            </button>
          ))}
          {list.length === 0 && <p className="muted">Здесь пока пусто.</p>}
        </div>
      </div>
    );
  }

  function renderProviderOrderDetail() {
    const o = selectedOrder;
    if (!o) return null;
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">Описание работы</p>
          <p className="tms-body-text">{o.description}</p>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Клиент</p>
          <div className="tms-provider-main" style={{ cursor: "default" }}>
            <span className="tms-provider-avatar">👤</span>
            <span className="tms-provider-info">
              <span className="tms-provider-name">{o.client.name}</span>
              <span className="tms-provider-meta">{o.client.contact}</span>
            </span>
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Адрес</p>
          <p className="tms-body-text">{o.address}</p>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Сумма работы</p>
          <p className="tms-body-text">{o.price} ₾</p>
        </div>
        <div className="tms-section">
          {ordersTab === "confirmed" ? (
            <button className="tms-select-btn" style={{ width: "100%", padding: "12px" }} onClick={() => openChat(o)}>💬 Чат с клиентом</button>
          ) : (
            <p className="muted">Чат по этому заказу перемещён в архив.</p>
          )}
        </div>
      </div>
    );
  }

  function renderProviderMessages() {
    return (
      <div className="tms-screen">
        <div className="tms-section"><p className="tms-section-label">Чаты по активным заказам</p></div>
        <div className="tms-list">
          {ordersState.confirmed.map((o) => {
            const msgs = chatMessages[o.id] || [];
            const last = msgs[msgs.length - 1];
            return (
              <button key={o.id} className="tms-list-row" onClick={() => openChat(o)}>
                <span>
                  <span style={{ fontWeight: 600 }}>{o.client.name}</span>
                  {last && <span className="tms-provider-meta" style={{ display: "block" }}>{last.text}</span>}
                </span>
                {o.hasUnread ? <span className="tms-badge">●</span> : <span className="tms-chevron">→</span>}
              </button>
            );
          })}
          {ordersState.confirmed.length === 0 && <p className="muted">Активных заказов пока нет.</p>}
        </div>
      </div>
    );
  }

  function renderProviderChat() {
    if (!activeChatOrder) return null;
    const msgs = chatMessages[activeChatOrder.id] || [];
    return (
      <div className="tms-screen" style={{ paddingBottom: 8 }}>
        <div className="tms-section" style={{ marginTop: 0 }}>
          <p className="tms-section-label">{activeChatOrder.service} · {activeChatOrder.client.name}</p>
        </div>
        <ChatThread messages={msgs} />
      </div>
    );
  }

  function renderProviderProfileCabinet() {
    const groups = groupServicesByCategory(allServices);
    const selectedCategoryNames = [
      ...new Set(allServices.filter((s) => providerForm.serviceIds.includes(s.id)).map((s) => s.category?.name).filter(Boolean)),
    ];
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <p className="tms-section-label">Основная информация</p>
          <div className="tms-profile-card">
            <div className="tms-profile-head">
              {tgUser.photoUrl ? (
                <img className="tms-avatar-img" src={tgUser.photoUrl} alt="" />
              ) : (
                <span className="tms-provider-avatar" style={{ fontSize: 32 }}>👤</span>
              )}
              <div>
                <p className="tms-provider-name" style={{ fontSize: 16 }}>{tgUser.name}</p>
                <p className="tms-provider-meta">{selectedCategoryNames.length ? selectedCategoryNames.join(" · ") : "Категория не выбрана"}</p>
              </div>
              <span className={`tms-badge-verify ${provider?.verified ? "is-verified" : ""}`}>
                {provider?.verified ? "✅ Подтверждён" : "⏳ На проверке"}
              </span>
            </div>
            <textarea className="tms-textarea" rows={3} placeholder="Расскажите об опыте и специализации"
              value={providerForm.description} onChange={(e) => setProviderForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Языки</p>
          <div className="tms-chip-wrap">
            {LANGUAGE_OPTIONS.map((l) => <Chip key={l} label={l} active={profileExtra.languages.includes(l)} onClick={() => toggleProfileLanguage(l)} />)}
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Контакты</p>
          <div className="tms-field-group">
            <label className="tms-field"><span>Телефон</span><input className="tms-field-input" placeholder="+995 5xx xx xx xx"
              value={profileExtra.phone} onChange={(e) => setProfileExtra((f) => ({ ...f, phone: e.target.value }))} /></label>
            <label className="tms-field"><span>Telegram</span><input className="tms-field-input" placeholder="@username"
              value={profileExtra.telegramContact} onChange={(e) => setProfileExtra((f) => ({ ...f, telegramContact: e.target.value }))} /></label>
            <label className="tms-field"><span>Email</span><input className="tms-field-input" placeholder="mail@example.com"
              value={profileExtra.email} onChange={(e) => setProfileExtra((f) => ({ ...f, email: e.target.value }))} /></label>
          </div>
          <Toggle checked={profileExtra.contactsHidden} onChange={(v) => setProfileExtra((f) => ({ ...f, contactsHidden: v }))}
            label="Скрывать контакты от клиентов" sub="Клиент увидит контакты только после подтверждения заказа" />
        </div>

        <div className="tms-section">
          <p className="tms-section-label">География — работаю</p>
          <div className="tms-chip-wrap">
            {DISTRICTS.map((d) => <Chip key={d} label={d} active={providerForm.areas.includes(d)} onClick={() => toggleProviderArea(d)} />)}
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Услуги</p>
          {groups.map((group) => (
            <div key={group.id} className="tms-cat-group">
              <p className="tms-cat-group-title">{group.icon} {group.name}</p>
              <div className="tms-list">
                {group.items.map((s) => (
                  <button key={s.id}
                    className={`tms-list-row ${providerForm.serviceIds.includes(s.id) ? "is-active-row" : ""}`}
                    onClick={() => toggleProviderService(s.id)}>
                    <span>{s.name}</span>
                    {providerForm.serviceIds.includes(s.id) && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="muted">Загрузка списка услуг…</p>}
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Цены</p>
          <div className="tms-field-group">
            <label className="tms-field"><span>Выезд, ₾</span><input className="tms-field-input" type="number" placeholder="20"
              value={profileExtra.calloutPrice} onChange={(e) => setProfileExtra((f) => ({ ...f, calloutPrice: e.target.value }))} /></label>
            <label className="tms-field"><span>Минимальный заказ, ₾</span><input className="tms-field-input" type="number" placeholder="50"
              value={profileExtra.minOrderPrice} onChange={(e) => setProfileExtra((f) => ({ ...f, minOrderPrice: e.target.value }))} /></label>
            <label className="tms-field"><span>Почасовая ставка, ₾</span><input className="tms-field-input" type="number" placeholder="40"
              value={profileExtra.hourlyRate} onChange={(e) => setProfileExtra((f) => ({ ...f, hourlyRate: e.target.value }))} /></label>
          </div>
        </div>
      </div>
    );
  }

  function renderProviderMore() {
    const items = [
      { key: "provider-analytics", icon: "📈", label: "Аналитика" },
      { key: "provider-reviews", icon: "⭐", label: "Отзывы" },
      { key: "provider-finance", icon: "💰", label: "Финансы" },
      { key: "provider-subscription", icon: "💳", label: "Подписка" },
      { key: "provider-settings", icon: "⚙️", label: "Настройки" },
    ];
    return (
      <div className="tms-screen">
        <div className="tms-list">
          {items.map((it) => (
            <button key={it.key} className="tms-list-row" onClick={() => navigate(it.key)}>
              <span>{it.icon} {it.label}</span><span className="tms-chevron">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderProviderAnalytics() {
    const funnel = getFunnelStats();
    const monthIncome = getMonthIncome();
    const repeatClients = getRepeatClients();
    return (
      <div className="tms-screen">
        <div className="tms-stat-grid">
          <StatCard icon="📥" label="Получено заявок" value={funnel.received} />
          <StatCard icon="✉️" label="Обработано" value={funnel.responded} />
          <StatCard icon="✅" label="Выбрали (заказы)" value={funnel.chosen} />
          <StatCard icon="📊" label="Конверсия" value={`${funnel.conversion}%`} />
          <StatCard icon="🔁" label="Повторные клиенты" value={repeatClients} />
          <StatCard icon="💰" label="Доход за месяц" value={`${monthIncome.toLocaleString("ru-RU")} ₾`} />
        </div>
      </div>
    );
  }

  function renderProviderReviews(all) {
    const { avg: rating, total } = getReviewStats();
    const maxCount = Math.max(...MOCK_REVIEWS.distribution.map((d) => d.count));
    const list = all ? MOCK_REVIEWS.list : MOCK_REVIEWS.list.slice(0, 3);
    return (
      <div className="tms-screen">
        {!all && (
          <div className="tms-section" style={{ marginTop: 4 }}>
            <div className="tms-review-summary">
              <div className="tms-review-score">
                <span className="tms-review-score-value">{rating.toFixed(1)}</span>
                <span className="tms-review-stars">{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>
                <span className="tms-provider-meta">{total} отзывов</span>
              </div>
              <div className="tms-review-bars">
                {MOCK_REVIEWS.distribution.map((d) => (
                  <div className="tms-review-bar-row" key={d.stars}>
                    <span className="tms-provider-meta">{d.stars} ★</span>
                    <span className="tms-legend-bar-track"><span className="tms-legend-bar-fill" style={{ width: `${(d.count / maxCount) * 100}%` }} /></span>
                    <span className="tms-provider-meta">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="tms-section">
          {!all && <p className="tms-section-label">Последние отзывы</p>}
          <div className="tms-list-plain">
            {list.map((r, i) => <ReviewRow key={i} review={r} />)}
          </div>
          {!all && (
            <button className="tms-link-row" style={{ marginTop: 12 }} onClick={() => navigate("provider-reviews-all")}>
              Показать все отзывы →
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderProviderFinance() {
    return (
      <div className="tms-screen">
        <p className="tms-inprogress-note">Раздел в разработке — данные для наглядности</p>
        <div className="tms-section" style={{ marginTop: 4 }}>
          <div className="tms-income-card">
            <span className="tms-provider-meta">Баланс</span>
            <span className="tms-income-value">{MOCK_FINANCE.balance.toLocaleString("ru-RU")} ₾</span>
          </div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">История операций</p>
          <div className="tms-list">
            {MOCK_FINANCE.history.map((h, i) => (
              <div key={i} className="tms-list-row" style={{ cursor: "default" }}>
                <span>{h.date} · заявка №{h.requestId}</span>
                <span>+{h.amount} ₾</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderProviderSubscription() {
    return (
      <div className="tms-screen">
        <p className="tms-inprogress-note">Раздел в разработке</p>
        <div className="tms-section" style={{ marginTop: 4 }}>
          <div className="tms-profile-card">
            <p className="tms-provider-name">Подписка появится позже</p>
            <p className="muted">Как только определимся с моделью монетизации — здесь можно будет выбрать тариф и продвижение анкеты.</p>
          </div>
        </div>
      </div>
    );
  }

  function renderProviderSettings() {
    return (
      <div className="tms-screen">
        <div className="tms-section" style={{ marginTop: 4 }}>
          <p className="tms-section-label">Аккаунт</p>
          <div className="tms-field-group">
            <label className="tms-field"><span>Имя</span><input className="tms-field-input"
              value={settingsForm.name} onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))} /></label>
            <label className="tms-field"><span>Телефон</span><input className="tms-field-input" placeholder="+995 5xx xx xx xx"
              value={settingsForm.phone} onChange={(e) => setSettingsForm((f) => ({ ...f, phone: e.target.value }))} /></label>
            <label className="tms-field"><span>Email</span><input className="tms-field-input" placeholder="mail@example.com"
              value={settingsForm.email} onChange={(e) => setSettingsForm((f) => ({ ...f, email: e.target.value }))} /></label>
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Уведомления</p>
          <div className="tms-profile-card">
            <Toggle checked={settingsForm.notifyRequests} onChange={(v) => setSettingsForm((f) => ({ ...f, notifyRequests: v }))} label="Новые заявки" />
            <Toggle checked={settingsForm.notifyReviews} onChange={(v) => setSettingsForm((f) => ({ ...f, notifyReviews: v }))} label="Новые отзывы" />
            <Toggle checked={settingsForm.notifyOrders} onChange={(v) => setSettingsForm((f) => ({ ...f, notifyOrders: v }))} label="Действия по заказам" />
            <Toggle checked={settingsForm.notifyChat} onChange={(v) => setSettingsForm((f) => ({ ...f, notifyChat: v }))} label="Чат с клиентами" />
          </div>
          <p className="muted">Уведомления от Telegram-бота — донастроим отдельно.</p>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Язык приложения</p>
          <div className="tms-chip-wrap">
            {APP_LANGUAGES.map((l) => <Chip key={l} label={l} active={settingsForm.appLanguage === l} onClick={() => setSettingsForm((f) => ({ ...f, appLanguage: l }))} />)}
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Поддержка</p>
          <button className="tms-link-row" onClick={() => navigate("provider-support")}>Написать в поддержку →</button>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Опасная зона</p>
          {!showDeleteConfirm ? (
            <button className="tms-decline-btn" onClick={() => setShowDeleteConfirm(true)}>Удалить аккаунт</button>
          ) : (
            <div className="tms-profile-card">
              <p className="tms-body-text">Все данные анкеты, заявки и отзывы будут удалены безвозвратно. Продолжить?</p>
              <div className="tms-offer-actions">
                <button className="tms-decline-btn" onClick={confirmDeleteAccount}>Да, удалить</button>
                <button className="tms-select-btn" onClick={() => setShowDeleteConfirm(false)}>Отмена</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderProviderSupport() {
    return (
      <div className="tms-screen" style={{ paddingBottom: 8 }}>
        <div className="tms-section" style={{ marginTop: 0 }}>
          <p className="muted">Опишите проблему или предложение — сообщение придёт в поддержку.</p>
        </div>
        <ChatThread messages={supportMessages} />
      </div>
    );
  }

  function render() {
    switch (screen) {
      case "role": return renderRole();
      case "client-home": return renderClientHome();
      case "client-services": return renderClientServices();
      case "client-request": return renderClientRequest();
      case "client-matches": return renderClientMatches();
      case "client-my": return renderClientMy();
      case "client-offers": return renderClientOffers();
      case "provider-register": return renderProviderRegister();
      case "provider-dashboard": return renderProviderDashboard();
      case "provider-requests": return renderProviderRequests();
      case "provider-orders": return renderProviderOrders();
      case "provider-order-detail": return renderProviderOrderDetail();
      case "provider-messages": return renderProviderMessages();
      case "provider-chat": return renderProviderChat();
      case "provider-profile-cabinet": return renderProviderProfileCabinet();
      case "provider-more": return renderProviderMore();
      case "provider-analytics": return renderProviderAnalytics();
      case "provider-reviews": return renderProviderReviews(false);
      case "provider-reviews-all": return renderProviderReviews(true);
      case "provider-finance": return renderProviderFinance();
      case "provider-subscription": return renderProviderSubscription();
      case "provider-settings": return renderProviderSettings();
      case "provider-support": return renderProviderSupport();
      default: return null;
    }
  }

  const TITLES = {
    role: "Мастера · Тбилиси",
    "client-home": "Категории",
    "client-services": "Выбор услуги",
    "client-request": "Новая заявка",
    "client-matches": "Подходящие мастера",
    "client-my": "Мои заявки",
    "client-offers": "Отклики",
    "provider-register": "Регистрация мастера",
    "provider-dashboard": "Личный кабинет",
    "provider-requests": "Заявки",
    "provider-orders": "Заказы",
    "provider-order-detail": "Заказ",
    "provider-messages": "Сообщения",
    "provider-chat": "Чат с клиентом",
    "provider-profile-cabinet": "Профиль",
    "provider-more": "Ещё",
    "provider-analytics": "Аналитика",
    "provider-reviews": "Отзывы",
    "provider-reviews-all": "Все отзывы",
    "provider-finance": "Финансы",
    "provider-subscription": "Подписка",
    "provider-settings": "Настройки",
    "provider-support": "Поддержка",
  };

  function bottomBarConfig() {
    switch (screen) {
      case "client-request":
        return { label: loading ? "Отправляю…" : "Отправить заявку", disabled: loading || !(form.district && form.urgency), onClick: submitRequest };
      case "provider-register": {
        let hint;
        if (providerForm.serviceIds.length === 0) hint = "Выберите хотя бы одну услугу";
        else if (providerForm.areas.length === 0) hint = "Выберите хотя бы один район работы";
        return {
          label: loading ? "Регистрирую…" : "Зарегистрироваться",
          disabled: loading || !(providerForm.serviceIds.length > 0 && providerForm.areas.length > 0),
          onClick: submitProviderRegister,
          hint,
        };
      }
      default:
        return null;
    }
  }

  const bb = bottomBarConfig() || {};
  // Экран профиля мастера использует ту же вкладку "Профиль" в таб-баре, но переход
  // на неё должен подгружать список услуг — используем отдельный обработчик клика таб-бара.
  function handleTabNavigate(key) {
    if (key === "provider-profile-cabinet") openProfileTab();
    else goTab(key);
  }
  const showBack = history.length > 0;

  let bottomArea = null;
  if (screen === "provider-chat") {
    bottomArea = <ChatInputBar value={chatDraft} onChange={setChatDraft} onSend={sendChatMessage} />;
  } else if (screen === "provider-support") {
    bottomArea = <ChatInputBar value={supportDraft} onChange={setSupportDraft} onSend={sendSupportMessage} />;
  } else if (TAB_BAR_SCREENS.has(screen)) {
    bottomArea = <ProviderTabBar active={screen} onNavigate={handleTabNavigate} />;
  } else if (bb.label) {
    bottomArea = <BottomBar label={bb.label} disabled={bb.disabled} onClick={bb.onClick} hint={bb.hint} />;
  }

  return (
    <div className="tms-root">
      <style>{`
        .tms-root {
          --ink: #14161A; --paper: #F6F5F2; --card: #FFFFFF; --accent: #1F6F5C; --line: #E4E2DC; --muted: #86847C;
          font-family: 'Inter', -apple-system, sans-serif; color: var(--ink);
          display: flex; justify-content: center; padding: 24px 0;
        }
        .tms-root * { box-sizing: border-box; }
        .tms-phone { width: 380px; max-width: 100%; height: 740px; background: var(--paper); border-radius: 28px; border: 1px solid var(--line); box-shadow: 0 24px 48px -24px rgba(20,22,26,0.35); display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .tms-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 16px; background: var(--paper); border-bottom: 1px solid var(--line); flex-shrink: 0; }
        .tms-header-btn { width: 26px; height: 26px; border-radius: 8px; border: none; background: transparent; color: var(--muted); font-size: 15px; cursor: pointer; }
        .tms-header-spacer { width: 26px; }
        .tms-header-title { font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em; color: var(--muted); }
        .tms-body { flex: 1; overflow-y: auto; }
        .tms-screen { padding: 20px 20px 32px; display: flex; flex-direction: column; gap: 2px; }
        .tms-hero { padding: 4px 0 8px; }
        .tms-greeting { font-size: 13px; color: var(--muted); margin: 0 0 4px; }
        .tms-hero-title { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 600; margin: 0; line-height: 1.2; }
        .tms-role-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
        .tms-role-card { text-align: left; background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
        .tms-role-emoji { font-size: 22px; }
        .tms-role-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px; }
        .tms-role-sub { font-size: 12px; color: var(--muted); }
        .tms-section { margin-top: 22px; }
        .tms-section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 10px; font-weight: 500; }
        .tms-link-row { border: none; background: transparent; color: var(--accent); font-weight: 600; font-size: 13px; cursor: pointer; padding: 0; }
        .tms-textarea { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; font-size: 14px; resize: none; background: var(--card); color: var(--ink); }
        .tms-hint-inline { text-transform: none; letter-spacing: normal; font-weight: 400; color: var(--muted); }
        .tms-cat-group { margin-top: 16px; }
        .tms-cat-group:first-child { margin-top: 0; }
        .tms-cat-group-title { font-size: 12px; font-weight: 600; margin: 0 0 6px; }
        .tms-cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .tms-cat-card { text-align: center; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px 6px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .tms-cat-icon { font-size: 20px; }
        .tms-cat-name { font-size: 12.5px; font-weight: 500; }
        .tms-list { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--card); }
        .tms-list-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 16px; border-bottom: 1px solid var(--line); background: transparent; border-left: none; border-right: none; border-top: none; font-size: 14px; cursor: pointer; color: var(--ink); text-align: left; }
        .tms-list-row:last-child { border-bottom: none; }
        .tms-list-row.is-active-row { background: var(--paper); font-weight: 600; }
        .tms-list-plain { display: flex; flex-direction: column; gap: 14px; }
        .tms-chevron { color: var(--muted); }
        .tms-summary-pill { display: inline-block; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 9px 14px; font-size: 13px; font-weight: 500; }
        .tms-chip-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
        .tms-chip { border: 1px solid var(--line); background: var(--card); border-radius: 8px; padding: 8px 13px; font-size: 12.5px; cursor: pointer; color: var(--ink); }
        .tms-chip.is-active { background: var(--ink); border-color: var(--ink); color: var(--paper); font-weight: 600; }
        .tms-range { width: 100%; accent-color: var(--ink); }
        .tms-provider-list { display: flex; flex-direction: column; }
        .tms-provider-row { border-bottom: 1px solid var(--line); padding: 12px 0; display: flex; flex-direction: column; gap: 8px; }
        .tms-provider-row:first-child { padding-top: 0; }
        .tms-provider-main { display: flex; align-items: center; gap: 10px; padding: 0; background: transparent; border: none; cursor: pointer; text-align: left; width: 100%; }
        .tms-provider-avatar { font-size: 22px; flex-shrink: 0; }
        .tms-provider-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .tms-provider-name { font-size: 14px; font-weight: 600; }
        .tms-provider-meta { font-size: 11px; color: var(--muted); }
        .tms-matchring-text { font-size: 11px; font-weight: 600; fill: var(--ink); }
        .tms-legend { width: 100%; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
        .tms-legend-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
        .tms-legend-label { width: 120px; flex-shrink: 0; }
        .tms-legend-bar-track { flex: 1; height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; }
        .tms-legend-bar-fill { display: block; height: 100%; background: var(--accent); border-radius: 2px; }
        .tms-legend-weight { width: 26px; text-align: right; color: var(--muted); flex-shrink: 0; }
        .tms-offer-list { display: flex; flex-direction: column; }
        .tms-offer-row { border-bottom: 1px solid var(--line); padding: 16px 0; display: flex; flex-direction: column; gap: 8px; }
        .tms-offer-row:first-child { padding-top: 0; }
        .tms-offer-top { display: flex; align-items: center; gap: 10px; }
        .tms-offer-top .tms-provider-name, .tms-offer-top .tms-provider-meta { margin: 0; }
        .tms-offer-terms { margin-left: auto; font-size: 13px; font-weight: 600; }
        .tms-offer-comment { font-size: 12.5px; color: var(--muted); margin: 0; }
        .tms-offer-actions { display: flex; gap: 8px; margin-top: 2px; }
        .tms-select-btn { border: none; border-radius: 9px; background: var(--ink); color: var(--paper); padding: 9px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .tms-decline-btn { border: 1px solid var(--line); background: transparent; border-radius: 9px; padding: 9px 14px; font-size: 12.5px; cursor: pointer; color: var(--muted); }
        .tms-bottombar { padding: 14px 20px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: var(--paper); flex-shrink: 0; }
        .tms-bottombar-hint { margin: 0 0 8px; font-size: 12px; color: var(--muted); text-align: center; }
        .tms-mainbutton { width: 100%; border: none; border-radius: 12px; background: var(--ink); color: var(--paper); padding: 14px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .tms-mainbutton:disabled { background: var(--line); color: var(--muted); cursor: default; }
        .tms-error { color: #B4532F; font-size: 12.5px; margin-top: 8px; }
        .muted { color: var(--muted); font-size: 12.5px; margin-top: 8px; }
        .tms-body-text { font-size: 14px; line-height: 1.5; margin: 0; }

        /* --- Личный кабинет мастера --- */
        .tms-tabbar { display: flex; border-top: 1px solid var(--line); background: var(--card); flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom); }
        .tms-tabbar-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 4px 8px; background: transparent; border: none; cursor: pointer; color: var(--muted); }
        .tms-tabbar-icon { font-size: 18px; }
        .tms-tabbar-label { font-size: 10px; font-weight: 500; }
        .tms-tabbar-item.is-active { color: var(--accent); }
        .tms-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 18px; }
        .tms-stat-card { display: flex; align-items: center; gap: 8px; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px; text-align: left; cursor: default; }
        .tms-stat-card.is-clickable { cursor: pointer; }
        .tms-stat-icon { font-size: 18px; }
        .tms-stat-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .tms-stat-value { font-family: 'Space Grotesk', sans-serif; font-size: 17px; font-weight: 600; }
        .tms-stat-label { font-size: 10.5px; color: var(--muted); }
        .tms-income-card { background: var(--ink); color: var(--paper); border-radius: 16px; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
        .tms-income-card .tms-provider-meta { color: rgba(246,245,242,0.65); }
        .tms-income-value { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 600; }
        .tms-funnel { display: flex; align-items: center; justify-content: space-between; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px 10px; }
        .tms-funnel-step { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .tms-funnel-value { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 600; }
        .tms-funnel-arrow { color: var(--muted); font-size: 12px; }
        .tms-segmented { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
        .tms-segmented-item { flex-shrink: 0; border: 1px solid var(--line); background: var(--card); border-radius: 9px; padding: 8px 12px; font-size: 12px; cursor: pointer; color: var(--ink); display: flex; align-items: center; gap: 5px; }
        .tms-segmented-item.is-active { background: var(--ink); border-color: var(--ink); color: var(--paper); font-weight: 600; }
        .tms-segmented-count { font-size: 10.5px; opacity: 0.7; }
        .tms-order-card { display: flex; align-items: center; gap: 8px; width: 100%; background: transparent; border: none; border-bottom: 1px solid var(--line); padding: 14px 0; cursor: pointer; text-align: left; }
        .tms-order-card:first-child { padding-top: 0; }
        .tms-badge { color: var(--accent); font-size: 16px; line-height: 1; }
        .tms-badge-verify { font-size: 10.5px; font-weight: 600; color: var(--muted); background: var(--paper); border-radius: 8px; padding: 4px 8px; white-space: nowrap; }
        .tms-badge-verify.is-verified { color: var(--accent); }
        .tms-profile-card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
        .tms-profile-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .tms-profile-head > div { flex: 1; min-width: 0; }
        .tms-avatar-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .tms-field-group { display: flex; flex-direction: column; gap: 10px; }
        .tms-field { display: flex; flex-direction: column; gap: 5px; font-size: 11px; color: var(--muted); font-weight: 500; }
        .tms-field-input { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-size: 13.5px; background: var(--card); color: var(--ink); }
        .tms-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 4px 0; font-size: 13px; }
        .tms-toggle-text { display: flex; flex-direction: column; gap: 2px; }
        .tms-toggle-sub { font-size: 11px; color: var(--muted); font-weight: 400; }
        .tms-toggle { width: 38px; height: 22px; border-radius: 11px; border: none; background: var(--line); position: relative; cursor: pointer; flex-shrink: 0; padding: 0; }
        .tms-toggle.is-on { background: var(--accent); }
        .tms-toggle-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left 0.15s; }
        .tms-toggle.is-on .tms-toggle-knob { left: 18px; }
        .tms-review-summary { display: flex; gap: 16px; align-items: center; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
        .tms-review-score { display: flex; flex-direction: column; align-items: center; gap: 2px; flex-shrink: 0; }
        .tms-review-score-value { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; }
        .tms-review-stars { color: #D9A441; font-size: 13px; letter-spacing: 1px; }
        .tms-review-bars { flex: 1; display: flex; flex-direction: column; gap: 5px; }
        .tms-review-bar-row { display: flex; align-items: center; gap: 6px; font-size: 10.5px; }
        .tms-review-row { display: flex; flex-direction: column; gap: 3px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
        .tms-review-row:last-child { border-bottom: none; padding-bottom: 0; }
        .tms-review-top { display: flex; align-items: center; justify-content: space-between; }
        .tms-review-text { font-size: 13px; margin: 0; }
        .tms-inprogress-note { font-size: 11px; color: var(--muted); background: var(--card); border: 1px dashed var(--line); border-radius: 10px; padding: 8px 10px; margin: 4px 0 0; }
        .tms-chat-thread { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
        .tms-chat-bubble { max-width: 78%; border-radius: 14px; padding: 9px 12px; display: flex; flex-direction: column; gap: 3px; }
        .tms-chat-bubble.is-client { align-self: flex-start; background: var(--card); border: 1px solid var(--line); border-bottom-left-radius: 4px; }
        .tms-chat-bubble.is-me { align-self: flex-end; background: var(--ink); color: var(--paper); border-bottom-right-radius: 4px; }
        .tms-chat-text { font-size: 13.5px; margin: 0; }
        .tms-chat-time { font-size: 10px; opacity: 0.6; align-self: flex-end; }
        .tms-chatbar { display: flex; gap: 8px; padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: var(--paper); flex-shrink: 0; }
        .tms-chatbar-input { flex: 1; border: 1px solid var(--line); border-radius: 20px; padding: 10px 14px; font-size: 13.5px; background: var(--card); color: var(--ink); }
        .tms-chatbar-send { width: 38px; height: 38px; border-radius: 50%; border: none; background: var(--ink); color: var(--paper); cursor: pointer; flex-shrink: 0; }
        .tms-chatbar-send:disabled { background: var(--line); color: var(--muted); }
      `}</style>
      <div className="tms-phone">
        <Header title={TITLES[screen]} onBack={showBack ? goBack : null} onClose={goHome} />
        <div className="tms-body">{render()}</div>
        {bottomArea}
      </div>
    </div>
  );
}
