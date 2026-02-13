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

* {
  font-family: "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif;
}
.md-search-form {
  display: flex;
  align-items: stretch;
  position: relative;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: #f2f2f2;
  transition: all 0.2s ease-out;
}

.md-search-form:focus-within {
  border-color: #304d5f;
  box-shadow: 0 0 0 2px rgba(48, 77, 95, 0.2);
}

.md-search-form-input {
  flex: 1 1 0%;
  padding: 0.875rem 1rem;
  border: none;
  border-radius: 0;
  outline: none;
  font-size: 1rem;
  background-color: #f2f2f2;
  color: #111827;
  cursor: text;
}

.md-search-form-input::placeholder {
  color: #6b7280;
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
.text-headline-medium {
  font-size: 1.75rem;
  line-height: 2.25rem;
  font-weight: 700;
}

@media (min-width: 768px) {
  .text-headline-large {
    font-size: 2.25rem;
    line-height: 2.75rem;
  }
}

.text-body-medium {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-gray-600 {
  color: #4b5563;
}

.text-gray-900 {
  color: #111827;
}

.font-bold {
  font-weight: 700;
}

.font-medium {
  font-weight: 500;
}
.min-h-screen {
  min-height: 100vh;
}

.p-4 {
  padding: 1rem;
}

@media (min-width: 768px) {
  .md\\:p-8 {
    padding: 2rem;
  }
}

.max-w-4xl {
  max-width: 56rem;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.text-center {
  text-align: center;
}

.mb-8 {
  margin-bottom: 2rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.flex {
  display: flex;
}

.justify-center {
  justify-content: center;
}

.items-center {
  align-items: center;
}
img {
  max-width: 100%;
  height: auto;
}

.rounded-xl {
  border-radius: 0.75rem;
}

.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.duration-200 {
  transition-duration: 200ms;
}

.ease-out {
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
}

.hover\\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
        `,
      }}
    />
  );
}
