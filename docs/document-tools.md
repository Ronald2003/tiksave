# Document tools and app installation

The downloader remains the homepage. `/tools` links to PDF → Word, Word → PDF, and the PDF editor. These are client-only routes: documents never enter an API route, Supabase, or a conversion service. Libraries load only when a tool is opened. Inputs are limited to 20 MB and outputs to 60 pages; merged inputs share the size limit.

- PDF → Word extracts text using PDF.js and creates a DOCX with `docx`. It preserves text and page separation, not table/column/image layout. Scans require OCR; all-image input fails clearly and empty pages in otherwise readable input are marked.
- Word → PDF accepts DOCX, not legacy DOC. `docx-preview` renders inside a script-disabled, network-blocked sandbox iframe. External relationships and embedded objects are removed first. `html2canvas` captures the rendered pages and `pdf-lib` writes the flattened PDF. Output text is not selectable; fonts and pagination can differ from Word. Expanded ZIP packages have size/count limits.
- The editor previews with PDF.js and saves real PDF edits with `pdf-lib`. Tools add text (standard Latin font), transparent highlights, PNG/JPEG images and drawn signatures; merge PDFs; rotate/remove pages; reorder or split by range. Highlighting is not redaction. Drawn signatures are not cryptographic signatures. One-step undo is available. Pointer placement has a keyboard-accessible percentage-position alternative.

The manifest installs to `/` in standalone mode. Supported browsers show an install prompt after a user click; other browsers show manual home-screen instructions. Service worker caching is deliberately limited to `/offline.html`; it never caches API responses, account pages, download URLs, or user documents. Downloads need internet. Fully offline document tools and app-store distribution are not included.

`npm run dev` and `npm run build` prepare matching local PDF.js worker/font/CMap/WASM assets and third-party notices from installed dependencies. Assets are same-origin; no CDN is required. The document iframe blocks external network access and scripts; the app CSP permits same-origin workers/frames and local blob/data images/fonts needed for rendering.

Verification includes unit checks for file/range validation, PDF edits and external DOCX relationship removal; browser tests inspect generated DOCX XML, render the converted PDF to ensure nonblank output, and re-extract saved annotation text. Installation on physical Android/iOS devices remains a manual check.
