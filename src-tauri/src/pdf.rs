use headless_chrome::{Browser, LaunchOptions, types::PrintToPdfOptions};
use std::fs;
use std::path::Path;
use std::time::Duration;

pub fn html_to_pdf(html_path: &str, pdf_path: &str) -> Result<(), String> {
    html_to_pdf_with_options(html_path, pdf_path, false)
}

pub fn html_to_pdf_with_options(html_path: &str, pdf_path: &str, landscape: bool) -> Result<(), String> {
    let browser = Browser::new(
        LaunchOptions::default_builder()
            .headless(true)
            .build()
            .map_err(|e| format!("Failed to build launch options: {}", e))?,
    )
    .map_err(|e| format!("Failed to launch browser: {}", e))?;

    let tab = browser
        .new_tab()
        .map_err(|e| format!("Failed to create tab: {}", e))?;

    let file_url = format!("file:///{}", html_path.replace('\\', "/"));

    tab.navigate_to(&file_url)
        .map_err(|e| format!("Failed to navigate: {}", e))?;

    tab.wait_until_navigated()
        .map_err(|e| format!("Failed to wait for navigation: {}", e))?;

    // Wait for the content to actually render in the DOM
    tab.wait_for_element("#notebook-container")
        .map_err(|e| format!("Failed to wait for content: {}", e))?;

    // Give the browser a moment to finish rendering (images, layout, etc.)
    std::thread::sleep(Duration::from_millis(500));

    // Swap width/height for landscape
    let (paper_width, paper_height) = if landscape {
        (11.69, 8.27)  // A4 landscape
    } else {
        (8.27, 11.69)  // A4 portrait
    };

    let pdf_options = PrintToPdfOptions {
        landscape: Some(landscape),
        display_header_footer: Some(false),
        print_background: Some(true),
        scale: Some(1.0),
        paper_width: Some(paper_width),
        paper_height: Some(paper_height),
        margin_top: Some(0.79),    // ~2cm in inches
        margin_bottom: Some(0.79), // ~2cm in inches
        margin_left: Some(0.98),   // ~2.5cm in inches
        margin_right: Some(0.98),  // ~2.5cm in inches
        page_ranges: None,
        header_template: None,
        footer_template: None,
        prefer_css_page_size: Some(false),
        transfer_mode: None,
        generate_document_outline: None,
        generate_tagged_pdf: None,
        ignore_invalid_page_ranges: None,
    };

    let pdf_data = tab
        .print_to_pdf(Some(pdf_options))
        .map_err(|e| format!("Failed to generate PDF: {}", e))?;

    fs::write(pdf_path, pdf_data).map_err(|e| format!("Failed to write PDF: {}", e))?;

    Ok(())
}

pub fn copy_file(source: &str, dest: &str) -> Result<(), String> {
    let source_path = Path::new(source);
    let dest_path = Path::new(dest);

    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    fs::copy(source_path, dest_path).map_err(|e| format!("Failed to copy file: {}", e))?;

    Ok(())
}
