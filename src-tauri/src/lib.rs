mod converter;
mod pdf;

use std::fs;
use std::env;
use tauri::Manager;
use tauri::image::Image;

#[derive(serde::Serialize)]
struct ConversionResult {
    pdf_path: String,
    html_path: String,
}

#[derive(serde::Deserialize, Default)]
struct PdfOptions {
    orientation: Option<String>,
    theme: Option<String>,
    code_theme: Option<String>,
    author: Option<String>,
    show_date: Option<bool>,
}

#[tauri::command]
async fn convert_notebook(
    notebook_bytes: Vec<u8>, 
    file_name: String,
    options: Option<PdfOptions>
) -> Result<ConversionResult, String> {
    let notebook_json = String::from_utf8(notebook_bytes)
        .map_err(|e| format!("Invalid UTF-8 in notebook: {}", e))?;

    let opts = options.unwrap_or_default();
    let is_landscape = opts.orientation.as_deref() == Some("landscape");
    let html_content = converter::notebook_to_html_with_options(
        &notebook_json,
        opts.theme.as_deref(),
        opts.code_theme.as_deref(),
        opts.author.as_deref(),
        opts.show_date.unwrap_or(false),
        is_landscape,
    )?;

    let temp_path = env::temp_dir().join("jupytify");
    fs::create_dir_all(&temp_path).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    let base_name = file_name.replace(".ipynb", "");
    let html_path = temp_path.join(format!("{}.html", base_name));
    let pdf_path = temp_path.join(format!("{}.pdf", base_name));

    fs::write(&html_path, &html_content)
        .map_err(|e| format!("Failed to write HTML: {}", e))?;

    let html_path_str = html_path.to_string_lossy().to_string();
    let pdf_path_str = pdf_path.to_string_lossy().to_string();

    let is_landscape = opts.orientation.as_deref() == Some("landscape");
    pdf::html_to_pdf_with_options(&html_path_str, &pdf_path_str, is_landscape)?;

    Ok(ConversionResult {
        pdf_path: pdf_path_str,
        html_path: html_path_str,
    })
}

#[tauri::command]
async fn save_pdf(source_path: String, dest_path: String) -> Result<(), String> {
    pdf::copy_file(&source_path, &dest_path)
}

#[tauri::command]
async fn read_html_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read HTML file: {}", e))
}

#[tauri::command]
async fn open_pdf_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to open PDF: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open PDF: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open PDF: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn open_html_in_browser(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to open in browser: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open in browser: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open in browser: {}", e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Set window icon for taskbar (especially needed in dev mode)
            if let Some(window) = app.get_webview_window("main") {
                let icon = Image::from_bytes(include_bytes!("../icons/icon.png"))?;
                window.set_icon(icon)?;
            }
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![convert_notebook, save_pdf, read_html_file, open_pdf_file, open_html_in_browser])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
