<div align="center">

<img src="src-tauri/icons/128x128.png" alt="Jupytify Logo" width="100" />

# Jupytify

**Convert Jupyter Notebooks to PDF with ease**

A beautiful desktop app for converting `.ipynb` files to high-quality PDFs.

[![Release](https://img.shields.io/github/v/release/AleenaTahir1/Jupytify)](https://github.com/AleenaTahir1/Jupytify/releases)
[![Build](https://img.shields.io/github/actions/workflow/status/AleenaTahir1/Jupytify/ci.yml)](https://github.com/AleenaTahir1/Jupytify/actions)
[![License](https://img.shields.io/badge/license-Source%20Available-blue)](LICENSE.txt)

</div>

---

## Why Jupytify?

Converting Jupyter notebooks to PDF shouldn't require complex setups, LaTeX installations, or command-line tools. Jupytify provides a simple, beautiful interface to convert your notebooks with:

- **High-quality output** — Syntax highlighting, proper code formatting, and beautiful markdown rendering
- **Live preview** — See your notebook and PDF preview side by side
- **Edit before converting** — Make quick edits to cells before generating the PDF
- **Conversion history** — Access your previously converted files anytime

---

## Features

- **Drag & drop upload** — Simply drag your `.ipynb` file into the app
- **Multi-document tabs** — Work with multiple notebooks at once
- **Notebook preview** — View and edit your notebook content before conversion
- **PDF preview** — See how your PDF will look before downloading
- **Syntax highlighting** — Beautiful code highlighting for all major languages
- **Markdown rendering** — Full markdown support with proper formatting
- **Auto-open PDF** — Optionally open the PDF automatically after conversion
- **Conversion history** — Track all your conversions with easy re-download
- **Custom titlebar** — Modern, frameless window design
- **Light theme** — Clean, professional interface

---

## Installation

Download the latest release from the [Releases](https://github.com/AleenaTahir1/Jupytify/releases) page:

- **`.msi`** — Standard Windows installer (recommended)
- **`.exe`** — NSIS installer

---

## Usage

### Quick Start

1. **Launch Jupytify** — Open the application
2. **Upload a notebook** — Drag & drop or click to browse for a `.ipynb` file
3. **Preview** — View your notebook content in the preview panel
4. **Convert** — Click "Convert to PDF" to generate the PDF
5. **Download** — Save the PDF to your desired location

### Editing

- Click the **Edit** button in the preview area to enable editing mode
- Make changes to any cell's content
- Click **Reconvert** to generate a new PDF with your changes

### Settings

- **Default Save Location** — Set a default folder for saving PDFs
- **Auto-open PDF** — Automatically open PDFs after conversion

---

## Development

### Requirements

- Node.js 18+
- Rust 1.70+
- Tauri 2 system dependencies

### Run Locally

```bash
git clone https://github.com/AleenaTahir1/Jupytify.git
cd Jupytify
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

### Project Structure

```
Jupytify/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # UI components
│   │   ├── TitleBar.tsx    # Custom window titlebar
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   ├── DocumentTabs.tsx # Multi-document tabs
│   │   ├── FileUpload.tsx  # Drag & drop file upload
│   │   ├── NotebookPreview.tsx  # Notebook content viewer/editor
│   │   ├── PdfPreview.tsx  # PDF preview panel
│   │   └── ConversionProgress.tsx # Conversion status
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Entry point
├── src-tauri/              # Backend (Rust)
│   └── src/
│       ├── lib.rs          # Tauri commands and app setup
│       ├── converter.rs    # Notebook to HTML conversion
│       └── pdf.rs          # HTML to PDF generation
└── package.json
```

---

## Tech Stack

- **Frontend** — React 19, TypeScript, TailwindCSS
- **Backend** — Rust, Tauri 2
- **PDF Generation** — headless_chrome
- **Syntax Highlighting** — syntect
- **Markdown** — pulldown_cmark
- **Build** — Vite

---

## License

This project uses a **Source Available** license. See [LICENSE.txt](LICENSE.txt) for details.

- Free for personal and educational use
- Free to modify for personal use
- Commercial use requires permission

---

## Author

**Aleena Tahir**

- GitHub: [@AleenaTahir1](https://github.com/AleenaTahir1)
- LinkedIn: [aleenatahir](https://www.linkedin.com/in/aleenatahir/)
