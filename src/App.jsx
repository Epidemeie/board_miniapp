import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "https://api.goservices.lol/api";

const DISTRICTS = ["Ваке", "Сабуртало", "Мтацминда", "Дидубе", "Глдани", "Исани", "Самгори", "Чугурети", "Крцаниси", "Надзаладеви"];
const URGENCY_OPTIONS = ["Срочно, сегодня", "Завтра", "На этой неделе", "Не срочно"];

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
    };
  }
  // Фоллбэк для тестирования вне Telegram (обычный браузер)
  let demoId = sessionStorage.getItem("demo_telegram_id");
  if (!demoId) {
    demoId = "demo-" + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("demo_telegram_id", demoId);
  }
  return { id: demoId, name: "Гость", username: undefined };
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

function BottomBar({ label, onClick, disabled }) {
  if (!label) return null;
  return (
    <div className="tms-bottombar">
      <button className="tms-mainbutton" onClick={onClick} disabled={disabled}>{label}</button>
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

  // ---- Мастер ----
  const [provider, setProvider] = useState(null);
  const [allServices, setAllServices] = useState([]);
  const [providerForm, setProviderForm] = useState({ description: "", priceFrom: "", serviceIds: [], areas: [] });
  const [openRequests, setOpenRequests] = useState([]);
  const [offerTargetRequest, setOfferTargetRequest] = useState(null);
  const [offerForm, setOfferForm] = useState({ price: "", comment: "" });

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

  async function chooseProvider() {
    await withLoading(async () => {
      const existing = await api(`/providers/by-telegram/${tgUser.id}`);
      if (existing) {
        setProvider(existing);
        navigate("provider-home");
        await loadOpenRequests(existing);
      } else {
        const all = await api("/services");
        setAllServices(all);
        navigate("provider-register");
      }
    });
  }

  async function loadOpenRequests(prov) {
    const serviceIds = (prov.services || []).map((s) => s.serviceId ?? s.service?.id).filter(Boolean);
    if (serviceIds.length === 0) return;
    await withLoading(async () => setOpenRequests(await api(`/requests/open?serviceId=${serviceIds.join(",")}`)));
  }

  function toggleProviderArea(area) {
    setProviderForm((f) => ({
      ...f,
      areas: f.areas.includes(area) ? f.areas.filter((a) => a !== area) : [...f.areas, area],
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
      navigate("provider-home");
      await loadOpenRequests(created);
    });
  }

  function toggleProviderService(id) {
    setProviderForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id],
    }));
  }

  function startOffer(request) {
    setOfferTargetRequest(request);
    setOfferForm({ price: "", comment: "" });
    navigate("provider-offer");
  }

  async function submitOffer() {
    await withLoading(async () => {
      await api("/offers", {
        method: "POST",
        body: JSON.stringify({
          requestId: offerTargetRequest.id,
          providerId: provider.id,
          price: Number(offerForm.price),
          comment: offerForm.comment,
        }),
      });
      goBack();
      await loadOpenRequests(provider);
    });
  }

  /* -------------------------- Экраны -------------------------- */

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

  function renderProviderRegister() {
    const ready = providerForm.serviceIds.length > 0 && providerForm.areas.length > 0;
    const groups = [];
    const groupsByCat = {};
    for (const s of allServices) {
      const catId = s.category?.id ?? 0;
      if (!groupsByCat[catId]) {
        groupsByCat[catId] = { id: catId, name: s.category?.name || "Другое", icon: s.category?.icon || "", items: [] };
        groups.push(groupsByCat[catId]);
      }
      groupsByCat[catId].items.push(s);
    }
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
          <p className="tms-section-label">Районы работы</p>
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
        {!ready && <p className="muted">Выберите услугу и хотя бы один район</p>}
      </div>
    );
  }

  function renderProviderHome() {
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">Открытые заявки под вашу услугу</p>
        </div>
        {loading && <p className="muted">Загрузка…</p>}
        <div className="tms-provider-list">
          {openRequests.map((r) => (
            <div key={r.id} className="tms-provider-row">
              <div className="tms-provider-info" style={{ flex: 1 }}>
                <span className="tms-provider-name">{r.service.name}</span>
                <span className="tms-provider-meta">{r.area || "район не указан"} · {r.urgency || "срок не указан"}</span>
                {r.description && <span className="tms-provider-meta">{r.description}</span>}
                {r.budget && <span className="tms-provider-meta">до {r.budget} ₾</span>}
              </div>
              <button className="tms-select-btn" onClick={() => startOffer(r)}>Откликнуться</button>
            </div>
          ))}
        </div>
        {!loading && openRequests.length === 0 && <p className="muted">Подходящих заявок пока нет — загляните позже.</p>}
      </div>
    );
  }

  function renderProviderOffer() {
    if (!offerTargetRequest) return null;
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">Заявка</p>
          <div className="tms-summary-pill">{offerTargetRequest.service.name} · {offerTargetRequest.area}</div>
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Ваша цена (₾)</p>
          <input className="tms-textarea" type="number" placeholder="80"
            value={offerForm.price} onChange={(e) => setOfferForm((f) => ({ ...f, price: e.target.value }))} />
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Комментарий</p>
          <textarea className="tms-textarea" rows={2} placeholder="Когда сможете приехать, что учли"
            value={offerForm.comment} onChange={(e) => setOfferForm((f) => ({ ...f, comment: e.target.value }))} />
        </div>
        {error && <p className="tms-error">{error}</p>}
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
      case "provider-home": return renderProviderHome();
      case "provider-offer": return renderProviderOffer();
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
    "provider-home": "Заявки для вас",
    "provider-offer": "Ваш отклик",
  };

  function bottomBarConfig() {
    switch (screen) {
      case "client-request":
        return { label: loading ? "Отправляю…" : "Отправить заявку", disabled: loading || !(form.district && form.urgency), onClick: submitRequest };
      case "provider-register":
        return { label: loading ? "Регистрирую…" : "Зарегистрироваться", disabled: loading || !(providerForm.serviceIds.length > 0 && providerForm.areas.length > 0), onClick: submitProviderRegister };
      case "provider-offer":
        return { label: loading ? "Отправляю…" : "Отправить отклик", disabled: loading || !offerForm.price, onClick: submitOffer };
      default:
        return null;
    }
  }

  const bb = bottomBarConfig() || {};
  const showBack = history.length > 0;

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
        .tms-mainbutton { width: 100%; border: none; border-radius: 12px; background: var(--ink); color: var(--paper); padding: 14px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .tms-mainbutton:disabled { background: var(--line); color: var(--muted); cursor: default; }
        .tms-error { color: #B4532F; font-size: 12.5px; margin-top: 8px; }
        .muted { color: var(--muted); font-size: 12.5px; margin-top: 8px; }
      `}</style>
      <div className="tms-phone">
        <Header title={TITLES[screen]} onBack={showBack ? goBack : null} onClose={goHome} />
        <div className="tms-body">{render()}</div>
        <BottomBar label={bb.label} disabled={bb.disabled} onClick={bb.onClick} />
      </div>
    </div>
  );
}
