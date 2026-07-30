import React, { useState, useEffect, useMemo } from "react";

/* ---------------------------------------------------------------
   Данные-заглушки (мок-данные) для демонстрации сценария
--------------------------------------------------------------- */

const TELEGRAM_USER = { name: "Ника" };

const CATEGORIES = [
  { id: "repair", icon: "🔧", name: "Ремонт" },
  { id: "cleaning", icon: "🧹", name: "Уборка" },
  { id: "moving", icon: "🚚", name: "Перевозки" },
];

const SERVICES = {
  repair: [
    { id: "plumbing", name: "Сантехника" },
    { id: "electric", name: "Электрика" },
    { id: "appliance", name: "Ремонт техники" },
  ],
  cleaning: [
    { id: "flat", name: "Уборка квартиры" },
    { id: "postrepair", name: "Уборка после ремонта" },
    { id: "regular", name: "Регулярная уборка" },
  ],
  moving: [
    { id: "furniture", name: "Перевозка мебели" },
    { id: "flatmove", name: "Квартирный переезд" },
    { id: "small", name: "Мелкий переезд / доставка" },
  ],
};

const DISTRICTS = ["Ваке", "Сабуртало", "Мтацминда", "Дидубе", "Глдани", "Исани", "Самгори", "Чугурети", "Крцаниси", "Надзаладеви"];

const URGENCY_OPTIONS = ["Срочно, сегодня", "Завтра", "На этой неделе", "Не срочно"];

const FACTORS = [
  { key: "service", label: "Совпадение по услуге", weight: 30 },
  { key: "distance", label: "Расстояние", weight: 20 },
  { key: "price", label: "Цена", weight: 15 },
  { key: "rating", label: "Рейтинг", weight: 15 },
  { key: "reviews", label: "Отзывы", weight: 10 },
  { key: "speed", label: "Скорость ответа", weight: 10 },
];

const PROVIDERS = [
  {
    id: 1, name: "Александр", avatar: "👨‍🔧", rating: 4.9, reviews: 38, district: "Сабуртало",
    priceFrom: 50, responseMin: 5, overall: 96, breakdown: [98, 95, 90, 98, 92, 97],
    bio: "Сантехник с 9-летним опытом. Работаю по Сабуртало и Ваке, приезжаю в тот же день.",
    portfolio: ["🚿", "🔩", "🛁", "🚰"],
    offerComment: "Отремонтирую сегодня, все запчасти уже есть с собой.",
  },
  {
    id: 2, name: "Гиорги", avatar: "🧑‍🔧", rating: 4.7, reviews: 52, district: "Ваке",
    priceFrom: 45, responseMin: 12, overall: 88, breakdown: [95, 70, 85, 90, 88, 75],
    bio: "Универсальный мастер: сантехника и мелкая электрика. Есть отзывы с фото до/после.",
    portfolio: ["🔧", "💡", "🪛", "🧰"],
    offerComment: "Могу подъехать сегодня вечером, работаю аккуратно и не тороплюсь.",
  },
  {
    id: 3, name: "Дато", avatar: "👨‍🔧", rating: 4.8, reviews: 21, district: "Дидубе",
    priceFrom: 60, responseMin: 8, overall: 81, breakdown: [90, 60, 70, 92, 80, 85],
    bio: "Специализируюсь на импортной технике: Bosch, LG, Samsung. Гарантия на работу.",
    portfolio: ["🧊", "🌀", "🔌", "🧊"],
    offerComment: "Уточню модель по фото и сразу назову точную стоимость.",
  },
  {
    id: 4, name: "Ирина", avatar: "👩‍🔧", rating: 4.6, reviews: 64, district: "Глдани",
    priceFrom: 40, responseMin: 20, overall: 74, breakdown: [85, 50, 95, 85, 90, 55],
    bio: "Беру недорого, работаю честно. Много постоянных клиентов в Глдани и Исани.",
    portfolio: ["🧹", "🪣", "🧼", "🧴"],
    offerComment: "Есть опыт с похожими случаями, подробно распишу, что буду делать.",
  },
  {
    id: 5, name: "Нико", avatar: "🧑‍🔧", rating: 4.9, reviews: 15, district: "Сабуртало",
    priceFrom: 55, responseMin: 3, overall: 92, breakdown: [100, 90, 80, 95, 70, 99],
    bio: "Новый на платформе, но с 6-летним опытом в сервисном центре. Отвечаю почти мгновенно.",
    portfolio: ["⚡", "🔧", "🛠️", "📦"],
    offerComment: "Свободен прямо сейчас, живу рядом — могу быть у вас в течение часа.",
  },
];

const REVIEW_TAGS = ["Быстро", "Качественно", "Недорого", "Вежливо"];

/* ---------------------------------------------------------------
   Вспомогательные функции
--------------------------------------------------------------- */

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

/* ---------------------------------------------------------------
   Мелкие переиспользуемые компоненты
--------------------------------------------------------------- */

function Chip({ label, active, onClick }) {
  return (
    <button type="button" className={`tms-chip ${active ? "is-active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function MatchRing({ score, size = 40, stroke = 3 }) {
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
      <text x="50%" y="51%" textAnchor="middle" dominantBaseline="middle" className="tms-matchring-text">
        {score}
      </text>
    </svg>
  );
}

function MatchBreakdown({ breakdown, overall }) {
  const size = 168, stroke = 11, r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
  let angle = -90;
  const segs = FACTORS.map((f, i) => {
    const sweep = (f.weight / 100) * 360;
    const seg = { ...f, start: angle, end: angle + sweep, score: breakdown[i] };
    angle += sweep;
    return seg;
  });
  return (
    <div className="tms-breakdown">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segs.map((seg) => (
          <path
            key={seg.key}
            d={arcPath(cx, cy, r, seg.start + 2, seg.end - 2)}
            stroke="var(--accent)"
            strokeOpacity={0.25 + 0.75 * (seg.score / 100)}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
          />
        ))}
        <text x="50%" y="46%" textAnchor="middle" className="tms-breakdown-overall">{overall}%</text>
        <text x="50%" y="60%" textAnchor="middle" className="tms-breakdown-sub">совпадение</text>
      </svg>
      <div className="tms-legend">
        {segs.map((seg) => (
          <div className="tms-legend-row" key={seg.key}>
            <span className="tms-legend-label">{seg.label}</span>
            <span className="tms-legend-bar-track">
              <span className="tms-legend-bar-fill" style={{ width: `${seg.score}%` }} />
            </span>
            <span className="tms-legend-weight">{seg.weight}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ title, onBack, onClose }) {
  return (
    <div className="tms-header">
      {onBack ? (
        <button className="tms-header-btn" onClick={onBack} aria-label="Назад">←</button>
      ) : (
        <span className="tms-header-spacer" />
      )}
      <span className="tms-header-title">{title}</span>
      <button className="tms-header-btn" onClick={onClose} aria-label="На главную">✕</button>
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

function Stars({ value, onChange }) {
  return (
    <div className="tms-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className="tms-star" onClick={() => onChange(n)} aria-label={`${n} звёзд`}>
          {n <= value ? "●" : "○"}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------
   Основной компонент
--------------------------------------------------------------- */

export default function TbilisiMiniAppPrototype() {
  const [history, setHistory] = useState([]);
  const [screen, setScreen] = useState("home");

  const [form, setForm] = useState({
    categoryId: null, serviceId: null, description: "", district: null, urgency: null, budget: 100,
  });

  const [freeText, setFreeText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const [selectedProviders, setSelectedProviders] = useState([]);
  const [viewedProviderId, setViewedProviderId] = useState(null);
  const [chosenProviderId, setChosenProviderId] = useState(null);

  const [reviewStars, setReviewStars] = useState(0);
  const [reviewTags, setReviewTags] = useState([]);

  function navigate(next) {
    setHistory((h) => [...h, screen]);
    setScreen(next);
  }
  function goBack() {
    setHistory((h) => {
      const copy = [...h];
      const prev = copy.pop();
      if (prev) setScreen(prev);
      return copy;
    });
  }
  function goHome() {
    setHistory([]);
    setScreen("home");
  }

  function pickCategory(catId) {
    setForm((f) => ({ ...f, categoryId: catId, serviceId: null }));
    navigate("services");
  }
  function pickService(serviceId) {
    setForm((f) => ({ ...f, serviceId }));
    navigate("request");
  }
  function toggleProvider(id) {
    setSelectedProviders((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }
  function toggleTag(tag) {
    setReviewTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  const sortedProviders = useMemo(() => [...PROVIDERS].sort((a, b) => b.overall - a.overall), []);
  const viewedProvider = PROVIDERS.find((p) => p.id === viewedProviderId);
  const chosenProvider = PROVIDERS.find((p) => p.id === chosenProviderId);
  const offerProviders = PROVIDERS.filter((p) => selectedProviders.includes(p.id));

  useEffect(() => {
    if (screen === "sent") {
      const t = setTimeout(() => navigate("offers"), 1400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line
  }, [screen]);

  async function parseWithAI() {
    if (!freeText.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content:
                'Ты классификатор заявок для маркетплейса бытовых услуг в Тбилиси (категории: repair, cleaning, moving). ' +
                'По тексту клиента верни ТОЛЬКО валидный JSON без markdown и пояснений, строго в формате: ' +
                '{"category":"repair|cleaning|moving","service":"короткое название конкретной услуги на русском","urgency":"Срочно, сегодня|Завтра|На этой неделе|Не срочно","budget": число_или_null,"description":"короткое переформулированное описание проблемы на русском"}. ' +
                'Текст клиента: "' + freeText.trim() + '"',
            },
          ],
        }),
      });
      const data = await resp.json();
      const textBlock = (data.content || []).map((b) => b.text || "").join("");
      const clean = textBlock.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const category = ["repair", "cleaning", "moving"].includes(parsed.category) ? parsed.category : "repair";
      setForm((f) => ({
        ...f,
        categoryId: category,
        serviceId: null,
        description: parsed.description || freeText.trim(),
        urgency: URGENCY_OPTIONS.includes(parsed.urgency) ? parsed.urgency : f.urgency,
        budget: typeof parsed.budget === "number" ? parsed.budget : f.budget,
      }));
      navigate("request");
    } catch (e) {
      setAiError("Не получилось распознать автоматически — заполните форму вручную ниже.");
    } finally {
      setAiLoading(false);
    }
  }

  const categoryName = form.categoryId ? CATEGORIES.find((c) => c.id === form.categoryId)?.name : null;
  const serviceName =
    form.categoryId && form.serviceId
      ? SERVICES[form.categoryId].find((s) => s.id === form.serviceId)?.name
      : null;

  const requestReady = Boolean(form.categoryId && form.district && form.urgency);

  /* -------------------------- Экраны -------------------------- */

  function renderHome() {
    return (
      <div className="tms-screen">
        <div className="tms-hero">
          <p className="tms-greeting">{TELEGRAM_USER.name}, привет</p>
          <h1 className="tms-hero-title">Кто нужен сегодня?</h1>
        </div>

        <div className="tms-section">
          <textarea
            className="tms-textarea"
            placeholder="Опишите задачу — например, течёт кран в Сабуртало"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={2}
          />
          <button className="tms-ai-btn" onClick={parseWithAI} disabled={aiLoading || !freeText.trim()}>
            {aiLoading ? "Определяю…" : "Подобрать автоматически"}
          </button>
          {aiError && <p className="tms-error">{aiError}</p>}
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Категории</p>
          <div className="tms-cat-grid">
            {CATEGORIES.map((cat) => (
              <button key={cat.id} className="tms-cat-card" onClick={() => pickCategory(cat.id)}>
                <span className="tms-cat-icon">{cat.icon}</span>
                <span className="tms-cat-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderServices() {
    const list = SERVICES[form.categoryId] || [];
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">{categoryName}</p>
          <div className="tms-list">
            {list.map((s) => (
              <button key={s.id} className="tms-list-row" onClick={() => pickService(s.id)}>
                <span>{s.name}</span>
                <span className="tms-chevron">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderRequest() {
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">Услуга</p>
          <div className="tms-summary-pill">
            {categoryName}{serviceName ? ` · ${serviceName}` : ""}
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Описание</p>
          <textarea
            className="tms-textarea"
            rows={2}
            placeholder="Не сливает воду, брызгает при отжиме"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Район</p>
          <div className="tms-chip-wrap">
            {DISTRICTS.map((d) => (
              <Chip key={d} label={d} active={form.district === d} onClick={() => setForm((f) => ({ ...f, district: d }))} />
            ))}
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Срочность</p>
          <div className="tms-chip-wrap">
            {URGENCY_OPTIONS.map((u) => (
              <Chip key={u} label={u} active={form.urgency === u} onClick={() => setForm((f) => ({ ...f, urgency: u }))} />
            ))}
          </div>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Бюджет — до {form.budget} ₾</p>
          <input
            type="range" min={20} max={300} step={5} value={form.budget}
            onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))}
            className="tms-range"
          />
        </div>
      </div>
    );
  }

  function renderResults() {
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">{sortedProviders.length} мастеров · {form.district || "любой район"}</p>
        </div>
        <div className="tms-provider-list">
          {sortedProviders.map((p) => {
            const active = selectedProviders.includes(p.id);
            return (
              <div key={p.id} className="tms-provider-row">
                <button
                  className="tms-provider-main"
                  onClick={() => { setViewedProviderId(p.id); navigate("profile"); }}
                >
                  <span className="tms-provider-avatar">{p.avatar}</span>
                  <span className="tms-provider-info">
                    <span className="tms-provider-name">{p.name}</span>
                    <span className="tms-provider-meta">{p.rating} · {p.reviews} отз. · {p.district}</span>
                    <span className="tms-provider-meta">от {p.priceFrom} ₾ · ~{p.responseMin} мин</span>
                  </span>
                  <MatchRing score={p.overall} />
                </button>
                <button
                  className={`tms-check-toggle ${active ? "is-active" : ""}`}
                  onClick={() => toggleProvider(p.id)}
                  aria-label="Выбрать в заявку"
                >
                  {active ? "✓" : ""}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderProfile() {
    if (!viewedProvider) return null;
    const active = selectedProviders.includes(viewedProvider.id);
    return (
      <div className="tms-screen">
        <div className="tms-profile-head">
          <span className="tms-profile-avatar">{viewedProvider.avatar}</span>
          <h2 className="tms-profile-name">{viewedProvider.name}</h2>
          <p className="tms-profile-meta">{viewedProvider.district} · {viewedProvider.rating} ({viewedProvider.reviews})</p>
          <p className="tms-profile-bio">{viewedProvider.bio}</p>
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Почему подходит</p>
          <MatchBreakdown breakdown={viewedProvider.breakdown} overall={viewedProvider.overall} />
        </div>

        <div className="tms-section">
          <p className="tms-section-label">Портфолио</p>
          <div className="tms-portfolio">
            {viewedProvider.portfolio.map((emoji, i) => (
              <div className="tms-portfolio-tile" key={i}>{emoji}</div>
            ))}
          </div>
        </div>

        <div className="tms-section">
          <button className="tms-toggle-btn" onClick={() => toggleProvider(viewedProvider.id)}>
            {active ? "Убрать из заявки" : "Добавить в заявку"}
          </button>
        </div>
      </div>
    );
  }

  function renderSent() {
    return (
      <div className="tms-screen tms-center-screen">
        <div className="tms-spinner" />
        <p className="tms-sent-title">Заявка отправлена {offerProviders.length} мастерам</p>
        <p className="tms-sent-sub">Ждём предложения по цене и времени</p>
      </div>
    );
  }

  function renderOffers() {
    return (
      <div className="tms-screen">
        <div className="tms-section">
          <p className="tms-section-label">Предложения</p>
        </div>
        <div className="tms-offer-list">
          {offerProviders.map((p) => (
            <div key={p.id} className="tms-offer-row">
              <div className="tms-offer-top">
                <span className="tms-provider-avatar">{p.avatar}</span>
                <div>
                  <p className="tms-provider-name">{p.name}</p>
                  <p className="tms-provider-meta">{p.rating}</p>
                </div>
                <p className="tms-offer-terms">{p.priceFrom + (p.id * 3)} ₾ · {form.urgency || "сегодня"}</p>
              </div>
              <p className="tms-offer-comment">«{p.offerComment}»</p>
              <div className="tms-offer-actions">
                <button
                  className="tms-select-btn"
                  onClick={() => { setChosenProviderId(p.id); navigate("confirmed"); }}
                >
                  Выбрать
                </button>
                <button className="tms-decline-btn" onClick={() => toggleProvider(p.id)}>Отклонить</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderConfirmed() {
    if (!chosenProvider) return null;
    return (
      <div className="tms-screen tms-center-screen">
        <div className="tms-check">✓</div>
        <p className="tms-sent-title">Заказ подтверждён</p>
        <p className="tms-sent-sub">
          {chosenProvider.name} свяжется с вами в Telegram и приедет {form.urgency ? form.urgency.toLowerCase() : "в согласованное время"}
        </p>
      </div>
    );
  }

  function renderReview() {
    if (!chosenProvider) return null;
    return (
      <div className="tms-screen">
        <div className="tms-section tms-center-block">
          <p className="tms-section-label">Оцените {chosenProvider.name}</p>
          <Stars value={reviewStars} onChange={setReviewStars} />
        </div>
        <div className="tms-section">
          <p className="tms-section-label">Что понравилось</p>
          <div className="tms-chip-wrap">
            {REVIEW_TAGS.map((tag) => (
              <Chip key={tag} label={tag} active={reviewTags.includes(tag)} onClick={() => toggleTag(tag)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderThanks() {
    return (
      <div className="tms-screen tms-center-screen">
        <div className="tms-check">✓</div>
        <p className="tms-sent-title">Спасибо за отзыв</p>
        <p className="tms-sent-sub">Он поможет другим клиентам выбрать мастера быстрее</p>
      </div>
    );
  }

  function render() {
    switch (screen) {
      case "home": return renderHome();
      case "services": return renderServices();
      case "request": return renderRequest();
      case "results": return renderResults();
      case "profile": return renderProfile();
      case "sent": return renderSent();
      case "offers": return renderOffers();
      case "confirmed": return renderConfirmed();
      case "review": return renderReview();
      case "thanks": return renderThanks();
      default: return null;
    }
  }

  const TITLES = {
    home: "Мастера · Тбилиси",
    services: "Выбор услуги",
    request: "Новая заявка",
    results: "Подходящие мастера",
    profile: "Профиль",
    sent: "Отправка",
    offers: "Предложения",
    confirmed: "Заказ",
    review: "Отзыв",
    thanks: "Готово",
  };

  function bottomBarConfig() {
    switch (screen) {
      case "request":
        return { label: "Найти мастеров", disabled: !requestReady, onClick: () => navigate("results") };
      case "results":
        return {
          label: selectedProviders.length ? `Отправить заявку (${selectedProviders.length})` : "Выберите мастера",
          disabled: selectedProviders.length === 0,
          onClick: () => navigate("sent"),
        };
      case "profile":
        return null;
      case "confirmed":
        return { label: "Оставить отзыв", onClick: () => navigate("review") };
      case "review":
        return { label: "Отправить отзыв", disabled: reviewStars === 0, onClick: () => navigate("thanks") };
      case "thanks":
        return { label: "На главную", onClick: goHome };
      default:
        return null;
    }
  }

  const bb = bottomBarConfig() || {};
  const showBack = history.length > 0 && screen !== "sent";

  return (
    <div className="tms-root">
      <style>{`
        .tms-root {
          --ink: #14161A;
          --paper: #F6F5F2;
          --card: #FFFFFF;
          --accent: #1F6F5C;
          --accent-ink: #164E41;
          --line: #E4E2DC;
          --muted: #86847C;
          font-family: 'Inter', -apple-system, sans-serif;
          color: var(--ink);
          display: flex;
          justify-content: center;
          padding: 24px 0;
        }
        .tms-root * { box-sizing: border-box; }
        .tms-phone {
          width: 380px;
          max-width: 100%;
          height: 740px;
          background: var(--paper);
          border-radius: 28px;
          border: 1px solid var(--line);
          box-shadow: 0 24px 48px -24px rgba(20,22,26,0.35);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .tms-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 16px; background: var(--paper);
          border-bottom: 1px solid var(--line);
          flex-shrink: 0;
        }
        .tms-header-btn {
          width: 26px; height: 26px; border-radius: 8px; border: none;
          background: transparent; color: var(--muted); font-size: 15px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .tms-header-spacer { width: 26px; }
        .tms-header-title {
          font-weight: 600; font-size: 13px; letter-spacing: 0.01em; color: var(--muted);
          text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em;
        }
        .tms-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        .tms-screen { padding: 20px 20px 32px; display: flex; flex-direction: column; gap: 2px; }
        .tms-hero { padding: 4px 0 8px; }
        .tms-greeting { font-size: 13px; color: var(--muted); margin: 0 0 4px; }
        .tms-hero-title {
          font-family: 'Space Grotesk', 'Inter', sans-serif;
          font-size: 26px; font-weight: 600; margin: 0; line-height: 1.2; letter-spacing: -0.01em;
        }
        .tms-section { margin-top: 24px; }
        .tms-section-label {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--muted); margin: 0 0 10px; font-weight: 500;
        }
        .tms-textarea {
          width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px;
          font-family: 'Inter', sans-serif; font-size: 14px; resize: none; background: var(--card); color: var(--ink);
        }
        .tms-textarea:focus { outline: 1.5px solid var(--accent); outline-offset: 1px; }
        .tms-ai-btn {
          margin-top: 8px; width: 100%; border: none; background: var(--ink);
          color: var(--paper); padding: 11px; border-radius: 12px; font-weight: 600; font-size: 13px; cursor: pointer;
        }
        .tms-ai-btn:disabled { opacity: 0.35; cursor: default; }
        .tms-error { color: var(--muted); font-size: 12px; margin-top: 8px; }
        .tms-cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .tms-cat-card {
          text-align: center; background: var(--card); border: 1px solid var(--line);
          border-radius: 14px; padding: 16px 6px; cursor: pointer; display: flex; flex-direction: column;
          align-items: center; gap: 8px;
        }
        .tms-cat-icon { font-size: 20px; }
        .tms-cat-name { font-size: 12.5px; font-weight: 500; }
        .tms-list { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--card); }
        .tms-list-row {
          display: flex; justify-content: space-between; align-items: center; padding: 15px 16px;
          border-bottom: 1px solid var(--line); background: transparent; border-left: none; border-right: none; border-top: none;
          font-size: 14px; cursor: pointer; color: var(--ink); text-align: left;
        }
        .tms-list-row:last-child { border-bottom: none; }
        .tms-chevron { color: var(--muted); }
        .tms-summary-pill {
          display: inline-block; background: var(--card); border: 1px solid var(--line); border-radius: 10px;
          padding: 9px 14px; font-size: 13px; font-weight: 500;
        }
        .tms-chip-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
        .tms-chip {
          border: 1px solid var(--line); background: var(--card); border-radius: 8px; padding: 8px 13px;
          font-size: 12.5px; cursor: pointer; color: var(--ink); font-family: 'Inter', sans-serif;
        }
        .tms-chip.is-active { background: var(--ink); border-color: var(--ink); color: var(--paper); font-weight: 600; }
        .tms-range { width: 100%; accent-color: var(--ink); }
        .tms-provider-list { display: flex; flex-direction: column; }
        .tms-provider-row {
          display: flex; align-items: center; gap: 8px;
          border-bottom: 1px solid var(--line); padding: 12px 0;
        }
        .tms-provider-row:first-child { padding-top: 0; }
        .tms-provider-main {
          flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 0; background: transparent;
          border: none; cursor: pointer; text-align: left;
        }
        .tms-provider-avatar { font-size: 22px; flex-shrink: 0; }
        .tms-provider-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .tms-provider-name { font-size: 14px; font-weight: 600; }
        .tms-provider-meta { font-size: 11px; color: var(--muted); }
        .tms-check-toggle {
          width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--line); background: var(--card);
          color: var(--paper); font-size: 12px; cursor: pointer; flex-shrink: 0;
        }
        .tms-check-toggle.is-active { background: var(--ink); border-color: var(--ink); }
        .tms-matchring-text { font-size: 11px; font-weight: 600; fill: var(--ink); }
        .tms-profile-head { text-align: center; padding: 8px 4px 4px; }
        .tms-profile-avatar { font-size: 38px; }
        .tms-profile-name { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 600; margin: 8px 0 2px; }
        .tms-profile-meta { font-size: 12px; color: var(--muted); margin: 0 0 10px; }
        .tms-profile-bio { font-size: 13px; line-height: 1.5; margin: 0 auto; max-width: 290px; color: var(--ink); }
        .tms-breakdown { display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .tms-breakdown-overall { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 600; fill: var(--ink); }
        .tms-breakdown-sub { font-size: 9.5px; fill: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .tms-legend { width: 100%; display: flex; flex-direction: column; gap: 9px; }
        .tms-legend-row { display: flex; align-items: center; gap: 8px; font-size: 11.5px; }
        .tms-legend-label { width: 108px; flex-shrink: 0; color: var(--ink); }
        .tms-legend-bar-track { flex: 1; height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; }
        .tms-legend-bar-fill { display: block; height: 100%; background: var(--accent); border-radius: 2px; }
        .tms-legend-weight { width: 26px; text-align: right; color: var(--muted); flex-shrink: 0; }
        .tms-portfolio { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .tms-portfolio-tile { background: var(--card); border: 1px solid var(--line); border-radius: 10px; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .tms-toggle-btn { width: 100%; background: var(--ink); color: var(--paper); border: none; border-radius: 12px; padding: 13px; font-weight: 600; font-size: 13.5px; cursor: pointer; }
        .tms-center-screen { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; padding: 40px 30px; }
        .tms-center-block { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .tms-spinner {
          width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--ink);
          animation: tms-spin 0.9s linear infinite;
        }
        @keyframes tms-spin { to { transform: rotate(360deg); } }
        .tms-check { font-size: 28px; color: var(--accent); }
        .tms-sent-title { font-family: 'Space Grotesk', sans-serif; font-size: 16.5px; font-weight: 600; margin: 4px 0 0; }
        .tms-sent-sub { font-size: 12.5px; color: var(--muted); max-width: 250px; }
        .tms-offer-list { display: flex; flex-direction: column; }
        .tms-offer-row { border-bottom: 1px solid var(--line); padding: 16px 0; display: flex; flex-direction: column; gap: 8px; }
        .tms-offer-row:first-child { padding-top: 0; }
        .tms-offer-top { display: flex; align-items: center; gap: 10px; }
        .tms-offer-top .tms-provider-name, .tms-offer-top .tms-provider-meta { margin: 0; }
        .tms-offer-terms { margin-left: auto; font-size: 13px; font-weight: 600; }
        .tms-offer-comment { font-size: 12.5px; color: var(--muted); margin: 0; }
        .tms-offer-actions { display: flex; gap: 8px; margin-top: 2px; }
        .tms-select-btn { border: none; border-radius: 9px; background: var(--ink); color: var(--paper); padding: 9px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .tms-decline-btn { flex: 0; border: 1px solid var(--line); background: transparent; border-radius: 9px; padding: 9px 14px; font-size: 12.5px; cursor: pointer; color: var(--muted); }
        .tms-stars { display: flex; gap: 8px; font-size: 22px; color: var(--ink); }
        .tms-star { background: none; border: none; cursor: pointer; padding: 0; line-height: 1; color: inherit; }
        .tms-bottombar { padding: 14px 20px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: var(--paper); flex-shrink: 0; }
        .tms-mainbutton { width: 100%; border: none; border-radius: 12px; background: var(--ink); color: var(--paper); padding: 14px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
        .tms-mainbutton:disabled { background: var(--line); color: var(--muted); cursor: default; }
      `}</style>
      <div className="tms-phone">
        <Header
          title={TITLES[screen]}
          onBack={showBack ? goBack : null}
          onClose={goHome}
        />
        <div className="tms-body">{render()}</div>
        <BottomBar label={bb.label} disabled={bb.disabled} onClick={bb.onClick} />
      </div>
    </div>
  );
}
