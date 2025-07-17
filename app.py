import os
import json
import logging
import re
from datetime import datetime, timedelta
import urllib.request
import urllib.parse
import base64
import webbrowser
import threading
import os

from gevent import monkey

monkey.patch_all()

from flask import Flask, render_template, request
from flask_socketio import SocketIO
import openai
from sec_api import QueryApi
import websocket

# --- Initial Setup ---
logging.getLogger("werkzeug").setLevel(logging.ERROR)
logging.getLogger("engineio").setLevel(logging.ERROR)
logging.getLogger("socketio").setLevel(logging.ERROR)
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [%(levelname)s] %(message)s')

# --- API Keys from Environment Variables ---
SEC_API_KEY = os.getenv('SEC_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

if not SEC_API_KEY:
    raise ValueError("SEC_API_KEY environment variable is required")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

# --- Initialize App ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret-key-for-testing'
socketio = SocketIO(app, async_mode='gevent', cors_allowed_origins="*")

# --- Global State Management ---
ws_state = {"thread": None, "ws_app": None, "is_monitoring": False}


# --- Backend Logic ---

def fetch_and_strip_html_from_url(url, sid):
    try:
        socketio.emit('log_message', {'message': f'🌎 Fetching content from: {url}', 'level': 'info'}, room=sid)
        headers = {'User-Agent': 'NAVHunter myemail@example.com'}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as response:
            html_content = response.read().decode('utf-8', errors='ignore')
        socketio.emit('log_message', {'message': '🧼 Stripping HTML and cleaning text...', 'level': 'info'}, room=sid)
        text = re.sub(r'<(script|style).*?>.*?</\1>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', '', text)
        text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace(
            '&#149;', '•').replace('&#151;', '—')
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n', text)
        text = text.strip()
        socketio.emit('log_message',
                      {'message': f'✓ Content processed successfully ({len(text)} chars).', 'level': 'info'}, room=sid)
        return text
    except urllib.error.HTTPError as e:
        logging.error(f"HTTP Error fetching URL {url}: {e.code} {e.reason}")
        socketio.emit('log_message',
                      {'message': f'❌ HTTP Error {e.code} fetching URL. Check User-Agent header. ({url})',
                       'level': 'error'}, room=sid)
        return ""
    except Exception as e:
        logging.error(f"Failed to fetch or process URL {url}: {e}")
        socketio.emit('log_message', {'message': f'❌ Error fetching/processing {url}: {e}', 'level': 'error'}, room=sid)
        return ""


def get_press_release_text(html_url, sid):
    if not html_url:
        return ""

    press_release_text = ""
    try:
        socketio.emit('log_message', {'message': f'📄 Scanning for Press Release link in: {html_url}', 'level': 'info'},
                      room=sid)
        headers = {'User-Agent': 'NAVHunter myemail@example.com'}
        req = urllib.request.Request(html_url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as response:
            html_content = response.read().decode('utf-8', errors='ignore')

        match = re.search(r'<a\s+[^>]*?href="([^"]+)"[^>]*>.*?(Press Release|EX-99).*?</a>', html_content,
                          re.IGNORECASE | re.DOTALL)

        if match:
            press_release_relative_url = match.group(1)
            press_release_full_url = urllib.parse.urljoin(html_url, press_release_relative_url)
            socketio.emit('log_message',
                          {'message': f'🔗 Found Press Release link: {press_release_full_url}', 'level': 'info'},
                          room=sid)

            press_release_text = fetch_and_strip_html_from_url(press_release_full_url, sid)

            if press_release_text:
                socketio.emit('log_message',
                              {'message': f'✓ Press Release content loaded ({len(press_release_text)} chars).',
                               'level': 'info'}, room=sid)
            else:
                socketio.emit('log_message',
                              {'message': '⚠️ Found Press Release link, but failed to extract text.', 'level': 'warn'},
                              room=sid)
        else:
            socketio.emit('log_message', {'message': 'ⓘ No Press Release link found on the page.', 'level': 'info'},
                          room=sid)

    except Exception as e:
        logging.error(f"Failed to get press release from {html_url}: {e}")
        socketio.emit('log_message', {'message': f'❌ Error processing press release: {e}', 'level': 'error'}, room=sid)

    return press_release_text


def generate_speech_audio(text_to_speak, sid, api_key):
    try:
        socketio.emit('ai_log_message', {'message': f'🎤 Generating speech for: "{text_to_speak}"', 'level': 'info'},
                      room=sid)
        client = openai.OpenAI(api_key=api_key)
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text_to_speak,
            response_format="mp3"
        )
        audio_content = response.content
        base64_audio = base64.b64encode(audio_content).decode('utf-8')
        socketio.emit('ai_log_message', {'message': '✓ Speech generated.', 'level': 'info'}, room=sid)
        return base64_audio
    except Exception as e:
        logging.error(f"OpenAI TTS failed: {e}")
        socketio.emit('ai_log_message', {'message': f'❌ OpenAI TTS failed: {e}', 'level': 'error'}, room=sid)
        return None


def analyze_with_chatgpt(content, company, ticker, form_type, user_config, sid):
    final_prompt = user_config['aiPrompt'].replace('{company}', company).replace('{ticker}', ticker).replace(
        '{formType}', form_type)
    request_content = final_prompt + f"\n\nFILING CONTENT TO ANALYZE:\n{content[:12000]}..."
    api_key_to_use = user_config.get('openaiApiKey') or OPENAI_API_KEY
    try:
        if not api_key_to_use: raise ValueError("OpenAI API key is missing.")
        client = openai.OpenAI(api_key=api_key_to_use)
        socketio.emit('ai_log_message',
                      {'message': f'🤖 Analyzing {company} ({ticker}) using {user_config["aiModel"]}...',
                       'level': 'analysis'}, room=sid)
        response = client.chat.completions.create(
            model=user_config['aiModel'],
            messages=[{"role": "user", "content": request_content}],
            max_tokens=500,
            temperature=float(user_config['aiTemperature'])
        )
        raw_response = response.choices[0].message.content
        cleaned_response = raw_response.strip().replace("```json", "").replace("```", "")
        analysis = json.loads(cleaned_response)
        details = {'request': request_content, 'response': raw_response}
        socketio.emit('ai_log_message',
                      {'message': f'📊 Analysis complete: {analysis.get("confidenceScore", "N/A")}% confidence',
                       'level': 'hit', 'details': details}, room=sid)
        return analysis
    except Exception as e:
        logging.error(f"ChatGPT analysis failed for {ticker}: {e}")
        details = {'request': request_content, 'response': str(e)}
        socketio.emit('ai_log_message',
                      {'message': f'❌ ChatGPT analysis failed: {e}', 'level': 'error', 'details': details}, room=sid)
        return None


def generate_and_send_audio(text_to_speak, openai_api_key, sid):
    audio_b64 = generate_speech_audio(text_to_speak, sid, openai_api_key)
    if audio_b64:
        socketio.emit('play_tts_audio', {'audioB64': audio_b64}, room=sid)


def process_filing(filing_data, user_config, sid):
    socketio.emit('update_stats', {'processed': 1}, room=sid)
    ticker, form_type = filing_data.get('ticker', 'N/A'), filing_data.get('formType', 'N/A')

    content = fetch_and_strip_html_from_url(filing_data.get('linkToTxt'), sid)
    press_release_content = get_press_release_text(filing_data.get('linkToFilingDetails'), sid)

    if press_release_content:
        content += f"\n\n--- PRESS RELEASE CONTENT ---\n\n{press_release_content}"
        socketio.emit('log_message',
                      {'message': '🖇️ Combined filing and press release text for AI analysis.', 'level': 'info'},
                      room=sid)

    if len(content.strip()) > 50:
        ai_analysis = analyze_with_chatgpt(content, filing_data.get('companyName', 'Unknown'), ticker, form_type,
                                           user_config, sid)

        if ai_analysis and ai_analysis.get('isAlertWorthy') and int(ai_analysis.get('confidenceScore', 0)) >= int(
                user_config['confidence']):
            socketio.emit('new_alert', {
                'filing': filing_data,
                'aiAnalysis': ai_analysis,
            }, room=sid)

            if ai_analysis.get('alertHighlight', False):
                text_to_speak = ai_analysis.get('textToSpeak', 'Important alert detected, but no summary was provided.')
                openai_api_key = user_config.get('openaiApiKey') or OPENAI_API_KEY
                socketio.start_background_task(generate_and_send_audio, text_to_speak, openai_api_key, sid)

        elif ai_analysis:
            socketio.emit('ai_log_message',
                          {'message': f'- No hit: {ticker} ({ai_analysis.get("confidenceScore", "N/A")}%)'}, room=sid)
    else:
        socketio.emit('log_message', {
            'message': f'⚠ Skipping analysis - insufficient content for {ticker} ({len(content.strip())} chars)',
            'level': 'warn'}, room=sid)


def websocket_thread(api_key, form_types, sid):
    def on_message(ws, message):
        try:
            with open("websocket_stream.log", "a") as f:
                f.write(message + "\n")
        except Exception as e:
            logging.error(f"Failed to write to websocket_stream.log: {e}")
        try:
            filings = json.loads(message)
            for filing in filings:
                filing_form_type, ticker = filing.get('formType', 'N/A'), filing.get('ticker', 'N/A')
                socketio.emit('ws_status_flash', room=sid)
                if any(filing_form_type.startswith(base_form) for base_form in form_types):
                    socketio.emit('log_message', {
                        'message': f"📬 Received [{ticker} - {filing_form_type}]. Matches filter, processing...",
                        'level': 'info'}, room=sid)
                    process_filing(filing, ws_state.get('user_config', {}), sid)
                else:
                    socketio.emit('log_message', {
                        'message': f"📬 Received [{ticker} - {filing_form_type}]. Does not match filter, skipping.",
                        'level': 'skipped'}, room=sid)
        except Exception as e:
            logging.error(f"Error processing message: {e}")

    def on_error(ws, error):
        logging.error(f"SEC Stream Error: {error}")
        socketio.emit('ws_status', {'status': 'Error', 'color': 'var(--accent-red)'}, room=sid)

    def on_close(ws, close_status_code, close_msg):
        logging.info("### SEC Stream Closed ###")
        socketio.emit('ws_status', {'status': 'Off', 'color': 'var(--text-muted)'}, room=sid)
        if ws_state.get("is_monitoring"):
            socketio.emit('log_message', {'message': '🔌 Attempting to reconnect...', 'level': 'warn'}, room=sid)
            socketio.sleep(5)
            start_websocket_connection(api_key, form_types, sid)

    def on_open(ws):
        logging.info("### SEC Stream Opened ###")
        socketio.emit('ws_status', {'status': 'Live', 'color': 'var(--accent-green)'}, room=sid)
        socketio.emit('log_message', {'message': '✅ WebSocket connection opened successfully.', 'level': 'info'},
                      room=sid)

    ws_url = f"wss://stream.sec-api.io?apiKey={api_key}"
    ws_state["ws_app"] = websocket.WebSocketApp(ws_url, on_open=on_open, on_message=on_message, on_error=on_error,
                                                on_close=on_close)
    ws_state["ws_app"].run_forever()


def start_websocket_connection(api_key, form_types, sid):
    if not (ws_state.get("thread") and ws_state["thread"].is_alive()):
        logging.info(f"Starting WebSocket thread for client {sid}")
        ws_state["thread"] = socketio.start_background_task(websocket_thread, api_key, form_types, sid)


def replay_log_task(user_config, sid):
    try:
        with open("websocket_stream.log", "r") as f:
            lines = f.readlines()
    except FileNotFoundError:
        socketio.emit('log_message',
                      {'message': '❌ websocket_stream.log not found. Run live monitoring first to create it.',
                       'level': 'error'}, room=sid)
        socketio.emit('replay_finished', room=sid)
        return
    socketio.emit('log_message',
                  {'message': f'⟳ Found {len(lines)} messages in log file. Starting replay...', 'level': 'warn'},
                  room=sid)
    socketio.sleep(1)
    for line in lines:
        try:
            filings = json.loads(line.strip())
            for filing in filings:
                filing_form_type, ticker = filing.get('formType', 'N/A'), filing.get('ticker', 'N/A')
                if any(filing_form_type.startswith(base_form) for base_form in user_config['formTypes']):
                    socketio.emit('log_message', {
                        'message': f"📬 Replaying [{ticker} - {filing_form_type}]. Matches filter, processing...",
                        'level': 'info'}, room=sid)
                    process_filing(filing, user_config, sid)
                else:
                    socketio.emit('log_message', {
                        'message': f"📬 Replaying [{ticker} - {filing_form_type}]. Does not match filter, skipping.",
                        'level': 'skipped'}, room=sid)
                socketio.sleep(0.5)
        except (json.JSONDecodeError, AttributeError):
            logging.warning(f"Skipping malformed line in websocket_stream.log: {line.strip()}")
            continue
    socketio.emit('replay_finished', room=sid)


@app.route('/')
def index():
    return render_template('index.html')


@socketio.on('connect')
def handle_connect():
    logging.info(f"Client connected: {request.sid}")
    if ws_state.get('is_monitoring'):
        socketio.emit('monitoring_status', {'isMonitoring': True}, room=request.sid)
        socketio.emit('ws_status', {'status': 'Live', 'color': 'var(--accent-green)'}, room=request.sid)


@socketio.on('start_monitoring')
def handle_start_monitoring(data):
    sid = request.sid
    if ws_state.get('is_monitoring'): return
    logging.info(f"Start monitoring request received from client: {sid}")
    socketio.emit('log_message',
                  {'message': '🔴 LIVE MODE: Raw stream data is being saved to websocket_stream.log', 'level': 'warn'},
                  room=sid)
    ws_state['is_monitoring'] = True
    ws_state['user_config'] = data
    sec_api_key_to_use = data.get('secApiKey') or SEC_API_KEY
    start_websocket_connection(sec_api_key_to_use, data['formTypes'], sid)
    socketio.emit('monitoring_status', {'isMonitoring': True}, room=sid)


@socketio.on('stop_monitoring')
def handle_stop_monitoring():
    sid = request.sid
    if not ws_state.get('is_monitoring'): return
    logging.info(f"Stop monitoring request received from client: {sid}")
    ws_state['is_monitoring'] = False
    if ws_state.get("ws_app"): ws_state["ws_app"].close()
    if ws_state.get("thread"):
        ws_state["thread"].join(timeout=2)
        ws_state["thread"] = None
    socketio.emit('monitoring_status', {'isMonitoring': False}, room=sid)


@socketio.on('run_ticker_test')
def handle_ticker_test(data):
    sid = request.sid
    ticker, form_types = data.get('ticker'), data.get('formTypes')
    logging.info(f"--- Starting FULL test for [{ticker}] from client {sid} ---")
    socketio.emit('log_message', {'message': f"--- Starting FULL test for [{ticker}] ---", 'level': 'warn'}, room=sid)
    start_date, form_query = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d'), " OR ".join(
        f'"{f}"' for f in form_types)
    query = f'ticker:{ticker} AND formType:({form_query}) AND filedAt:[{start_date} TO *]'
    sec_api_key_to_use = data.get('secApiKey') or SEC_API_KEY
    local_query_api = QueryApi(api_key=sec_api_key_to_use)
    try:
        filings_response = local_query_api.get_filings(
            {"query": {"query_string": {"query": query}}, "from": "0", "size": "25",
             "sort": [{"filedAt": {"order": "desc"}}]})
        if filings_response['filings']:
            filings_to_process = filings_response['filings']
            socketio.emit('log_message', {
                'message': f"Found {filings_response['total']['value']} filings for {ticker}. Processing up to {len(filings_to_process)} of them...",
                'level': 'info'}, room=sid)
            for i, filing in enumerate(filings_to_process):
                filing_date = filing.get('filedAt', 'N/A').split('T')[0]
                socketio.emit('log_message', {
                    'message': f"--- Processing filing {i + 1} of {len(filings_to_process)} ({filing.get('formType')} filed on {filing_date}) ---",
                    'level': 'info'}, room=sid)
                process_filing(filing, data, sid)
                socketio.sleep(1)
        else:
            socketio.emit('log_message',
                          {'message': f"No relevant filings found for {ticker} in the last 6 months.", 'level': 'info'},
                          room=sid)
    except Exception as e:
        logging.error(f"Ticker test failed: {e}")
        socketio.emit('log_message', {'message': f"❌ Ticker Test failed: {e}", 'level': 'error'}, room=sid)
    finally:
        socketio.emit('log_message', {'message': f"--- Test for [{ticker}] Complete ---", 'level': 'warn'}, room=sid)
        socketio.emit('test_ticker_finished', room=sid)


@socketio.on('replay_log_file')
def handle_replay_log_file(user_config):
    sid = request.sid
    if ws_state.get('is_monitoring'):
        socketio.emit('log_message',
                      {'message': '❌ Cannot start replay while live monitoring is active.', 'level': 'error'}, room=sid)
        return
    logging.info(f"Replay request received from client: {sid}")
    socketio.start_background_task(replay_log_task, user_config, sid)


@socketio.on('shutdown_server')
def shutdown_server():
    logging.info("Shutdown command received. Terminating server.")
    socketio.emit('server_shutting_down', {'message': 'Server is shutting down. You may now close this window.'})
    socketio.sleep(1)
    os._exit(0)


# --- Main Execution ---
def open_browser():
    webbrowser.open_new("http://127.0.0.1:5001")


if __name__ == '__main__':
    print("Starting NAVHunter Backend Server...")
    new_port = 5001
    print(f"Open http://127.0.0.1:{new_port} in your browser.")
    threading.Timer(1, open_browser).start()
    socketio.run(app, host='127.0.0.1', port=new_port)