// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod schema;
mod db;

use std::path::PathBuf;
use std::sync::Mutex;
use chrono::Utc;
use schema::Snippet;
use db::Database;
use tauri::State;

pub struct AppState {
    db: Mutex<Database>
}

impl AppState {
    pub fn new() -> Result<Self, String> {
        let db_path = PathBuf::from("snippets.db");
        let db = Database::new(&db_path).map_err(|e| e.to_string())?;
        Ok(Self {
            db: Mutex::new(db)
        })
    }
}

#[tauri::command]
async fn get_snippets(state: State<'_, AppState>) -> Result<Vec<Snippet>, String> {
    let db = state.db.lock().unwrap();
    db.get_all_snippets().map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_snippet(
    state: State<'_, AppState>,
    title: String, 
    code: String, 
    language: String, 
    tags: String
) -> Result<i64, String> {
    let db = state.db.lock().unwrap();
    
    let now = Utc::now().to_rfc3339();
    let snippet = Snippet {
        id: None,
        title,
        code,
        language,
        tags,
        created_at: now.clone(),
        updated_at: now,
        is_favorite: false,
    };

    db.create_snippet(&snippet).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_snippet(
    state: State<'_, AppState>,
    id: i32, 
    title: String, 
    code: String, 
    language: String, 
    tags: String
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    
    let now = Utc::now().to_rfc3339();
    let snippet = Snippet {
        id: Some(id),
        title,
        code,
        language,
        tags,
        created_at: "".to_string(), // We don't update created_at
        updated_at: now,
        is_favorite: false,
    };

    db.update_snippet(&snippet).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_snippet(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    db.delete_snippet(id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn search_snippets(state: State<'_, AppState>, query: String) -> Result<Vec<Snippet>, String> {
    let db = state.db.lock().unwrap();
    db.search_snippets(&query).map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_favorite(state: State<'_, AppState>, id: i32) -> Result<bool, String> {
    let db = state.db.lock().unwrap();
    db.toggle_favorite(id).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::new().unwrap())
        .invoke_handler(tauri::generate_handler![
            get_snippets,
            create_snippet,
            update_snippet,
            delete_snippet,
            search_snippets,
            toggle_favorite
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
