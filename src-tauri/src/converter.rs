use pulldown_cmark::{html, Parser};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct Notebook {
    pub cells: Vec<Cell>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Cell {
    pub cell_type: String,
    pub source: Source,
    pub outputs: Option<Vec<Output>>,
    pub execution_count: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(untagged)]
pub enum Source {
    String(String),
    Array(Vec<String>),
}

impl Source {
    pub fn to_string(&self) -> String {
        match self {
            Source::String(s) => s.clone(),
            Source::Array(arr) => arr.join(""),
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Output {
    pub output_type: String,
    pub text: Option<Source>,
    pub data: Option<OutputData>,
    pub ename: Option<String>,
    pub evalue: Option<String>,
    pub traceback: Option<Vec<String>>,
    pub execution_count: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OutputData {
    #[serde(rename = "text/plain")]
    pub text_plain: Option<Source>,
    #[serde(rename = "text/html")]
    pub text_html: Option<Source>,
    #[serde(rename = "image/png")]
    pub image_png: Option<String>,
    #[serde(rename = "image/jpeg")]
    pub image_jpeg: Option<String>,
}

pub fn notebook_to_html(notebook_json: &str) -> Result<String, String> {
    let notebook: Notebook =
        serde_json::from_str(notebook_json).map_err(|e| format!("Failed to parse notebook: {}", e))?;

    let mut html_content = String::new();

    html_content.push_str(JUPYTER_HTML_HEAD);

    let mut code_cell_count = 0;

    for (i, cell) in notebook.cells.iter().enumerate() {
        match cell.cell_type.as_str() {
            "markdown" => {
                let source = cell.source.to_string();
                let parser = Parser::new(&source);
                let mut md_html = String::new();
                html::push_html(&mut md_html, parser);
                html_content.push_str(&format!(
                    "<div class=\"cell text_cell\" id=\"cell-{}\">\n<div class=\"inner_cell\">\n<div class=\"text_cell_render rendered_html\">\n{}\n</div>\n</div>\n</div>\n",
                    i, md_html
                ));
            }
            "code" => {
                code_cell_count += 1;
                let source = cell.source.to_string();
                let exec_count = cell.execution_count
                    .as_ref()
                    .and_then(|v| v.as_i64())
                    .map(|n| n.to_string())
                    .unwrap_or_else(|| " ".to_string());

                html_content.push_str(&format!(
                    "<div class=\"cell code_cell\" id=\"cell-{}\">\n",
                    i
                ));

                // Input area with prompt
                html_content.push_str("<div class=\"input\">\n");
                html_content.push_str(&format!(
                    "<div class=\"prompt input_prompt\">In [{}]:</div>\n",
                    exec_count
                ));
                html_content.push_str("<div class=\"inner_cell\">\n<div class=\"input_area\">\n");
                
                // Syntax highlighted code
                let highlighted = syntax_highlight_python(&source);
                html_content.push_str(&format!("<pre>{}</pre>\n", highlighted));
                
                html_content.push_str("</div>\n</div>\n</div>\n");

                // Output area
                if let Some(outputs) = &cell.outputs {
                    for output in outputs {
                        let out_count = output.execution_count
                            .as_ref()
                            .and_then(|v| v.as_i64())
                            .map(|n| n.to_string())
                            .unwrap_or_else(|| " ".to_string());
                        html_content.push_str(&render_output(output, &out_count));
                    }
                }

                html_content.push_str("</div>\n");
            }
            "raw" => {
                let source = cell.source.to_string();
                html_content.push_str(&format!(
                    "<div class=\"cell raw_cell\" id=\"cell-{}\">\n<pre>{}</pre>\n</div>\n",
                    i, html_escape(&source)
                ));
            }
            _ => {}
        }
    }

    html_content.push_str("</div>\n</body>\n</html>");

    Ok(html_content)
}

pub fn notebook_to_html_with_options(
    notebook_json: &str,
    theme: Option<&str>,
    code_theme: Option<&str>,
    author: Option<&str>,
    show_date: bool,
    landscape: bool,
) -> Result<String, String> {
    let notebook: Notebook =
        serde_json::from_str(notebook_json).map_err(|e| format!("Failed to parse notebook: {}", e))?;

    let mut html_content = String::new();

    // Generate themed HTML head with orientation
    let theme_css = get_theme_css_with_orientation(theme.unwrap_or("light"), code_theme.unwrap_or("default"), landscape);
    html_content.push_str(&theme_css);

    // Add header with author and date if specified
    if (author.is_some() && !author.unwrap_or("").is_empty()) || show_date {
        html_content.push_str("<div class=\"pdf-header\">");
        // Author on left (or empty span for spacing)
        if let Some(author_name) = author {
            if !author_name.is_empty() {
                html_content.push_str(&format!("<span class=\"author\">Author: {}</span>", html_escape(author_name)));
            } else {
                html_content.push_str("<span class=\"author\"></span>");
            }
        } else {
            html_content.push_str("<span class=\"author\"></span>");
        }
        // Date on right (or empty span for spacing)
        if show_date {
            let date = chrono::Local::now().format("%B %d, %Y").to_string();
            html_content.push_str(&format!("<span class=\"date\">{}</span>", date));
        } else {
            html_content.push_str("<span class=\"date\"></span>");
        }
        html_content.push_str("</div>");
    }

    for (i, cell) in notebook.cells.iter().enumerate() {
        match cell.cell_type.as_str() {
            "markdown" => {
                let source = cell.source.to_string();
                let parser = pulldown_cmark::Parser::new(&source);
                let mut md_html = String::new();
                pulldown_cmark::html::push_html(&mut md_html, parser);
                html_content.push_str(&format!(
                    "<div class=\"cell text_cell\" id=\"cell-{}\">\n<div class=\"inner_cell\">\n<div class=\"text_cell_render rendered_html\">\n{}\n</div>\n</div>\n</div>\n",
                    i, md_html
                ));
            }
            "code" => {
                let source = cell.source.to_string();
                let highlighted = syntax_highlight_python(&source);
                let exec_count = cell.execution_count
                    .as_ref()
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| " ".to_string());

                html_content.push_str(&format!(
                    "<div class=\"cell code_cell\" id=\"cell-{}\">\n<div class=\"input\">\n<div class=\"prompt input_prompt\">In[{}]:</div>\n<div class=\"inner_cell\">\n<div class=\"input_area\">\n<div class=\"highlight\"><pre>{}</pre></div>\n</div>\n</div>\n</div>\n",
                    i, exec_count, highlighted
                ));

                if let Some(outputs) = &cell.outputs {
                    for output in outputs {
                        html_content.push_str(&render_output(output, &exec_count));
                    }
                }

                html_content.push_str("</div>\n");
            }
            _ => {}
        }
    }

    html_content.push_str("</div>\n</body>\n</html>");

    Ok(html_content)
}

fn get_theme_css(theme: &str, code_theme: &str) -> String {
    get_theme_css_with_orientation(theme, code_theme, false)
}

fn get_theme_css_with_orientation(theme: &str, code_theme: &str, landscape: bool) -> String {
    let base_css = match theme {
        "dark" => DARK_THEME_CSS,
        "solarized" => SOLARIZED_THEME_CSS,
        _ => JUPYTER_HTML_HEAD,
    };
    
    let code_css = match code_theme {
        "monokai" => MONOKAI_CODE_CSS,
        "github" => GITHUB_CODE_CSS,
        "vscode-dark" => VSCODE_DARK_CODE_CSS,
        _ => "",
    };
    
    let mut result = base_css.to_string();
    
    // Replace @page orientation if landscape
    if landscape {
        result = result.replace(
            "size: A4;",
            "size: A4 landscape;"
        );
    }
    
    // Add code theme CSS if specified
    if !code_css.is_empty() {
        result = result.replace("</style>", &format!("{}\n</style>", code_css));
    }
    
    result
}

fn render_output(output: &Output, exec_count: &str) -> String {
    let mut html = String::new();

    match output.output_type.as_str() {
        "stream" => {
            if let Some(text) = &output.text {
                html.push_str("<div class=\"output_wrapper\">\n");
                html.push_str("<div class=\"output\">\n");
                html.push_str("<div class=\"output_area\">\n");
                html.push_str("<div class=\"prompt\"></div>\n");
                html.push_str("<div class=\"output_subarea output_stream output_stdout output_text\">\n");
                html.push_str(&format!("<pre>{}</pre>\n", html_escape(&text.to_string())));
                html.push_str("</div>\n</div>\n</div>\n</div>\n");
            }
        }
        "execute_result" | "display_data" => {
            if let Some(data) = &output.data {
                html.push_str("<div class=\"output_wrapper\">\n");
                html.push_str("<div class=\"output\">\n");
                html.push_str("<div class=\"output_area\">\n");
                
                if output.output_type == "execute_result" {
                    html.push_str(&format!("<div class=\"prompt output_prompt\">Out[{}]:</div>\n", exec_count));
                } else {
                    html.push_str("<div class=\"prompt\"></div>\n");
                }

                if let Some(img) = &data.image_png {
                    let clean_img = img.replace("\n", "").replace(" ", "");
                    html.push_str("<div class=\"output_subarea output_png\">\n");
                    html.push_str(&format!("<img src=\"data:image/png;base64,{}\" />\n", clean_img));
                    html.push_str("</div>\n");
                } else if let Some(img) = &data.image_jpeg {
                    let clean_img = img.replace("\n", "").replace(" ", "");
                    html.push_str("<div class=\"output_subarea output_jpeg\">\n");
                    html.push_str(&format!("<img src=\"data:image/jpeg;base64,{}\" />\n", clean_img));
                    html.push_str("</div>\n");
                } else if let Some(text_html) = &data.text_html {
                    html.push_str("<div class=\"output_subarea output_html rendered_html\">\n");
                    html.push_str(&text_html.to_string());
                    html.push_str("\n</div>\n");
                } else if let Some(text) = &data.text_plain {
                    html.push_str("<div class=\"output_subarea output_text output_result\">\n");
                    html.push_str(&format!("<pre>{}</pre>\n", html_escape(&text.to_string())));
                    html.push_str("</div>\n");
                }

                html.push_str("</div>\n</div>\n</div>\n");
            }
        }
        "error" => {
            let mut error_text = String::new();
            if let Some(traceback) = &output.traceback {
                error_text.push_str(&traceback.join("\n"));
            } else {
                if let Some(ename) = &output.ename {
                    error_text.push_str(ename);
                }
                if let Some(evalue) = &output.evalue {
                    error_text.push_str(&format!(": {}", evalue));
                }
            }
            let clean_error = strip_ansi_codes(&error_text);
            html.push_str("<div class=\"output_wrapper\">\n");
            html.push_str("<div class=\"output\">\n");
            html.push_str("<div class=\"output_area\">\n");
            html.push_str("<div class=\"prompt\"></div>\n");
            html.push_str("<div class=\"output_subarea output_error\">\n");
            html.push_str(&format!("<pre>{}</pre>\n", html_escape(&clean_error)));
            html.push_str("</div>\n</div>\n</div>\n</div>\n");
        }
        _ => {}
    }

    html
}

fn syntax_highlight_python(code: &str) -> String {
    let mut result = String::new();
    let keywords = ["import", "from", "as", "def", "class", "return", "if", "else", "elif", 
                    "for", "while", "in", "not", "and", "or", "True", "False", "None",
                    "try", "except", "finally", "with", "lambda", "yield", "raise", "pass",
                    "break", "continue", "global", "nonlocal", "assert", "del", "is"];
    let builtins = ["print", "len", "range", "str", "int", "float", "list", "dict", "set",
                    "tuple", "bool", "type", "open", "input", "sum", "min", "max", "abs",
                    "round", "sorted", "reversed", "enumerate", "zip", "map", "filter"];

    let mut chars: Vec<char> = code.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];

        // Comments
        if c == '#' {
            let start = i;
            while i < chars.len() && chars[i] != '\n' {
                i += 1;
            }
            let comment: String = chars[start..i].iter().collect();
            result.push_str(&format!("<span class=\"c1\">{}</span>", html_escape(&comment)));
            continue;
        }

        // Strings (single, double, triple quotes)
        if c == '"' || c == '\'' {
            let quote = c;
            let start = i;
            i += 1;
            
            // Check for triple quotes
            let is_triple = i + 1 < chars.len() && chars[i] == quote && chars[i + 1] == quote;
            if is_triple {
                i += 2;
                while i + 2 < chars.len() {
                    if chars[i] == quote && chars[i + 1] == quote && chars[i + 2] == quote {
                        i += 3;
                        break;
                    }
                    i += 1;
                }
            } else {
                while i < chars.len() && chars[i] != quote && chars[i] != '\n' {
                    if chars[i] == '\\' && i + 1 < chars.len() {
                        i += 2;
                    } else {
                        i += 1;
                    }
                }
                if i < chars.len() && chars[i] == quote {
                    i += 1;
                }
            }
            
            let string: String = chars[start..i].iter().collect();
            result.push_str(&format!("<span class=\"s\">{}</span>", html_escape(&string)));
            continue;
        }

        // Numbers
        if c.is_ascii_digit() || (c == '.' && i + 1 < chars.len() && chars[i + 1].is_ascii_digit()) {
            let start = i;
            while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.' || chars[i] == 'e' || chars[i] == 'E' || chars[i] == '_') {
                i += 1;
            }
            let num: String = chars[start..i].iter().collect();
            result.push_str(&format!("<span class=\"mi\">{}</span>", html_escape(&num)));
            continue;
        }

        // Identifiers and keywords
        if c.is_alphabetic() || c == '_' {
            let start = i;
            while i < chars.len() && (chars[i].is_alphanumeric() || chars[i] == '_') {
                i += 1;
            }
            let word: String = chars[start..i].iter().collect();
            
            if keywords.contains(&word.as_str()) {
                result.push_str(&format!("<span class=\"k\">{}</span>", html_escape(&word)));
            } else if builtins.contains(&word.as_str()) {
                result.push_str(&format!("<span class=\"nb\">{}</span>", html_escape(&word)));
            } else if i < chars.len() && chars[i] == '(' {
                result.push_str(&format!("<span class=\"nf\">{}</span>", html_escape(&word)));
            } else {
                result.push_str(&html_escape(&word));
            }
            continue;
        }

        // Operators
        if "=+-*/<>!@%^&|~".contains(c) {
            result.push_str(&format!("<span class=\"o\">{}</span>", html_escape(&c.to_string())));
            i += 1;
            continue;
        }

        // Default
        result.push_str(&html_escape(&c.to_string()));
        i += 1;
    }

    result
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn strip_ansi_codes(s: &str) -> String {
    let re = regex::Regex::new(r"\x1b\[[0-9;]*m").unwrap_or_else(|_| regex::Regex::new("").unwrap());
    re.replace_all(s, "").to_string()
}

const JUPYTER_HTML_HEAD: &str = r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 2cm 2.5cm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
            margin: 0;
            padding: 20px;
        }

        .pdf-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            margin-bottom: 12px;
            border-bottom: 1px solid #ddd;
            color: #666;
            font-size: 9pt;
            page-break-after: avoid;
            break-after: avoid;
        }

        .pdf-header .author {
            text-align: left;
        }

        .pdf-header .date {
            text-align: right;
        }
        
        #notebook-container {
            max-width: 100%;
            margin: 0;
            padding: 0;
        }

        .cell {
            margin-bottom: 16px;
            position: relative;
            page-break-inside: avoid;
        }

        /* Keep code cell and its output together */
        .code_cell {
            page-break-inside: avoid;
        }

        /* Markdown cells */
        .text_cell {
            page-break-inside: avoid;
        }

        .text_cell .rendered_html {
            padding: 8px 0;
        }

        .rendered_html h1 {
            font-size: 1.8em;
            font-weight: bold;
            margin: 0.8em 0 0.4em 0;
            border-bottom: 1px solid #ddd;
            padding-bottom: 0.3em;
            page-break-after: avoid;
        }

        .rendered_html h2 {
            font-size: 1.4em;
            font-weight: bold;
            margin: 0.8em 0 0.4em 0;
            border-bottom: 1px solid #eee;
            padding-bottom: 0.2em;
            page-break-after: avoid;
        }

        .rendered_html h3 {
            font-size: 1.2em;
            font-weight: bold;
            margin: 0.8em 0 0.4em 0;
            page-break-after: avoid;
        }

        .rendered_html h4 {
            font-size: 1.1em;
            font-weight: bold;
            margin: 0.8em 0 0.4em 0;
            page-break-after: avoid;
        }

        .rendered_html p {
            margin: 0.8em 0;
            text-align: justify;
            orphans: 3;
            widows: 3;
        }

        .rendered_html ul, .rendered_html ol {
            margin: 0.8em 0;
            padding-left: 2em;
        }

        .rendered_html li {
            margin: 0.3em 0;
        }

        .rendered_html strong {
            font-weight: bold;
        }

        .rendered_html em {
            font-style: italic;
        }

        .rendered_html code {
            background-color: #f4f4f4;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 0.9em;
        }

        .rendered_html pre {
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 0.9em;
        }

        .rendered_html table {
            border-collapse: collapse;
            margin: 0.8em auto;
            width: auto;
        }

        .rendered_html th, .rendered_html td {
            border: 1px solid #ddd;
            padding: 6px 10px;
            text-align: left;
        }

        .rendered_html th {
            background-color: #f4f4f4;
            font-weight: bold;
        }

        /* Code cells - centered and smaller */
        .code_cell {
            margin: 12px auto;
            max-width: 95%;
        }

        .code_cell .input {
            display: flex;
            align-items: flex-start;
        }

        .prompt {
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 10pt;
            min-width: 60px;
            color: #303F9F;
            text-align: right;
            padding-right: 10px;
            padding-top: 6px;
            flex-shrink: 0;
        }

        .input_prompt {
            color: #303F9F;
            font-weight: bold;
        }

        .output_prompt {
            color: #D84315;
            font-weight: bold;
        }

        .inner_cell {
            flex: 1;
            min-width: 0;
        }

        .input_area {
            background-color: #f7f7f7;
            border: 1px solid #cfcfcf;
            border-radius: 2px;
            padding: 6px 10px;
        }

        .input_area pre {
            margin: 0;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 10pt;
            line-height: 1.4;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        /* Syntax highlighting - Jupyter style */
        .k { color: #008000; font-weight: bold; }  /* Keywords */
        .kn { color: #008000; font-weight: bold; } /* Keyword namespace (import, from) */
        .nb { color: #008000; }                     /* Builtins */
        .nf { color: #0000FF; }                     /* Function names */
        .s, .s1, .s2 { color: #BA2121; }           /* Strings */
        .c1 { color: #408080; font-style: italic; } /* Comments */
        .mi, .mf { color: #666666; }               /* Numbers */
        .o { color: #666666; }                      /* Operators */
        .nn { color: #0000FF; font-weight: bold; } /* Module names */
        .bp { color: #008000; }                     /* Built-in pseudo */

        /* Output area */
        .output_wrapper {
            margin-top: 6px;
            page-break-before: avoid;
        }

        .output {
            display: flex;
            flex-direction: column;
        }

        .output_area {
            display: flex;
            align-items: flex-start;
        }

        .output_subarea {
            flex: 1;
            padding: 6px 0;
            overflow-x: auto;
        }

        .output_text pre {
            margin: 0;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 10pt;
            line-height: 1.4;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .output_png, .output_jpeg {
            text-align: center;
            page-break-inside: avoid;
        }

        .output_png img, .output_jpeg img {
            max-width: 90%;
            height: auto;
            display: block;
            margin: 8px auto;
        }

        .output_html {
            overflow-x: auto;
        }

        .output_html table {
            border-collapse: collapse;
            margin: 0 auto;
        }

        .output_html th, .output_html td {
            border: 1px solid #ddd;
            padding: 5px 8px;
            text-align: left;
            font-size: 10pt;
        }

        .output_html th {
            background-color: #f4f4f4;
        }

        .output_error {
            background-color: #ffdddd;
            border-radius: 4px;
            padding: 6px 10px;
        }

        .output_error pre {
            margin: 0;
            color: #cc0000;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 10pt;
        }

        /* Print styles */
        @media print {
            body {
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            #notebook-container {
                max-width: none;
                padding: 0;
            }
            .cell {
                page-break-inside: avoid;
            }
            .code_cell {
                page-break-inside: avoid;
            }
            .output_wrapper {
                page-break-before: avoid;
            }
            .rendered_html h1, .rendered_html h2, .rendered_html h3, .rendered_html h4 {
                page-break-after: avoid;
            }
        }
    </style>
</head>
<body>
<div id="notebook-container">
"#;

const DARK_THEME_CSS: &str = r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 2cm 2.5cm;
        }

        * { box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #e0e0e0;
            background-color: #1e1e1e;
            margin: 0;
            padding: 0;
        }

        .pdf-header {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            margin-bottom: 12px;
            border-bottom: 1px solid #444;
            color: #888;
            font-size: 9pt;
            page-break-after: avoid;
            break-after: avoid;
        }

        #notebook-container { max-width: 100%; margin: 0; padding: 0; }
        .cell { margin-bottom: 16px; position: relative; page-break-inside: avoid; }
        .code_cell { page-break-inside: avoid; }
        .text_cell { page-break-inside: avoid; }
        .text_cell .rendered_html { padding: 8px 0; }
        .rendered_html h1 { font-size: 1.8em; font-weight: bold; margin: 0.8em 0 0.4em 0; border-bottom: 1px solid #444; padding-bottom: 0.3em; color: #fff; }
        .rendered_html h2 { font-size: 1.4em; font-weight: bold; margin: 0.8em 0 0.4em 0; border-bottom: 1px solid #333; padding-bottom: 0.2em; color: #fff; }
        .rendered_html h3 { font-size: 1.2em; font-weight: bold; margin: 0.6em 0 0.3em 0; color: #fff; }
        .rendered_html p { margin: 0.5em 0; }
        .rendered_html ul, .rendered_html ol { margin: 0.5em 0; padding-left: 2em; }
        .rendered_html li { margin: 0.2em 0; }
        .rendered_html code { background-color: #333; padding: 2px 6px; border-radius: 3px; font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.9em; color: #f8f8f2; }
        .rendered_html pre { background-color: #2d2d2d; padding: 12px; border-radius: 4px; overflow-x: auto; }
        .rendered_html pre code { background: none; padding: 0; }
        .rendered_html blockquote { border-left: 4px solid #666; margin: 0.5em 0; padding-left: 1em; color: #aaa; }
        .rendered_html table { border-collapse: collapse; margin: 0.5em 0; }
        .rendered_html th, .rendered_html td { border: 1px solid #444; padding: 6px 12px; }
        .rendered_html th { background-color: #333; }
        .input { display: flex; margin-bottom: 4px; }
        .prompt { font-family: monospace; font-size: 10pt; color: #888; min-width: 80px; padding-right: 8px; text-align: right; flex-shrink: 0; }
        .input_prompt { color: #4a9eff; }
        .output_prompt { color: #ff6b6b; }
        .inner_cell { flex: 1; min-width: 0; }
        .input_area { background-color: #2d2d2d; border: 1px solid #444; border-radius: 4px; padding: 8px 12px; }
        .highlight pre { margin: 0; font-family: "SFMono-Regular", Consolas, monospace; font-size: 10pt; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; color: #f8f8f2; }
        .k { color: #ff79c6; font-weight: bold; }
        .kn { color: #ff79c6; font-weight: bold; }
        .nb { color: #8be9fd; }
        .nf { color: #50fa7b; }
        .s, .s1, .s2 { color: #f1fa8c; }
        .c1 { color: #6272a4; font-style: italic; }
        .mi, .mf { color: #bd93f9; }
        .o { color: #ff79c6; }
        .nn { color: #8be9fd; font-weight: bold; }
        .bp { color: #8be9fd; }
        .output_wrapper { margin-top: 6px; page-break-before: avoid; }
        .output { display: flex; flex-direction: column; }
        .output_area { display: flex; align-items: flex-start; }
        .output_subarea { flex: 1; min-width: 0; padding: 4px 0; }
        .output_text pre { font-family: "SFMono-Regular", Consolas, monospace; font-size: 10pt; margin: 0; white-space: pre-wrap; word-wrap: break-word; color: #e0e0e0; }
        .output_png img, .output_jpeg img { max-width: 100%; height: auto; }
        .output_error { background-color: #3d1f1f; border-radius: 4px; padding: 8px; }
        .output_error pre { color: #ff6b6b; font-family: monospace; font-size: 9pt; margin: 0; white-space: pre-wrap; }
        @media print {
            body { background-color: #1e1e1e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
<div id="notebook-container">
"#;

const SOLARIZED_THEME_CSS: &str = r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 2cm 2.5cm;
        }

        * { box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #657b83;
            background-color: #fdf6e3;
            margin: 0;
            padding: 0;
        }

        .pdf-header {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            margin-bottom: 12px;
            border-bottom: 1px solid #eee8d5;
            color: #93a1a1;
            font-size: 9pt;
            page-break-after: avoid;
            break-after: avoid;
        }

        #notebook-container { max-width: 100%; margin: 0; padding: 0; }
        .cell { margin-bottom: 16px; position: relative; page-break-inside: avoid; }
        .code_cell { page-break-inside: avoid; }
        .text_cell { page-break-inside: avoid; }
        .text_cell .rendered_html { padding: 8px 0; }
        .rendered_html h1 { font-size: 1.8em; font-weight: bold; margin: 0.8em 0 0.4em 0; border-bottom: 1px solid #eee8d5; padding-bottom: 0.3em; color: #073642; }
        .rendered_html h2 { font-size: 1.4em; font-weight: bold; margin: 0.8em 0 0.4em 0; border-bottom: 1px solid #eee8d5; padding-bottom: 0.2em; color: #073642; }
        .rendered_html h3 { font-size: 1.2em; font-weight: bold; margin: 0.6em 0 0.3em 0; color: #073642; }
        .rendered_html p { margin: 0.5em 0; }
        .rendered_html code { background-color: #eee8d5; padding: 2px 6px; border-radius: 3px; font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.9em; }
        .rendered_html pre { background-color: #eee8d5; padding: 12px; border-radius: 4px; overflow-x: auto; }
        .input { display: flex; margin-bottom: 4px; }
        .prompt { font-family: monospace; font-size: 10pt; color: #93a1a1; min-width: 80px; padding-right: 8px; text-align: right; flex-shrink: 0; }
        .input_prompt { color: #268bd2; }
        .output_prompt { color: #dc322f; }
        .inner_cell { flex: 1; min-width: 0; }
        .input_area { background-color: #eee8d5; border: 1px solid #93a1a1; border-radius: 4px; padding: 8px 12px; }
        .highlight pre { margin: 0; font-family: "SFMono-Regular", Consolas, monospace; font-size: 10pt; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; }
        .k { color: #859900; font-weight: bold; }
        .kn { color: #859900; font-weight: bold; }
        .nb { color: #b58900; }
        .nf { color: #268bd2; }
        .s, .s1, .s2 { color: #2aa198; }
        .c1 { color: #93a1a1; font-style: italic; }
        .mi, .mf { color: #d33682; }
        .o { color: #859900; }
        .nn { color: #268bd2; font-weight: bold; }
        .bp { color: #b58900; }
        .output_wrapper { margin-top: 6px; page-break-before: avoid; }
        .output { display: flex; flex-direction: column; }
        .output_area { display: flex; align-items: flex-start; }
        .output_subarea { flex: 1; min-width: 0; padding: 4px 0; }
        .output_text pre { font-family: "SFMono-Regular", Consolas, monospace; font-size: 10pt; margin: 0; white-space: pre-wrap; word-wrap: break-word; }
        @media print {
            body { background-color: #fdf6e3 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
<div id="notebook-container">
"#;

const MONOKAI_CODE_CSS: &str = r#"
        .highlight pre { background-color: #272822; color: #f8f8f2; }
        .input_area { background-color: #272822; border-color: #49483e; }
        .k { color: #f92672; font-weight: bold; }
        .kn { color: #f92672; font-weight: bold; }
        .nb { color: #66d9ef; }
        .nf { color: #a6e22e; }
        .s, .s1, .s2 { color: #e6db74; }
        .c1 { color: #75715e; font-style: italic; }
        .mi, .mf { color: #ae81ff; }
        .o { color: #f92672; }
        .nn { color: #66d9ef; font-weight: bold; }
"#;

const GITHUB_CODE_CSS: &str = r#"
        .highlight pre { background-color: #f6f8fa; color: #24292e; }
        .input_area { background-color: #f6f8fa; border-color: #e1e4e8; }
        .k { color: #d73a49; font-weight: bold; }
        .kn { color: #d73a49; font-weight: bold; }
        .nb { color: #005cc5; }
        .nf { color: #6f42c1; }
        .s, .s1, .s2 { color: #032f62; }
        .c1 { color: #6a737d; font-style: italic; }
        .mi, .mf { color: #005cc5; }
        .o { color: #d73a49; }
        .nn { color: #005cc5; font-weight: bold; }
"#;

const VSCODE_DARK_CODE_CSS: &str = r#"
        .highlight pre { background-color: #1e1e1e; color: #d4d4d4; }
        .input_area { background-color: #1e1e1e; border-color: #3c3c3c; }
        .k { color: #569cd6; font-weight: bold; }
        .kn { color: #c586c0; font-weight: bold; }
        .nb { color: #4ec9b0; }
        .nf { color: #dcdcaa; }
        .s, .s1, .s2 { color: #ce9178; }
        .c1 { color: #6a9955; font-style: italic; }
        .mi, .mf { color: #b5cea8; }
        .o { color: #d4d4d4; }
        .nn { color: #4ec9b0; font-weight: bold; }
"#;
