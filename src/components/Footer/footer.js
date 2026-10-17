import { MODEL_ID } from "../../services/aiDetector";
import "./footer.css";

const TICKER_WORDS = ["Authentic", "Synthetic", "Captured", "Generated"];

export default function Footer() {
  return (
    <footer className="footer">
      <span className="footer__privacy">100% on-device</span>

      <div className="footer__ticker" aria-hidden="true">
        <div className="footer__track">
          {[0, 1].map((copy) => (
            <span className="footer__group" key={copy}>
              {[...TICKER_WORDS, ...TICKER_WORDS].map((word, index) => (
                <span key={index}>
                  {word}
                  <i className="footer__mark" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <span className="footer__meta" title="Results are probabilistic, not proof.">
        {MODEL_ID}
      </span>
    </footer>
  );
}
