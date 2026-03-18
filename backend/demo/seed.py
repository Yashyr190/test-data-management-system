"""
Demo data seeder — populates with realistic test datasets and test cases.
Test cases have NO hardcoded URLs — user supplies URL at run time.
Run: python demo/seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import SessionLocal, Base, engine, Dataset, DataRecord, DatasetVersion, TestCase, ManualTestData
from datetime import datetime

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    print("🌱 Seeding demo data...")

    # ── Datasets ──────────────────────────────────────────────────
    datasets_data = [
        {
            "name": "User Authentication Data",
            "description": "Login credentials and user profile data for auth flow testing",
            "category": "Authentication",
            "tags": ["auth", "login", "users"],
            "version": "2.1.0",
            "records": [
                ("username", "testuser@example.com", "email"),
                ("password", "SecurePass!123", "string"),
                ("invalid_username", "notauser@nowhere.com", "email"),
                ("invalid_password", "wrongpassword", "string"),
                ("admin_username", "admin@example.com", "email"),
                ("admin_password", "AdminPass!456", "string"),
                ("first_name", "Jane", "string"),
                ("last_name", "Doe", "string"),
                ("phone", "+1-555-0100", "string"),
            ],
        },
        {
            "name": "E-Commerce Product Catalog",
            "description": "Product data for shopping cart and checkout testing",
            "category": "E-Commerce",
            "tags": ["products", "catalog", "ecommerce"],
            "version": "1.3.0",
            "records": [
                ("product_name", "Wireless Noise-Cancelling Headphones", "string"),
                ("price", "249.99", "number"),
                ("quantity", "2", "number"),
                ("discount_code", "SAVE20", "string"),
                ("search_query", "keyboard", "string"),
                ("category_filter", "Electronics", "string"),
            ],
        },
        {
            "name": "Form Validation Dataset",
            "description": "Edge cases and boundary values for form input validation",
            "category": "Validation",
            "tags": ["forms", "validation", "edge-cases"],
            "version": "1.0.0",
            "records": [
                ("empty_string", "", "string"),
                ("max_length_string", "A" * 255, "string"),
                ("special_chars", "!@#$%^&*()_+-=[]{}|;':\",./<>?", "string"),
                ("unicode_text", "Hello 世界 مرحبا 🌍", "string"),
                ("negative_number", "-999", "number"),
                ("zero", "0", "number"),
                ("large_number", "999999999", "number"),
                ("email_valid", "user+tag@sub.example.co.uk", "email"),
                ("email_invalid", "notanemail@", "string"),
            ],
        },
        {
            "name": "API Testing Parameters",
            "description": "HTTP request parameters for REST API endpoint testing",
            "category": "API",
            "tags": ["api", "rest", "http"],
            "version": "1.1.0",
            "records": [
                ("api_key", "demo-api-key-12345", "string"),
                ("timeout", "5000", "number"),
                ("user_id", "1", "number"),
                ("post_title", "Test Post Title", "string"),
                ("content_type", "application/json", "string"),
            ],
        },
        {
            "name": "Performance Benchmarks",
            "description": "Thresholds and parameters for performance/load testing",
            "category": "Performance",
            "tags": ["performance", "load", "benchmark"],
            "version": "1.0.0",
            "records": [
                ("max_response_time_ms", "2000", "number"),
                ("concurrent_users", "50", "number"),
                ("ramp_up_seconds", "10", "number"),
                ("test_duration_seconds", "60", "number"),
                ("acceptable_error_rate", "0.01", "number"),
            ],
        },
    ]

    ds_map = {}
    for d in datasets_data:
        ds = Dataset(name=d["name"], description=d["description"], category=d["category"], tags=d["tags"], version=d["version"])
        db.add(ds)
        db.flush()
        for key, value, dtype in d["records"]:
            db.add(DataRecord(dataset_id=ds.id, key=key, value=value, data_type=dtype))
        db.add(DatasetVersion(
            dataset_id=ds.id, version=d["version"],
            snapshot=[{"key": k, "value": v, "data_type": t} for k, v, t in d["records"]],
            changelog="Demo seed initial version",
        ))
        ds_map[d["name"]] = ds.id
        print(f"  ✓ Dataset: {d['name']}")
    db.flush()

    # ── Test Cases (NO hardcoded URLs — user supplies URL at run time) ──
    test_cases_data = [
        {
            "name": "Homepage Load & Heading Check",
            "description": "Verify the homepage loads and the main heading (h1) is visible",
            "test_type": "selenium",
            "target_url": "",   # supplied at run time
            "priority": "high",
            "tags": ["smoke", "homepage"],
            "expected_result": "h1 heading is visible on the page",
            "steps": [
                {"action": "navigate", "value": "", "wait": 2, "description": "Open target URL"},
                {"action": "assert_visible", "selector": "h1", "description": "h1 heading is visible"},
                {"action": "screenshot", "value": "homepage", "description": "Capture homepage"},
                {"action": "scroll", "description": "Scroll down"},
                {"action": "screenshot", "value": "homepage_scrolled", "description": "After scroll"},
            ],
        },
        {
            "name": "Login Flow — Valid Credentials",
            "description": "Navigate to /login, enter valid credentials, assert redirect to dashboard",
            "test_type": "selenium",
            "target_url": "",
            "priority": "high",
            "tags": ["auth", "login", "smoke"],
            "expected_result": "User is logged in and dashboard is accessible",
            "steps": [
                {"action": "navigate", "value": "/login", "wait": 2, "description": "Open login page"},
                {"action": "assert_visible", "selector": "#email", "description": "Email field visible"},
                {"action": "type", "selector": "#email", "value": "testuser@example.com", "wait": 0},
                {"action": "type", "selector": "#password", "value": "SecurePass!123", "wait": 0},
                {"action": "screenshot", "value": "login_filled", "description": "Form filled"},
                {"action": "click", "selector": "#login-btn", "wait": 2, "description": "Submit login"},
                {"action": "screenshot", "value": "after_login", "description": "After login"},
            ],
        },
        {
            "name": "Login Flow — Invalid Credentials",
            "description": "Submit wrong credentials and assert error message is shown",
            "test_type": "selenium",
            "target_url": "",
            "priority": "medium",
            "tags": ["auth", "negative", "validation"],
            "expected_result": "Error message is displayed for invalid credentials",
            "steps": [
                {"action": "navigate", "value": "/login", "wait": 2, "description": "Open login"},
                {"action": "type", "selector": "#email", "value": "wrong@email.com", "wait": 0},
                {"action": "type", "selector": "#password", "value": "badpassword", "wait": 0},
                {"action": "click", "selector": "#login-btn", "wait": 2, "description": "Submit"},
                {"action": "assert_visible", "selector": "#error-message", "description": "Error msg visible"},
                {"action": "screenshot", "value": "login_error", "description": "Error state"},
            ],
        },
        {
            "name": "Product Listing Page",
            "description": "Navigate to /products, assert product grid is rendered",
            "test_type": "selenium",
            "target_url": "",
            "priority": "medium",
            "tags": ["products", "catalog"],
            "expected_result": "Products page loads with product cards visible",
            "steps": [
                {"action": "navigate", "value": "/products", "wait": 2, "description": "Open products page"},
                {"action": "assert_visible", "selector": "#products-grid", "description": "Product grid visible"},
                {"action": "screenshot", "value": "products_page"},
                {"action": "scroll", "description": "Scroll to bottom"},
                {"action": "screenshot", "value": "products_scrolled"},
            ],
        },
        {
            "name": "Search Functionality",
            "description": "Use search form and verify results are returned",
            "test_type": "selenium",
            "target_url": "",
            "priority": "medium",
            "tags": ["search", "ui"],
            "expected_result": "Search returns relevant results",
            "steps": [
                {"action": "navigate", "value": "/search", "wait": 2, "description": "Open search page"},
                {"action": "assert_visible", "selector": "#search-input", "description": "Search input visible"},
                {"action": "type", "selector": "#search-input", "value": "keyboard", "wait": 1},
                {"action": "click", "selector": "#search-btn", "wait": 2, "description": "Submit search"},
                {"action": "screenshot", "value": "search_results", "description": "Search results"},
                {"action": "assert_visible", "selector": "#search-result-count", "description": "Result count visible"},
            ],
        },
        {
            "name": "Registration Page Load",
            "description": "Verify the registration form loads correctly",
            "test_type": "selenium",
            "target_url": "",
            "priority": "low",
            "tags": ["auth", "register"],
            "expected_result": "Registration page with form fields is visible",
            "steps": [
                {"action": "navigate", "value": "/register", "wait": 2, "description": "Open register page"},
                {"action": "assert_visible", "selector": "#register-form", "description": "Register form visible"},
                {"action": "assert_visible", "selector": "#name", "description": "Name field visible"},
                {"action": "assert_visible", "selector": "#email", "description": "Email field visible"},
                {"action": "screenshot", "value": "register_page"},
            ],
        },
    ]

    for tc_data in test_cases_data:
        tc = TestCase(**tc_data)
        db.add(tc)
        print(f"  ✓ Test Case: {tc_data['name']}")

    # ── Manual Test Data ────────────────────────────────────────────
    manual_data = [
        {
            "name": "Login Form — Valid Credentials",
            "fields": {"url": "http://localhost:9000/login", "username": "testuser@example.com", "password": "SecurePass!123"},
            "test_url": "http://localhost:9000/login",
            "expected_behavior": "User logs in and is redirected to /dashboard",
            "result": "passed",
            "notes": "Works as expected. Redirect is immediate.",
        },
        {
            "name": "Login Form — Invalid Password",
            "fields": {"username": "user@example.com", "password": "wrongpass"},
            "test_url": "http://localhost:9000/login",
            "expected_behavior": "Error message displayed: 'Invalid credentials'",
            "result": "passed",
            "notes": "Error shown correctly.",
        },
        {
            "name": "Registration — Duplicate Email",
            "fields": {"email": "testuser@example.com", "password": "Pass123!", "name": "John"},
            "test_url": "http://localhost:9000/register",
            "expected_behavior": "Show error: 'Email already registered'",
            "result": "failed",
            "notes": "Bug: No error shown on duplicate email. Filed #1042.",
        },
        {
            "name": "Product Search — Keyboard",
            "fields": {"query": "keyboard"},
            "test_url": "http://localhost:9000/search",
            "expected_behavior": "Returns at least 1 matching product",
            "result": None,
            "notes": "",
        },
        {
            "name": "Products Page — Out of Stock Filter",
            "fields": {"filter": "Electronics"},
            "test_url": "http://localhost:9000/products",
            "expected_behavior": "Only Electronics category products shown",
            "result": None,
            "notes": "",
        },
    ]

    for m in manual_data:
        entry = ManualTestData(
            name=m["name"], fields=m["fields"], test_url=m["test_url"],
            expected_behavior=m["expected_behavior"], result=m.get("result"),
            notes=m.get("notes", ""),
            tested_at=datetime.utcnow() if m.get("result") else None,
        )
        db.add(entry)
        print(f"  ✓ Manual: {m['name']}")

    db.commit()
    db.close()
    print("\n✅ Demo data seeded successfully!")
    print("   5 datasets · 6 test cases · 5 manual entries")
    print("   💡 Test cases have no hardcoded URLs — enter your target URL when running!")


if __name__ == "__main__":
    seed()
