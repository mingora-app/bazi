import "./style.css";

const boundaryCases = {
  dst: {
    kicker: "America/New_York · 2023-11-05 · 01:30",
    title: "One clock time. Two real instants.",
    body: "Fall-back creates two valid 01:30 timestamps. Choose <code>earlier</code>, <code>later</code>, <code>compatible</code>, or reject ambiguity explicitly.",
    output: "<span>earlier</span><strong>UTC−04:00</strong><span>later</span><strong>UTC−05:00</strong>",
  },
  rollover: {
    kicker: "Kashgar · 2024-02-11 · 00:05",
    title: "Solar correction can change the date.",
    body: "A western longitude inside a wide civil zone can move true solar time into the previous day. The corrected date—not only the corrected hour—feeds the pillars.",
    output: "<span>civil</span><strong>Feb 11 · 00:05</strong><span>solar</span><strong>Feb 10 · 20:55</strong>",
  },
  unknown: {
    kicker: "Birth date known · birth time unavailable",
    title: "Missing data stays missing.",
    body: "The hour pillar returns <code>null</code>. The library checks whether date-based pillars could change during that day and lowers confidence when needed.",
    output: "<span>hour pillar</span><strong>null</strong><span>confidence</span><strong>medium / low</strong>",
  },
  lichun: {
    kicker: "2024-02-04 · solar-term boundary",
    title: "A calendar year is not a BaZi year.",
    body: "Year and month pillars follow solar-term boundaries. Inputs immediately before and after Li Chun are expected to produce different results.",
    output: "<span>before</span><strong>癸卯 · 乙丑</strong><span>after</span><strong>甲辰 · 丙寅</strong>",
  },
} as const;

const tabs = document.querySelectorAll<HTMLButtonElement>("[data-case]");
const kicker = document.querySelector<HTMLElement>("#case-kicker");
const title = document.querySelector<HTMLElement>("#case-title");
const body = document.querySelector<HTMLElement>("#case-body");
const output = document.querySelector<HTMLElement>("#case-output");

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    const key = tab.dataset.case as keyof typeof boundaryCases;
    const content = boundaryCases[key];
    if (!content || !kicker || !title || !body || !output) return;
    for (const candidate of tabs) candidate.setAttribute("aria-selected", String(candidate === tab));
    kicker.textContent = content.kicker;
    title.textContent = content.title;
    body.innerHTML = content.body;
    output.innerHTML = content.output;
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(button.dataset.copy ?? "");
    const original = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => { button.textContent = original; }, 1400);
  });
}

const revealItems = document.querySelectorAll<HTMLElement>(".reveal");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12 });
  for (const item of revealItems) observer.observe(item);
} else {
  for (const item of revealItems) item.classList.add("is-visible");
}
