import os
import time
import uuid
import threading
from datetime import datetime
from typing import List, Dict, Callable, Optional

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

SCREENSHOTS_DIR = "screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

# Cache the chromedriver path so the first download doesn't block subsequent runs silently
_CHROMEDRIVER_PATH: Optional[str] = None
_CHROMEDRIVER_LOCK = threading.Lock()


def _get_chromedriver_path(callback=None) -> Optional[str]:
    """Resolve chromedriver path once, cache it. Logs progress so terminal isn't silent."""
    global _CHROMEDRIVER_PATH
    with _CHROMEDRIVER_LOCK:
        if _CHROMEDRIVER_PATH:
            return _CHROMEDRIVER_PATH
        # Try webdriver-manager first
        try:
            if callback:
                callback(_make_entry("⬇ Downloading / locating ChromeDriver (first run may take ~15s)…", "info"))
            from webdriver_manager.chrome import ChromeDriverManager
            path = ChromeDriverManager().install()
            _CHROMEDRIVER_PATH = path
            if callback:
                callback(_make_entry(f"✓ ChromeDriver ready: {path}", "info"))
            return path
        except Exception as e:
            if callback:
                callback(_make_entry(f"webdriver-manager failed ({e}), trying system chromedriver…", "warning"))
            return None


def _make_entry(message: str, level: str = "info") -> Dict:
    return {"timestamp": datetime.utcnow().isoformat(), "level": level, "message": message}


class TestRunner:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.driver: Optional[webdriver.Chrome] = None
        self.logs: List[Dict] = []
        self.screenshots: List[str] = []
        self._base_url: str = ""
        self._callback: Optional[Callable] = None

    # ── Logging ──────────────────────────────────────────────────────
    def _log(self, message: str, level: str = "info") -> Dict:
        entry = _make_entry(message, level)
        self.logs.append(entry)
        if self._callback:
            try:
                self._callback(entry)
            except Exception:
                pass
        return entry

    # ── Screenshots ──────────────────────────────────────────────────
    def _screenshot(self, name: str) -> str:
        if not self.driver:
            return ""
        fname = f"{SCREENSHOTS_DIR}/{name}_{uuid.uuid4().hex[:8]}.png"
        try:
            self.driver.save_screenshot(fname)
            self.screenshots.append(fname)
            self._log(f"📸 Screenshot: {os.path.basename(fname)}")
        except Exception as e:
            self._log(f"Screenshot failed: {e}", "warning")
        return fname

    # ── Relative URL resolver ─────────────────────────────────────────
    def _resolve_url(self, url: str) -> str:
        if not url:
            return url
        if url.startswith("http://") or url.startswith("https://"):
            return url
        base = self._base_url.rstrip("/")
        path = url if url.startswith("/") else f"/{url}"
        return f"{base}{path}"

    # ── Driver setup ──────────────────────────────────────────────────
    def _setup_driver(self):
        self._log("🔧 Configuring Chrome options…")
        opts = Options()
        if self.headless:
            opts.add_argument("--headless=new")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--disable-gpu")
        opts.add_argument("--window-size=1280,900")
        opts.add_argument("--disable-extensions")
        opts.add_argument("--disable-setuid-sandbox")
        opts.add_argument("--log-level=3")
        opts.add_experimental_option("excludeSwitches", ["enable-logging"])

        self._log("🌐 Launching Chrome browser…")
        driver_path = _get_chromedriver_path(callback=self._callback)
        try:
            if driver_path:
                service = Service(driver_path)
                self.driver = webdriver.Chrome(service=service, options=opts)
            else:
                self.driver = webdriver.Chrome(options=opts)
        except Exception as e:
            # Last resort: try without service
            self._log(f"Driver init fallback: {e}", "warning")
            self.driver = webdriver.Chrome(options=opts)

        self.driver.set_page_load_timeout(30)
        self.driver.implicitly_wait(3)
        self._log("✅ Browser launched successfully")

    def _teardown_driver(self):
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            self.driver = None

    # ── Step executor ─────────────────────────────────────────────────
    def _execute_step(self, step: Dict, dataset: Dict = None) -> bool:
        action    = step.get("action", "")
        selector  = step.get("selector", "") or ""
        value     = str(step.get("value", "") or "")
        wait_time = max(0, int(step.get("wait", 1) or 1))

        # Substitute {{key}} placeholders from dataset
        if dataset and "{{" in value:
            for k, v in dataset.items():
                value = value.replace(f"{{{{{k}}}}}", str(v))

        # Build a compact log prefix
        preview = selector or value or ""
        if len(preview) > 60:
            preview = preview[:57] + "…"
        self._log(f"  ⟶  [{action}]  {preview}")

        try:
            if action == "navigate":
                url = self._resolve_url(value or selector)
                if not url:
                    self._log("  SKIP: navigate has no URL", "warning")
                    return True
                self._log(f"  Navigating to {url}")
                self.driver.get(url)
                self._log(f"  Page loaded ✓  ({self.driver.title or 'no title'})")
                if wait_time:
                    time.sleep(wait_time)

            elif action == "click":
                el = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                el.click()
                self._log(f"  Clicked '{selector}' ✓")
                if wait_time:
                    time.sleep(wait_time)

            elif action == "type":
                el = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                el.clear()
                el.send_keys(value)
                masked = "•" * len(value) if "password" in selector.lower() else value
                self._log(f"  Typed '{masked}' into '{selector}' ✓")
                if wait_time:
                    time.sleep(wait_time)

            elif action == "assert_text":
                el = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                actual = el.text
                assert value in actual, f"Expected text '{value}' not found in '{actual[:80]}'"
                self._log(f"  Text assertion ✓  ('{value}' found in element)")

            elif action == "assert_visible":
                WebDriverWait(self.driver, 10).until(
                    EC.visibility_of_element_located((By.CSS_SELECTOR, selector))
                )
                self._log(f"  Element '{selector}' is visible ✓")

            elif action == "assert_url":
                current = self.driver.current_url
                assert value in current, f"Expected '{value}' in URL but got '{current}'"
                self._log(f"  URL assertion ✓  ({current})")

            elif action == "wait":
                secs = int(value) if value.isdigit() else wait_time
                self._log(f"  Waiting {secs}s…")
                time.sleep(secs)
                self._log(f"  Wait done ✓")

            elif action == "screenshot":
                self._screenshot(value or "step")

            elif action == "scroll":
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                self._log("  Scrolled to bottom ✓")
                if wait_time:
                    time.sleep(wait_time)

            elif action == "scroll_top":
                self.driver.execute_script("window.scrollTo(0, 0);")
                self._log("  Scrolled to top ✓")

            elif action == "hover":
                from selenium.webdriver.common.action_chains import ActionChains
                el = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                ActionChains(self.driver).move_to_element(el).perform()
                self._log(f"  Hovered over '{selector}' ✓")
                if wait_time:
                    time.sleep(wait_time)

            elif action == "clear":
                el = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                el.clear()
                self._log(f"  Cleared '{selector}' ✓")

            else:
                self._log(f"  Unknown action '{action}' — skipping", "warning")

            return True

        except AssertionError as e:
            self._log(f"  ✗ ASSERTION FAILED: {e}", "error")
            self._screenshot("assertion_error")
            return False
        except TimeoutException:
            self._log(f"  ✗ TIMEOUT: '{selector}' not found/clickable within 10s", "error")
            self._screenshot("timeout_error")
            return False
        except Exception as e:
            msg = str(e).split("\n")[0]
            self._log(f"  ✗ ERROR: {msg}", "error")
            self._screenshot("step_error")
            return False

    # ── Main run ──────────────────────────────────────────────────────
    def run(self, steps: List[Dict], dataset: Dict = None, callback=None, base_url: str = None) -> Dict:
        self.logs = []
        self.screenshots = []
        self._callback = callback
        self._base_url = (base_url or "").rstrip("/")
        start = time.time()
        result = {"status": "passed", "logs": [], "screenshots": [], "error": None}

        total = len(steps)
        self._log(f"═══════════════════════════════════════")
        self._log(f"  TDMS Test Runner")
        self._log(f"  Steps: {total}  |  Base URL: {self._base_url or '(none)'}")
        self._log(f"═══════════════════════════════════════")

        try:
            self._setup_driver()

            for i, step in enumerate(steps):
                desc = step.get("description") or step.get("action", "")
                self._log(f"")
                self._log(f"┌─ Step {i+1}/{total}: {desc}")
                success = self._execute_step(step, dataset)
                if not success:
                    self._log(f"└─ ✗ FAILED", "error")
                    result["status"] = "failed"
                    result["error"] = f"Step {i+1} failed: action='{step.get('action', '')}'"
                    break
                else:
                    self._log(f"└─ ✓ PASSED")

            if result["status"] == "passed":
                self._screenshot("final_pass")
                self._log("")
                self._log("✅ ALL STEPS PASSED")

        except WebDriverException as e:
            result["status"] = "error"
            msg = str(e).split("\n")[0]
            result["error"] = f"WebDriver: {msg}"
            self._log(result["error"], "error")
        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            self._log(str(e), "error")
        finally:
            self._teardown_driver()

        duration = round(time.time() - start, 2)
        result["logs"] = self.logs
        result["screenshots"] = self.screenshots
        result["duration"] = duration
        self._log("")
        self._log(f"⏱  Duration: {duration}s   Status: {result['status'].upper()}")
        self._log(f"═══════════════════════════════════════")
        return result
