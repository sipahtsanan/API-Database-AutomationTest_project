# User API — Node.js + Express + SQLite

## 📁 Project Structure

```
user-api/
├── server.js              # Entry point
├── db.js                  # SQLite connection
├── initDb.js              # Database & table initializer
├── routes/
│   └── users.js           # User CRUD routes
├── package.json
├── database.sqlite        # Auto-created after running init-db
└── bruno-collection (users-endpoints)/      # Bruno automated test collection
    ├── bruno.json
    ├── environments/
    │   └── local.bru
    ├── create-user.bru
    ├── search-user.bru
    ├── update-user.bru
    └── delete-user.bru
```

---

## ⚙️ Setup

```bash
# 1. Install dependencies
npm install

# 2. Initialize database (creates database.sqlite + user table)
npm run init-db

# 3. Start server
npm start

# or dev mode (auto-restart on file change)
npm run dev
```

Server will run at: `http://localhost:3000`

---

## 🗄️ User Table Schema

| Column      | Type    | Constraint                        |
|-------------|---------|-----------------------------------|
| cid         | TEXT    | PRIMARY KEY, numeric, max 13 digits |
| name        | TEXT    | max 50 characters                 |
| surname     | TEXT    | max 50 characters                 |
| status      | TEXT    | `active` or `inactive`            |
| delete_user | INTEGER | `0` (false) or `1` (true)         |

---

## 📡 API Endpoints

### ➕ Create User
```
POST /api/users
Content-Type: application/json
```
**Request Body:**
```json
{
  "cid": "1234567890123",
  "name": "John",
  "surname": "Doe"
}
```
> `cid` is **required**. On create, `status` is automatically set to `active` and `delete_user` to `false`.

---

### 🔍 Search User
```
POST /api/users/search
Content-Type: application/json
```
**Request Body (get by CID):**
```json
{ "cid": "1234567890123" }
```
**Request Body (get all users):**
```json
{}
```

---

### ✏️ Update User
```
POST /api/users/update
Content-Type: application/json
```
**Request Body:**
```json
{
  "cid": "1234567890123",
  "name": "Jane",
  "surname": "Doe",
  "status": "inactive"
}
```
> Only send fields you want to update. If `status` is set to `inactive`, `delete_user` will automatically be set to `true`.

---

### 🗑️ Delete User (Soft Delete)
```
DELETE /api/users
Content-Type: application/json
```
**Request Body:**
```json
{ "cid": "1234567890123" }
```
> Does **not** remove the record. Sets `delete_user = true` and `status = inactive`.

---

## ✅ Business Rules

- `cid` is **mandatory** for every endpoint
- `cid` must be **numeric only**, max **13 digits**
- **Create:** `status = active`, `delete_user = false` always
- **Update to inactive:** automatically sets `delete_user = true`
- **Soft Delete:** sets `delete_user = true`, `status = inactive` (record is preserved)

---

## 🧪 Automated Testing with Bruno

### What is Bruno?

[Bruno](https://www.usebruno.com/) is an open-source API client and testing tool. It stores collections as plain `.bru` text files, making it fully Git-friendly and ideal for team collaboration and CI/CD pipelines.

### Install Bruno CLI

```bash
npm install -g @usebruno/cli
```

### Bruno Collection Structure

```
users-endpoints/
├── environments/
│   └── local.bru                    # Environment variables (baseUrl, etc.)
│
├── /users-create/
│   ├── 200 - success/
│   │   └── POST [POST] user create  # Happy path — create user successfully
│   └── 500,400,409 - validation/
│       └── POST [POST] user create  # Error cases — duplicate, invalid input
│
├── /users/search/
│   ├── 200 - success/
│   │   ├── POST [GET] All users     # Get all users
│   │   └── POST [GET] search user  # Search by CID
│   └── 500,400 - validation/
│       ├── POST [GET] search user  # Invalid CID format
│       ├── POST [GET] search user  # CID not found
│       ├── POST [GET] search user  # CID not string
│       └── POST [GET] search user  # CID exceeds 13 digits
│
├── /users/update/
│   ├── 200 - success/
│   │   ├── POST [POST] update user  # Update name/surname
│   │   └── POST [POST] update user  # Update status to inactive
│   └── 500,404,400 - validation/
│       ├── POST [POST] update user  # CID not found
│       ├── POST [POST] update user  # Invalid status value
│       ├── POST [POST] update user  # Name exceeds 50 chars
│       ├── POST [POST] update user  # Surname exceeds 50 chars
│       ├── POST [POST] update user  # CID not string
│       └── POST [POST] update user  # Missing CID
│
└── /users-delete/
    ├── 200 - success/
    │   └── DELETE [DELETE] user     # Soft delete successfully
    └── 404,409 - validation/
        ├── DELETE [DELETE] user     # CID not found
        └── DELETE [DELETE] user     # User already deleted
```

### Environment File — `environments/local.bru`

```
vars {
  baseUrl: http://localhost:3000
}
```

### Example Test File — `create-user.bru`

```
meta {
  name: Create User
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/api/users
  body: json
}

body:json {
  {
    "cid": "1234567890123",
    "name": "John",
    "surname": "Doe"
  }
}

tests {
  expect(res.status).to.equal(201);
  expect(res.body.success).to.equal(true);
  expect(res.body.data.status).to.equal("active");
  expect(res.body.data.delete_user).to.equal(false);
}
```

### Run Tests

```bash
# Run entire collection
bru run bruno-collection/ --env local

# Run a single request file
bru run bruno-collection/create-user.bru --env local

# Run and export results as JSON
bru run bruno-collection/ --env local --reporter-json results.json
```

---

## 🆚 Bruno vs Postman (Newman)

| Feature | Bruno | Postman (Newman) |
|---|---|---|
| CLI tool | `bru` | `newman` |
| Collection format | `.bru` plain text | `.json` (exported from Postman app) |
| Git-friendly | ✅ Easy to read diffs | ⚠️ Large JSON, hard to diff |
| Price | **Fully free & open-source** | GUI free, some features paid |
| CI/CD support | ✅ | ✅ |
| Test syntax | `expect(res.status).to.equal(200)` | Same (Chai-based) |
| Offline usage | ✅ Full offline | ⚠️ Some features require cloud sync |
| Team collaboration | File-based, works with Git natively | Requires Postman account/workspace |

### Key Advantage: Git-Friendly Collections

Bruno stores every request as a **readable plain text file**, so when you push to Git:

```diff
# Bruno diff — easy to review
- "cid": "1234567890123"
+ "cid": "9999999999999"
```

Postman exports as a large JSON blob, making pull request reviews difficult and cluttered. With Bruno, the entire team can review API changes just like reviewing source code.
