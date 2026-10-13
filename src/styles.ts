import { css } from "lit";

export const styles = css`
  :host {
    display: block;
    container-type: inline-size;
    color: var(--primary-text-color, #212121);
    font-family: var(
      --ha-font-family-body,
      var(--paper-font-body1_-_font-family, sans-serif)
    );
    font-size: var(--ha-font-size-m, 14px);
    line-height: 1.5;
    --ovapi-muted: var(--secondary-text-color, #595959);
    --ovapi-accent: var(--primary-color, #006b99);
  }
  * {
    box-sizing: border-box;
  }
  ha-card {
    display: block;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: var(--ha-card-border-width, 1px) solid
      var(--ha-card-border-color, var(--divider-color, #ddd));
    border-radius: var(--ha-card-border-radius, 12px);
    box-shadow: var(--ha-card-box-shadow, none);
    overflow: hidden;
  }
  header {
    padding: 20px 20px 12px;
  }
  h2 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 500;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  section {
    padding: 12px 20px 20px;
  }
  section + section {
    border-top: 1px solid var(--divider-color, #ddd);
    padding-top: 20px;
  }
  .status,
  .detail {
    color: var(--ovapi-muted);
    font-size: 0.875rem;
  }
  .status {
    margin: 4px 0 12px;
  }
  .message {
    margin: 8px 0;
    overflow-wrap: anywhere;
  }
  .warning {
    font-weight: 600;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .departure {
    display: grid;
    grid-template-columns: 3.25rem minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
    padding: 14px 0;
  }
  .departure + .departure {
    border-top: 1px solid var(--divider-color, #ddd);
  }
  .line {
    border: 1px solid currentColor;
    border-radius: 6px;
    padding: 4px;
    font-size: 1.05rem;
    font-weight: 700;
    text-align: center;
    overflow-wrap: anywhere;
  }
  .destination {
    font-size: 1rem;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .following,
  .cancellations {
    margin-top: 4px;
    font-variant-numeric: tabular-nums;
  }
  .time {
    text-align: end;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .time strong {
    font-size: 1.2rem;
    font-weight: 600;
  }
  .walking {
    margin: 0 0 4px;
  }
  .leave-time {
    display: block;
  }
  .leave-time strong {
    display: block;
  }
  .cancelled .destination {
    text-decoration: line-through;
  }
  .cancelled-label {
    font-weight: 700;
  }
  .leave {
    margin: 16px 0 12px;
    line-height: 1.2;
    font-size: 1.3rem;
  }
  .leave strong {
    display: block;
    font-size: clamp(2.5rem, 8vw, 3.5rem);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .commute-route {
    display: flex;
    align-items: start;
    gap: 12px;
  }
  .commute-route .line {
    min-width: 3.25rem;
    max-width: 6rem;
  }
  .commute-detail {
    margin: 16px 0 0;
    color: var(--ovapi-muted);
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0 0 20px;
    min-width: 0;
  }
  legend {
    font-weight: 600;
    margin-bottom: 8px;
  }
  label {
    display: block;
    margin: 14px 0 6px;
  }
  input,
  select,
  textarea,
  button {
    font: inherit;
    color: inherit;
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: 1px solid var(--ovapi-muted);
    border-radius: 6px;
  }
  textarea {
    resize: vertical;
  }
  button {
    width: auto;
    cursor: pointer;
  }
  .filters {
    margin-top: 20px;
  }
  .filter-row {
    display: flex;
    align-items: start;
    gap: 8px;
    margin-bottom: 12px;
  }
  .filter-row textarea {
    min-width: 0;
  }
  .choice {
    display: flex;
    gap: 12px;
    align-items: center;
    min-height: 44px;
    margin: 0;
    cursor: pointer;
    overflow-wrap: anywhere;
  }
  .choice input {
    width: 20px;
    height: 20px;
    min-height: 20px;
    flex: 0 0 20px;
    accent-color: var(--ovapi-accent);
  }
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  button:focus-visible {
    outline: 3px solid var(--ovapi-accent);
    outline-offset: 3px;
  }
  input:hover,
  select:hover,
  textarea:hover,
  button:hover {
    border-color: var(--primary-text-color, #212121);
  }
  .editor {
    padding: 16px;
  }
  .error {
    border: 1px solid currentColor;
    padding: 12px;
    overflow-wrap: anywhere;
  }
  @media (max-width: 360px) {
    header {
      padding: 16px 12px 8px;
    }
    section {
      padding: 12px;
    }
    .departure {
      gap: 8px;
      grid-template-columns: 2.75rem minmax(0, 1fr) auto;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
  @container (max-width: 280px) {
    header {
      padding: 16px 12px 8px;
    }
    section {
      padding: 12px;
    }
    .departure {
      grid-template-columns: 2.75rem minmax(0, 1fr);
      gap: 8px;
    }
    .time {
      grid-column: 2;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      text-align: start;
    }
    .time br {
      display: none;
    }
    .commute-route {
      flex-wrap: wrap;
    }
  }
`;
