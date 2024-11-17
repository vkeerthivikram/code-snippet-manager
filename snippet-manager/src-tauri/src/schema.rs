use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Snippet {
    pub id: Option<i32>,
    pub title: String,
    pub code: String,
    pub language: String,
    pub tags: String,
    pub is_favorite: bool,
    pub created_at: String,
    pub updated_at: String,
}