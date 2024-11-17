use rusqlite::{Connection, Result};
use std::path::Path;
use crate::schema::Snippet;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS snippets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                code TEXT NOT NULL,
                language TEXT NOT NULL,
                tags TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_favorite BOOLEAN NOT NULL DEFAULT 0
            )",
            [],
        )?;

        Ok(Database { conn })
    }

    pub fn create_snippet(&self, snippet: &Snippet) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO snippets (title, code, language, tags, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (
                &snippet.title,
                &snippet.code,
                &snippet.language,
                &snippet.tags,
                &snippet.created_at,
                &snippet.updated_at,
            ),
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_all_snippets(&self) -> Result<Vec<Snippet>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, code, language, tags, created_at, updated_at FROM snippets"
        )?;
        
        let snippets = stmt.query_map([], |row| {
            Ok(Snippet {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                code: row.get(2)?,
                language: row.get(3)?,
                tags: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                is_favorite: row.get(7)?,
            })
        })?;

        snippets.collect()
    }

    pub fn update_snippet(&self, snippet: &Snippet) -> Result<()> {
        self.conn.execute(
            "UPDATE snippets 
             SET title = ?1, code = ?2, language = ?3, tags = ?4, updated_at = ?5 
             WHERE id = ?6",
            (
                &snippet.title,
                &snippet.code,
                &snippet.language,
                &snippet.tags,
                &snippet.updated_at,
                &snippet.id,
            ),
        )?;
        Ok(())
    }

    pub fn delete_snippet(&self, id: i32) -> Result<()> {
        self.conn.execute("DELETE FROM snippets WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn search_snippets(&self, query: &str) -> Result<Vec<Snippet>> {
        let search_pattern = format!("%{}%", query);
        let mut stmt = self.conn.prepare(
            "SELECT id, title, code, language, tags, created_at, updated_at 
             FROM snippets 
             WHERE title LIKE ?1 OR code LIKE ?1 OR tags LIKE ?1"
        )?;
        
        let snippets = stmt.query_map([&search_pattern], |row| {
            Ok(Snippet {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                code: row.get(2)?,
                language: row.get(3)?,
                tags: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                is_favorite: row.get(7)?,
            })
        })?;

        snippets.collect()
    }

    pub fn toggle_favorite(&self, id: i32) -> Result<bool> {
        let mut stmt = self.conn.prepare(
            "UPDATE snippets SET is_favorite = NOT is_favorite WHERE id = ? RETURNING is_favorite"
        )?;
        let new_status: bool = stmt.query_row([id], |row| row.get(0))?;
        Ok(new_status)
    }
}