# Velozity — Real-Time Client Project Dashboard

Velozity is a role-based dashboard for managing clients, projects and tasks. It supports Admin, Project Manager and Developer roles, real-time activity updates, notifications, task filters and automatic overdue-task detection.

The frontend is deployed on **Vercel**, while the backend runs on a Node.js-compatible server with PostgreSQL.

---

## 1. Local Setup

### Requirements

Make sure the following are installed:

* Node.js 20+
* Docker Desktop
* npm

### Step 1 — Start PostgreSQL

From the project root:

```bash
docker-compose up -d
```

This starts the PostgreSQL database required by the application.

### Step 2 — Setup the Backend

```bash
cd server
npm install
```

Create a `.env` file using `.env.example` and add the required database and JWT values.

Then run:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Start the backend:

```bash
npm run dev
```

The backend will run on:

```text
http://localhost:4000
```

### Step 3 — Setup the Frontend

Open another terminal:

```bash
cd client
npm install
```

Create the frontend `.env` file and set:

```text
VITE_API_URL=http://localhost:4000
```

Then start the frontend:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

### Demo Login

The seed script creates demo users for each role.

**Password for all demo accounts:**

```text
Password123!
```

Example accounts:

```text
Admin:
admin@velozity.dev

Project Manager:
priya.pm@velozity.dev

Developer:
ravi.dev@velozity.dev
```

---

# 2. Database Schema

The application uses **PostgreSQL with Prisma ORM**.

The main tables are:

```text
User
 │
 ├── RefreshToken
 │
 ├── Project
 │     │
 │     └── Task
 │            │
 │            ├── ActivityLog
 │            └── Notification
 │
 └── Notification

Client
 │
 └── Project
```

### Main Relationships

**User**

* Stores Admin, Project Manager and Developer accounts.
* A user can own projects, be assigned tasks and receive notifications.

**Client**

* Represents a client managed by the agency.
* A client can have multiple projects.

**Project**

* Belongs to a client.
* Has a Project Manager as its owner.
* Contains multiple tasks.

**Task**

* Belongs to a project.
* Can be assigned to a developer.
* Contains information such as status, priority and due date.

**ActivityLog**

* Stores important actions such as task status changes.
* Used to display the activity feed and recover missed events.

**Notification**

* Stores notifications for individual users.
* Used for unread counts and notification history.

**RefreshToken**

* Stores hashed refresh tokens used for secure session management.

Foreign-key relationships and delete rules are defined in the Prisma schema.

---

# 3. Architectural Decisions

## Why Socket.io?

I used **Socket.io** for real-time communication because the dashboard needs to update immediately when a task changes.

For example:

```text
Developer changes task
        ↓
Backend updates database
        ↓
Activity is created
        ↓
Socket.io sends update
        ↓
Relevant users see it immediately
```

Socket.io also makes it easy to use rooms for individual projects and users.

The server checks whether a user is allowed to access a project before allowing them to join its room.

---

## Why node-cron?

The project uses **node-cron** for the overdue-task check.

Every 15 minutes, the job checks tasks whose due dates have passed.

It marks unfinished tasks as overdue and removes the overdue flag if a task is completed or its due date is changed.

I chose `node-cron` because the requirement is simple and does not need a separate queue system.

It keeps the implementation lightweight while still allowing the check to run automatically in the background.

---

## Why HttpOnly Refresh Tokens?

The application uses a short-lived JWT access token and a refresh token.

The access token is kept in frontend memory and is not stored in localStorage.

The refresh token is stored in an **HttpOnly cookie**.

This means JavaScript running in the browser cannot directly read the refresh token.

The refresh token is also rotated whenever it is used.

In simple terms:

```text
Login
  ↓
Access Token → kept in memory
  ↓
Refresh Token → HttpOnly cookie
  ↓
Access token expires
  ↓
Refresh token gets exchanged for a new access token
```

This approach reduces the risk of exposing a long-lived authentication token through client-side JavaScript.

---

## Role-Based Access

Access control is handled on the backend.

The frontend hides actions that a user cannot perform, but the backend also checks the user's role and ownership before processing requests.

For example:

* Admin can access everything.
* Project Managers can access their own projects.
* Developers can access their assigned tasks.
* Developers can update task status but cannot modify unrelated task fields.

This prevents users from bypassing frontend restrictions by directly calling the API.

---

# 4. Known Limitations

The current version has a few limitations.

### Single-server presence

Online-user presence is currently stored in the backend's memory.

This works when the application is running on one backend instance.

If the backend is scaled across multiple servers, a shared solution such as Redis would be needed.

### Background job

The overdue-task job uses `node-cron`, so the backend needs to remain running.

It is not suitable for a serverless backend that shuts down between requests.

### No file uploads

The current version does not support uploading files or images for projects or tasks.

### No authentication rate limiting

Login and other authentication endpoints should have rate limiting before being used in a large production environment.

### Refresh-token cleanup

Old revoked or expired refresh-token records are not automatically removed yet. A periodic cleanup job could be added later.

### Testing

The project contains automated tests, but the complete test suite and database migrations should be run in the local environment before final evaluation.

---

# 5. Deployment

The frontend has been deployed using **Vercel**.

The production architecture is:

```text
                ┌──────────────────┐
                │      Browser     │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │      Vercel      │
                │ React + Vite     │
                └────────┬─────────┘
                         │
                    REST / Socket.io
                         │
                         ▼
                ┌──────────────────┐
                │   Node.js API    │
                │ Express + Socket │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │   PostgreSQL     │
                └──────────────────┘
```

The frontend uses the production backend URL through the `VITE_API_URL` environment variable.

The backend is kept separate from Vercel because Socket.io and the `node-cron` background job require a continuously running Node.js process.

---

# 6. Summary

Velozity combines project management with real-time communication and role-based access.

The main technical decisions were made to keep the application simple while still providing:

* Secure authentication
* Backend-based authorization
* PostgreSQL persistence
* Real-time updates with Socket.io
* Automatic overdue-task checking
* Persistent notifications
* A clear separation between frontend and backend

The project can be run locally using Docker and npm, and the frontend is deployed on Vercel for production use.
