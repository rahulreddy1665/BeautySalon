# Backend

## Requirements

Before running the project, make sure the following are installed:

* Node.js version 24
* MongoDB

## Install Dependencies

```bash
npm install
```

## Environment Configuration

Create a `.env` file in the project root:

```env
PORT=8080
MONGO_URI=mongodb://127.0.0.1:27017/my_database
JWT_SECRET=your-super-secret-key
```

## Run Seed

Run the RBAC seed **only once** to create the initial roles, permissions, and admin user.

```bash
npm run seed:rbac
```

> **Important:** Once the seed has completed successfully, do not run it again unless you intentionally need to re-seed the database.

## Run the Software

Start the development server with:

```bash
npm run dev
```

The backend will run on:

```text
http://localhost:8080
```

## Available Commands

| Command             | Description                                       |
| ------------------- | ------------------------------------------------- |
| `npm install`       | Install project dependencies                      |
| `npm run seed:rbac` | Create initial roles, permissions, and admin user |
| `npm run dev`       | Start the development server                      |
| `npm run build`     | Build the TypeScript project                      |
| `npm start`         | Start the compiled production server              |

## Project Structure

```text
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── dto/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── seeds/
│   ├── services/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```
