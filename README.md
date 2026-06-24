<div align="center">
  <img src="frontend/public/icon-192.png" width="80" alt="Wishlist logo" />

  # Wishlist

  Wishlist is a simple self-hosted app for sharing gift ideas.
</div>

Create a list, add the gifts you would like, and share it with friends or family. Other people can claim items so the same gift is not bought twice. You will not see who claimed what, so the surprise is kept.

Wishlist is open source and easy to run yourself. It uses SQLite, supports file uploads, and can be started with Docker.

---

## Why use Wishlist?

Wishlist helps you keep gift ideas in one place.

It is useful for birthdays, holidays, and small groups where people want to share ideas without losing the surprise. It is not tied to a store, and it does not need an external database.

You host it yourself, so your data stays on your own server.

---

## Features

- **Secret gift claiming**: Others can claim items on your list. You cannot see who claimed them.

- **Public share links**: Share a read-only list with people who do not have an account.

- **Per-item currency**: Each item can use its own currency. Your profile currency is used by default.

- **Photo uploads**: Add a photo to any item.

- **Product URL import**: Paste a product URL to fill in the name, description, price, and image. (tbh, most of the time it doesn't work because of captchas :c, but when it does - it's pretty nice.)

- **Drag to reorder**: Move items into the order you want.

- **Priority levels**: Mark items as Low, Medium, or High priority.

- **Birthday countdowns**: See how many days are left until each person's next birthday.

- **Archive**: Move old items away from your active list without deleting them.

- **Received tracking**: Mark gifts as received after they arrive.

- **Admin panel**: Create users, reset passwords, and generate one-time signup links.

- **Simple deployment**: Runs as a single binary with SQLite. Docker is supported.

---

## Quick start

The recommended way to run Wishlist is with Docker.

### 1. Copy the example environment file

```bash
cp .env.example .env
```

Then edit your credentials:

```env
PORT=3967
DATABASE_PATH=/data/wishlist.db
APP_ENV=production
COOKIE_SECURE=false
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-this-with-a-long-random-password
ADMIN_DISPLAY_NAME=admin
UPLOADS_PATH=/data/uploads
```

Set `COOKIE_SECURE=true` when Wishlist is served over HTTPS. If you run it behind a reverse proxy with TLS, this should usually be enabled.

### 2. Start Wishlist

```bash
docker compose up -d
```

Open [http://localhost:3967](http://localhost:3967) and log in with your admin credentials.

To add users, go to the **Admin** page. You can create users directly or generate a signup link.

---

## Upgrading

Wishlist runs database migrations automatically on startup.

To upgrade, pull the latest image and restart:

```bash
docker compose pull && docker compose up -d
```

Your data lives in the `./data` volume. It is not touched during upgrades.

---

## License

MIT - see [LICENSE](LICENSE).
