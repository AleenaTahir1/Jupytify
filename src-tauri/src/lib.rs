mod converter;
mod pdf;

use std::fs;
use std::env;

#[derive(serde::Serialize)]
struct ConversionResult {
    pdf_path: String,
    html_path: String,
}

#[tauri::command]
async fn convert_notebook(notebook_bytes: Vec<u8>, file_name: String) -> Result<ConversionResult, String> {
    let notebook_json = String::from_utf8(notebook_bytes)
        .map_err(|e| format!("Invalid UTF-8 in notebook: {}", e))?;

    let html_content = converter::notebook_to_html(&notebook_json)?;

    let temp_path = env::temp_dir().join("jupytify");
    fs::create_dir_all(&temp_path).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    let html_path = temp_path.join("notebook.html");
    let pdf_name = file_name.replace(".ipynb", ".pdf");
    let pdf_path = temp_path.join(&pdf_name);

    fs::write(&html_path, &html_content)
        .map_err(|e| format!("Failed to write HTML: {}", e))?;

    let html_path_str = html_path.to_string_lossy().to_string();
    let pdf_path_str = pdf_path.to_string_lossy().to_string();

    pdf::html_to_pdf(&html_path_str, &pdf_path_str)?;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![convert_notebook, save_pdf, read_html_file, open_pdf_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
