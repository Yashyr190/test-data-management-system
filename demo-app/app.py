"""
TDMS Demo App — a realistic local web app to test against.
Runs on http://localhost:9000
Pages: /, /login, /register, /dashboard, /products, /search, /api/users
"""
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json

app = Flask(__name__)
app.secret_key = "tdms-demo-secret"

# Fake DB
USERS = {
    "testuser@example.com": {"password": "SecurePass!123", "name": "Jane Doe", "role": "user"},
    "admin@example.com": {"password": "AdminPass!456", "name": "Admin User", "role": "admin"},
}

PRODUCTS = [
    {"id": 1, "name": "Wireless Headphones", "price": 249.99, "category": "Electronics", "stock": 15},
    {"id": 2, "name": "Mechanical Keyboard", "price": 189.00, "category": "Electronics", "stock": 8},
    {"id": 3, "name": "Standing Desk Mat", "price": 59.99, "category": "Office", "stock": 42},
    {"id": 4, "name": "USB-C Hub 7-in-1", "price": 79.99, "category": "Electronics", "stock": 23},
    {"id": 5, "name": "Monitor Light Bar", "price": 45.00, "category": "Accessories", "stock": 0},
    {"id": 6, "name": "Cable Management Kit", "price": 19.99, "category": "Office", "stock": 100},
]


@app.route("/")
def home():
    return render_template("home.html", logged_in="user" in session, username=session.get("name", ""))


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        email = request.form.get("email", "")
        password = request.form.get("password", "")
        user = USERS.get(email)
        if user and user["password"] == password:
            session["user"] = email
            session["name"] = user["name"]
            session["role"] = user["role"]
            return redirect(url_for("dashboard"))
        else:
            error = "Invalid credentials. Please try again."
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))


@app.route("/register", methods=["GET", "POST"])
def register():
    error = None
    success = None
    if request.method == "POST":
        email = request.form.get("email", "")
        name = request.form.get("name", "")
        password = request.form.get("password", "")
        if email in USERS:
            error = "Email already registered."
        elif not email or not password or not name:
            error = "All fields are required."
        elif len(password) < 8:
            error = "Password must be at least 8 characters."
        else:
            USERS[email] = {"password": password, "name": name, "role": "user"}
            success = f"Account created for {name}! You can now log in."
    return render_template("register.html", error=error, success=success)


@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("dashboard.html", name=session.get("name"), role=session.get("role"), products=PRODUCTS)


@app.route("/products")
def products():
    category = request.args.get("category", "all")
    if category != "all":
        filtered = [p for p in PRODUCTS if p["category"] == category]
    else:
        filtered = PRODUCTS
    categories = list(set(p["category"] for p in PRODUCTS))
    return render_template("products.html", products=filtered, categories=categories, selected=category)


@app.route("/search")
def search():
    q = request.args.get("q", "")
    results = []
    if q:
        results = [p for p in PRODUCTS if q.lower() in p["name"].lower() or q.lower() in p["category"].lower()]
    return render_template("search.html", query=q, results=results)


@app.route("/api/users")
def api_users():
    return jsonify([{"email": k, "name": v["name"], "role": v["role"]} for k, v in USERS.items()])


@app.route("/api/products")
def api_products():
    return jsonify(PRODUCTS)


if __name__ == "__main__":
    print("🚀 Demo app running at http://localhost:9000")
    print("   Pages: / | /login | /register | /dashboard | /products | /search")
    print("   Users: testuser@example.com / SecurePass!123")
    print("          admin@example.com / AdminPass!456")
    app.run(port=9000, debug=False)
