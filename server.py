import http.server
import socketserver
import sqlite3
import json
import os
import urllib.parse
from datetime import datetime

PORT = 8000
DB_FILE = "pixel_fit.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    # Settings table: stores key-value pairs (value as JSON string)
    c.execute('''CREATE TABLE IF NOT EXISTS settings 
                 (key TEXT PRIMARY KEY, value TEXT)''')
    
    # Weight Logs
    c.execute('''CREATE TABLE IF NOT EXISTS weight_logs 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, weight REAL, timestamp INTEGER)''')
    
    # Challenges
    c.execute('''CREATE TABLE IF NOT EXISTS challenges 
                 (id INTEGER PRIMARY KEY, name TEXT, goal INTEGER)''')
    
    # Activity Logs
    c.execute('''CREATE TABLE IF NOT EXISTS activity_logs 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, type TEXT, val REAL, task_id INTEGER, timestamp INTEGER)''')
    
    # Initialize default settings if empty
    c.execute("SELECT key FROM settings WHERE key = 'credits'")
    if not c.fetchone():
        print("Initializing default settings...")
        default_settings = {
            'credits': 0,
            'pet': {'level': 1, 'happiness': 50, 'xp': 0},
            'last_activity': {'title': 'No activity yet', 'time': '--'}
        }
        for k, v in default_settings.items():
            c.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, json.dumps(v)))
    
    conn.commit()
    conn.close()

class PixelFitHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path == '/api/all':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            data = {}
            
            # Fetch Settings
            c.execute("SELECT * FROM settings")
            data['settings'] = {row['key']: json.loads(row['value']) for row in c.fetchall()}
            
            # Fetch Weights
            c.execute("SELECT * FROM weight_logs ORDER BY date")
            data['weight_logs'] = [dict(row) for row in c.fetchall()]
            
            # Fetch Challenges
            c.execute("SELECT * FROM challenges")
            data['challenges'] = [dict(row) for row in c.fetchall()]
            
            # Fetch Activity
            c.execute("SELECT * FROM activity_logs")
            data['activity_logs'] = [dict(row) for row in c.fetchall()]
            
            conn.close()
            self.wfile.write(json.dumps(data).encode())
            return

        # Serve static files
        return super().do_GET()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        body = json.loads(post_data.decode('utf-8'))
        
        parsed = urllib.parse.urlparse(self.path)
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        response = {'status': 'ok'}
        
        try:
            if parsed.path == '/api/settings':
                # Body: { key: "credits", value: 100 } (value can be int or dict)
                key = body.get('key')
                value = json.dumps(body.get('value'))
                c.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
            
            elif parsed.path == '/api/weight':
                # Body: { date: "2023-01-01", weight: 75.5, timestamp: 123456789 }
                c.execute("INSERT INTO weight_logs (date, weight, timestamp) VALUES (?, ?, ?)", 
                          (body.get('date'), body.get('weight'), body.get('timestamp')))
            
            elif parsed.path == '/api/challenge':
                # Body: { id: 123, name: "Pushups", goal: 50 }
                # ID is provided by client to handle optimistic UI, or we can ignore it and let DB autoincrement
                # but for sync consistency, we accept client ID if provided or generate new
                c.execute("INSERT INTO challenges (id, name, goal) VALUES (?, ?, ?)", 
                          (body.get('id'), body.get('name'), body.get('goal')))
                
            elif parsed.path == '/api/challenge/delete':
                # Body: { id: 123 }
                c.execute("DELETE FROM challenges WHERE id = ?", (body.get('id'),))
                
            elif parsed.path == '/api/activity':
                # Body: { date: "...", type: "workout", val: 10, task_id: 123, timestamp: ... }
                c.execute("INSERT INTO activity_logs (date, type, val, task_id, timestamp) VALUES (?, ?, ?, ?, ?)",
                          (body.get('date'), body.get('type'), body.get('val'), body.get('task_id'), body.get('timestamp')))
            
            else:
                self.send_response(404)
                self.end_headers()
                return

            conn.commit()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            conn.rollback()
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
        finally:
            conn.close()

if __name__ == "__main__":
    init_db()
    # Change directory to script location to ensure correct file serving
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), PixelFitHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
