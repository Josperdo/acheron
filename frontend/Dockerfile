FROM node:22-slim

WORKDIR /app

# Copy the lockfile too and use `npm ci`, so the image gets exactly the
# dependency versions that were tested, not whatever ^ ranges resolve to today.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
