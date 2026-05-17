import { Link } from "react-router-dom";
import { COVER_ART } from "../game/manifest";

/**
 * Palette derived directly from public/media/images/coverart.png.
 *
 * The cover art is hue-locked around ~200° (electric blue), with brightness
 * spanning from a near-pure void to an incandescent sword-glow core. These
 * swatches were sampled by bucketing the image's pixels by lightness/
 * saturation and averaging each band.
 */
const COVER_PALETTE: ReadonlyArray<{
  name: string;
  hex: string;
  cssVar: string;
  role: string;
  sampleHex?: string; // raw average from the image, if rounded for design use
}> = [
  { name: "Void",   cssVar: "--void",   hex: "#000000", role: "Stage background · 67% of cover",         sampleHex: "#010406" },
  { name: "Abyss",  cssVar: "--abyss",  hex: "#06121a", role: "Deepest panel · ambient shadow",          sampleHex: "#06121a" },
  { name: "Steel",  cssVar: "--steel",  hex: "#13293a", role: "Surface · borders · subtle separator",    sampleHex: "#132938" },
  { name: "Cobalt", cssVar: "--cobalt", hex: "#204e6f", role: "Raised surface · dim text · mid armor",   sampleHex: "#204e6f" },
  { name: "Glow",   cssVar: "--glow",   hex: "#50a8d6", role: "--accent · default note ring · interactive", sampleHex: "#50a8d6" },
  { name: "Cyan",   cssVar: "--cyan",   hex: "#80d4ee", role: "--accent-2 · hover · focus · links",       sampleHex: "#80d4ee" },
  { name: "Core",   cssVar: "--core",   hex: "#acecfb", role: "--tron · cover start · end screen · HUD",  sampleHex: "#acecfb" },
  { name: "Frost",  cssVar: "--frost",  hex: "#e6f6fb", role: "--text · sword tip · peak highlight",     sampleHex: "#e6f6fb" },
];

/** Functional / state colors retained from the existing system. */
const FUNCTIONAL_COLORS: ReadonlyArray<{ name: string; hex: string; role: string }> = [
  { name: "Perfect", hex: "#ffd24a", role: "Top-tier hit · gold" },
  { name: "Good",    hex: "#5dd0ff", role: "Solid hit · echoes cover-art glow" },
  { name: "Miss",    hex: "#ff5e6c", role: "Missed note · danger" },
];

/**
 * Semantic CSS-variable tokens defined in `src/styles.css`. Each maps onto
 * a cover-art palette swatch above. Values shown here are the resolved
 * hex values for the design-time reference.
 */
const DESIGN_TOKENS: ReadonlyArray<{ token: string; value: string; usage: string; alias?: string }> = [
  { token: "--bg",        value: "#000000", alias: "--void",  usage: "Root background" },
  { token: "--bg-soft",   value: "#06121A", alias: "--abyss", usage: "Subdued background, inputs" },
  { token: "--panel",     value: "#0A1E2C", usage: "Panels, cards (between abyss and steel)" },
  { token: "--panel-2",   value: "#13293A", alias: "--steel", usage: "Raised panels, buttons" },
  { token: "--line",      value: "#1A3D56", usage: "Borders, dividers (steel/cobalt midpoint)" },
  { token: "--text",      value: "#E6F6FB", alias: "--frost", usage: "Primary text" },
  { token: "--text-dim",  value: "#7A96AA", usage: "Secondary text (desaturated cobalt)" },
  { token: "--accent",    value: "#50A8D6", alias: "--glow",  usage: "Default note ring, primary interactive" },
  { token: "--accent-2",  value: "#80D4EE", alias: "--cyan",  usage: "Links, hover, secondary accent" },
  { token: "--tron",      value: "#ACECFB", alias: "--core",  usage: "Cover start, end screen, HUD glow" },
];

function Swatch({
  name,
  hex,
  role,
  sampleHex,
  cssVar,
}: {
  name: string;
  hex: string;
  role: string;
  sampleHex?: string;
  cssVar?: string;
}) {
  const chipBackground = cssVar ? `var(${cssVar})` : hex;
  return (
    <div className="sg-swatch">
      <div className="sg-swatch__chip" style={{ background: chipBackground }} />
      <div className="sg-swatch__meta">
        <div className="sg-swatch__name">{name}</div>
        <div className="sg-swatch__hex">{hex.toUpperCase()}</div>
        {cssVar && <div className="sg-swatch__var"><code>{cssVar}</code></div>}
        <div className="sg-swatch__role">{role}</div>
        {sampleHex && sampleHex.toLowerCase() !== hex.toLowerCase() && (
          <div className="sg-swatch__sample">
            sampled <code>{sampleHex.toUpperCase()}</code>
          </div>
        )}
      </div>
    </div>
  );
}

export function StyleGuideView() {
  return (
    <div className="sg">
      <header className="sg__header">
        <div>
          <h1 className="sg__title">Pilot · Style Guide</h1>
          <p className="sg__sub">
            Palette extracted from <code>coverart.png</code>. Hue locked around 200° electric blue,
            with luminance spanning void to incandescent core.
          </p>
        </div>
        <Link to="/" className="sg__back">Back to game</Link>
      </header>

      <section className="sg__section sg__hero">
        <img src={COVER_ART} alt="Cover art" className="sg__hero-img" />
        <div className="sg__hero-strip" aria-hidden="true">
          {COVER_PALETTE.map((p) => (
            <div key={p.name} className="sg__hero-strip-chip" style={{ background: p.hex }} title={`${p.name} ${p.hex}`} />
          ))}
        </div>
      </section>

      <section className="sg__section">
        <h2 className="sg__h2">Cover Art Palette</h2>
        <p className="sg__lead">
          Sampled and rounded for design use. The favicon is hue-shifted to match the bright core/glow.
        </p>
        <div className="sg__grid">
          {COVER_PALETTE.map((p) => (
            <Swatch key={p.name} {...p} />
          ))}
        </div>
      </section>

      <section className="sg__section">
        <h2 className="sg__h2">Functional Colors</h2>
        <p className="sg__lead">State and feedback colors layered on top of the cover-art base.</p>
        <div className="sg__grid">
          {FUNCTIONAL_COLORS.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>
      </section>

      <section className="sg__section">
        <h2 className="sg__h2">Design Tokens</h2>
        <p className="sg__lead">
          CSS custom properties defined in <code>src/styles.css</code> that the app currently consumes.
        </p>
        <table className="sg__tokens">
          <thead>
            <tr>
              <th>Swatch</th>
              <th>Token</th>
              <th>Maps to</th>
              <th>Value</th>
              <th>Usage</th>
            </tr>
          </thead>
          <tbody>
            {DESIGN_TOKENS.map((t) => (
              <tr key={t.token}>
                <td>
                  <div className="sg-token-chip" style={{ background: `var(${t.token})` }} />
                </td>
                <td><code>{t.token}</code></td>
                <td>{t.alias ? <code>{t.alias}</code> : <span className="sg__tokens-dash">—</span>}</td>
                <td><code>{t.value.toUpperCase()}</code></td>
                <td>{t.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="sg__section">
        <h2 className="sg__h2">Typography</h2>
        <div className="sg__type-stack">
          <div>
            <div className="sg__type-label">Display · letterspaced</div>
            <div className="end__title" style={{ position: "static" }}>PILOT</div>
          </div>
          <div>
            <div className="sg__type-label">H2 · 1.6rem</div>
            <h2 style={{ margin: 0 }}>Sword in hand</h2>
          </div>
          <div>
            <div className="sg__type-label">Body</div>
            <p style={{ margin: 0 }}>
              Strike on the beat. The energy meter rewards precision and punishes drift.
            </p>
          </div>
          <div>
            <div className="sg__type-label">Dim / meta</div>
            <p style={{ margin: 0, color: "var(--text-dim)" }}>
              Tap, hold, release. Letters spaced like the HUD.
            </p>
          </div>
        </div>
      </section>

      <section className="sg__section">
        <h2 className="sg__h2">Buttons</h2>
        <div className="sg__btn-row">
          <button>Default</button>
          <button className="cover__start" style={{ animation: "none" }}>Tron Start</button>
          <button className="end__action" style={{ animation: "none" }}>End Action</button>
          <button className="editor__danger">Danger</button>
        </div>
      </section>

      <section className="sg__section">
        <h2 className="sg__h2">HUD elements</h2>
        <div className="sg__hud-preview">
          <div className="hud__energy">
            <div className="hud__energy-label">Energy</div>
            <div className="hud__energy-track">
              <div className="hud__energy-fill" style={{ width: "62%" }}>
                <div className="hud__energy-shimmer" />
                <div className="hud__energy-edge" />
              </div>
            </div>
          </div>
          <div className="hud__energy hud__energy--low">
            <div className="hud__energy-label">Energy</div>
            <div className="hud__energy-track">
              <div className="hud__energy-fill" style={{ width: "18%" }}>
                <div className="hud__energy-shimmer" />
                <div className="hud__energy-edge" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
