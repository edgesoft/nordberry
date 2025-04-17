FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./

# NPM fix: clean + fresh install
RUN rm -f package-lock.json && npm install --legacy-peer-deps

COPY . .

RUN npx prisma migrate
RUN npx prisma generate

# 💥 Rebuild native deps like rollup
RUN npm rebuild

# 🚀 Bygg Remix/Vite
RUN npm run build

# --- Runtime ---
FROM node:20

WORKDIR /app

COPY --from=builder /app .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]