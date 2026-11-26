import { Link } from "react-router-dom";
import styles from "./LandingPage.module.scss";

const FEATURES = [
  {
    icon: "◔",
    title: "Track your spending",
    text: "Keep your transactions organized and see where your money goes.",
  },
  {
    icon: "↗",
    title: "Discover insights",
    text: "Spot spending patterns and understand what changes from month to month.",
  },
  {
    icon: "▦",
    title: "Compare your months",
    text: "Explore your financial history and follow your progress over time.",
  },
  {
    icon: "◎",
    title: "Build better habits",
    text: "Use a clearer view of your finances to work toward your personal goals.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Create your account",
    text: "Sign up and set up your personal space. Your financial information belongs to your account.",
  },
  {
    number: "02",
    title: "Add your transactions",
    text: "Record income and expenses, organize them into categories and build your transaction history.",
  },
  {
    number: "03",
    title: "Understand your habits",
    text: "Review summaries, compare months and use insights to make informed choices.",
  },
];

const POINTS = [
  "Personal account for every user",
  "Private financial records",
  "No real account data in the public preview",
];

// Sample figures for the preview. They are fixed and never come from the API.
const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const BARS = [
  { income: 80, expenses: 48 },
  { income: 92, expenses: 58 },
  { income: 73, expenses: 44 },
  { income: 96, expenses: 53 },
  { income: 85, expenses: 38 },
  { income: 90, expenses: 47 },
];
const CATEGORIES = [
  { name: "Housing", amount: "€420", percent: 85 },
  { name: "Food", amount: "€180", percent: 52 },
  { name: "Transport", amount: "€90", percent: 30 },
  { name: "Shopping", amount: "€60", percent: 20 },
];

function cx(...names: Array<string | undefined>) {
  return names.filter(Boolean).join(" ");
}

export default function LandingPage() {
  return (
    <>
      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={cx(styles.container, styles.heroGrid)}>
            <div>
              <span className={styles.eyebrow}>
                PERSONAL FINANCE, MADE SIMPLE
              </span>
              <h1 id="hero-title" className={styles.title}>
                Understand your money. Make smarter decisions.
              </h1>
              <p className={styles.lead}>
                Track your spending, discover financial habits and take control
                of your money — all in one place.
              </p>
              <div className={styles.heroButtons}>
                <Link to="/signup" className={cx(styles.btn, styles.primary)}>
                  Create free account<span aria-hidden="true">&nbsp; →</span>
                </Link>
                <a href="#features" className={cx(styles.btn, styles.secondary)}>
                  Explore features
                </a>
              </div>
              <p className={styles.note}>
                <span aria-hidden="true">✓ &nbsp;</span>A clearer picture of
                your finances starts here.
              </p>
            </div>

            <div
              className={styles.mockup}
              role="img"
              aria-label="Illustrative dashboard preview with sample figures"
            >
              <div className={styles.mockHead}>
                <span>Your monthly overview</span>
                <span className={styles.period}>October 2026⌄</span>
              </div>
              <div className={styles.balance}>
                <small>Available this month · Demo data</small>
                <strong>€2,450.00</strong>
                <span>↑ 12% savings compared with last month</span>
              </div>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <small>↗ Income</small>
                  <strong className={styles.income}>€3,200</strong>
                </div>
                <div className={styles.stat}>
                  <small>↘ Expenses</small>
                  <strong className={styles.expense}>€750</strong>
                </div>
              </div>
              <div className={styles.dashBottom}>
                <div>
                  <div className={styles.dashTitle}>Income &amp; expenses</div>
                  <div className={styles.bars}>
                    {BARS.map(({ income, expenses }, index) => (
                      <div key={MONTHS[index]} className={styles.pair}>
                        <i
                          className={cx(styles.bar, styles.incomeBar)}
                          style={{ height: `${income}%` }}
                        />
                        <i
                          className={cx(styles.bar, styles.expenseBar)}
                          style={{ height: `${expenses}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className={styles.months}>
                    {MONTHS.map((month) => (
                      <span key={month}>{month}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className={styles.dashTitle}>Spending by category</div>
                  <div className={styles.cats}>
                    {CATEGORIES.map(({ name, amount, percent }) => (
                      <div key={name} className={styles.cat}>
                        {name} · {amount}
                        <div className={styles.catLine}>
                          <i style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.demo}>
                Illustrative dashboard preview · Sample figures
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className={styles.content}
          aria-labelledby="features-title"
        >
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <span className={styles.kicker}>Everything in one place</span>
              <h2 id="features-title" className={styles.heading}>
                A better relationship with your money
              </h2>
              <p>
                Simple tools help you understand your spending today and make
                more informed decisions tomorrow.
              </p>
            </div>
            <div className={styles.features}>
              {FEATURES.map(({ icon, title, text }) => (
                <article key={title} className={styles.feature}>
                  <div className={styles.icon} aria-hidden="true">
                    {icon}
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how"
          className={cx(styles.content, styles.how)}
          aria-labelledby="how-title"
        >
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <span className={styles.kicker}>Getting started</span>
              <h2 id="how-title" className={styles.heading}>
                Your finances, in three simple steps
              </h2>
              <p>
                SpendWise is designed to make it easier to get started and keep
                track of what matters.
              </p>
            </div>
            <div className={styles.steps}>
              {STEPS.map(({ number, title, text }) => (
                <article key={number} className={styles.step}>
                  <div className={styles.num} aria-hidden="true">
                    {number}
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="about"
          className={styles.content}
          aria-labelledby="about-title"
        >
          <div className={styles.container}>
            <div className={styles.privacy}>
              <div>
                <span className={styles.kicker}>Your data matters</span>
                <h2 id="about-title" className={styles.heading}>
                  Your finances should stay yours.
                </h2>
                <p>
                  SpendWise is built around personal financial information. The
                  public landing page uses illustrative sample figures only.
                  Once signed in, each user should see only the financial
                  records associated with their own account.
                </p>
              </div>
              <ul className={styles.points}>
                {POINTS.map((point) => (
                  <li key={point} className={styles.point}>
                    <b className={styles.check} aria-hidden="true">
                      ✓
                    </b>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.cta} aria-labelledby="cta-title">
          <div className={styles.container}>
            <h2 id="cta-title" className={styles.heading}>
              Ready to get a clearer view of your money?
            </h2>
            <p>
              Start building a better understanding of your finances with
              SpendWise.
            </p>
            <Link to="/signup" className={cx(styles.btn, styles.ctaButton)}>
              Get started for free<span aria-hidden="true">&nbsp; →</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={cx(styles.container, styles.foot)}>
          <Link to="/" className={styles.brand}>
            <span className={styles.mark} aria-hidden="true">
              S
            </span>
            SpendWise
          </Link>
          <nav aria-label="Footer" className={styles.footLinks}>
            <a href="#about">About</a>
            <a href="#features">Features</a>
          </nav>
          <span className={styles.copy}>© 2026 SpendWise. Demo project.</span>
        </div>
      </footer>
    </>
  );
}
