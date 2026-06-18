from flask import Flask, render_template, jsonify, request
import requests
import feedparser
from bs4 import BeautifulSoup
import re
import time

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 300  # 5 minutes in seconds

def parse_feed_content(xml_data):
    feed = feedparser.parse(xml_data)
    releases = []
    
    for entry_idx, entry in enumerate(feed.entries):
        date_str = entry.title  # e.g., "June 17, 2026"
        iso_date = entry.get('updated', '')
        link = entry.link
        
        content_val = ""
        if 'content' in entry and len(entry.content) > 0:
            content_val = entry.content[0].value
        elif 'summary' in entry:
            content_val = entry.summary
            
        if not content_val:
            continue
            
        # Parse the HTML content using BeautifulSoup
        soup = BeautifulSoup(content_val, 'html.parser')
        
        # Google release notes structure:
        # <h3>Category</h3>
        # <p>Content</p>
        headers = soup.find_all(['h3', 'h4'])
        
        if not headers:
            # Treat entire content as one update
            text_content = soup.get_text(strip=True)
            text_content = re.sub(r'\s+', ' ', text_content)
            
            releases.append({
                "id": f"entry_{entry_idx}_0",
                "date": date_str,
                "iso_date": iso_date,
                "category": "General",
                "content_html": str(soup),
                "content_text": text_content,
                "link": link
            })
        else:
            for h_idx, h in enumerate(headers):
                category = h.get_text().strip()
                
                # Gather all siblings until the next h3/h4
                siblings = []
                sibling = h.next_sibling
                while sibling and sibling.name not in ['h3', 'h4']:
                    siblings.append(sibling)
                    sibling = sibling.next_sibling
                
                # Render siblings to HTML
                sibling_soup = BeautifulSoup("", 'html.parser')
                for sib in siblings:
                    import copy
                    # Append a copy to keep DOM structures independent
                    sibling_soup.append(copy.copy(sib))
                
                content_html = str(sibling_soup).strip()
                content_text = sibling_soup.get_text().strip()
                # Clean up white spaces
                content_text = re.sub(r'\s+', ' ', content_text)
                
                # Unique ID for tracking and sharing
                item_id = f"entry_{entry_idx}_{h_idx}"
                
                releases.append({
                    "id": item_id,
                    "date": date_str,
                    "iso_date": iso_date,
                    "category": category,
                    "content_html": content_html,
                    "content_text": content_text,
                    "link": link
                })
                
    return releases

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Check cache
    if not force_refresh and cache["data"] and (current_time - cache["last_fetched"] < CACHE_DURATION):
        return jsonify({
            "source": "cache",
            "last_fetched": cache["last_fetched"],
            "releases": cache["data"]
        })
        
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        releases = parse_feed_content(response.content)
        
        # Update cache
        cache["data"] = releases
        cache["last_fetched"] = current_time
        
        return jsonify({
            "source": "network",
            "last_fetched": current_time,
            "releases": releases
        })
    except Exception as e:
        # If network call fails and we have cache, fallback to cache
        if cache["data"]:
            return jsonify({
                "source": "cache_fallback",
                "last_fetched": cache["last_fetched"],
                "releases": cache["data"],
                "error": str(e)
            })
        return jsonify({
            "error": f"Failed to fetch release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
