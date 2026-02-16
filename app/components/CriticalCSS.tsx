/**
 *  Above-the-fold の最小限クリティカルCSS
 *  globals.css と重複する部分は排除し、初回描画に必要なもののみ保持
 */
export default function CriticalCSS() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
:root {
  --md-outline: rgba(121, 116, 126, 0.38);
  --md-on-surface: #1c1b1f;
  --md-on-surface-variant: #49454f;
  --md-surface-bright: #ffffff;
  --md-surface-container: #f7f2fa;
  --md-surface-container-high: #f0eaf4;
  --md-surface-container-highest: #eae3ed;
}

body {
  background-color: var(--md-surface-bright);
  font-family: "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif;
  color: var(--md-on-surface);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.md-search-form {
  display: flex;
  align-items: stretch;
  position: relative;
  width: 100%;
  min-width: 0;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: #f2f2f2;
  overflow: hidden;
  transition: all 0.2s ease-out;
}

.md-search-form:focus-within {
  border-color: #304d5f;
  box-shadow: 0 0 0 2px rgba(48, 77, 95, 0.2);
}

.md-search-form-input {
  flex: 1 1 0%;
  min-width: 0;
  padding: 0.875rem 1rem;
  border: none;
  border-radius: 0.375rem 0 0 0.375rem;
  outline: none;
  font-size: 1rem;
  background-color: #f2f2f2;
  color: #111827;
  cursor: text;
}

.md-search-form-input::placeholder {
  color: #6b7280;
}

.md-search-form-input:focus::placeholder {
  color: #9ca3af;
}

.md-search-form-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  border: none;
  border-radius: 0 0.375rem 0.375rem 0;
  background-color: #304d5f;
  color: #ffffff;
  transition: all 0.2s ease-out;
  flex-shrink: 0;
}

.md-search-form-button:hover {
  background-color: rgba(48, 77, 95, 0.9);
}

.md-search-form-button:active {
  background-color: rgba(48, 77, 95, 0.88);
}

.md-search-form-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
        `,
      }}
    />
  );
}
