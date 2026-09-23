FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/front-end
COPY front-end/package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY front-end/ ./
RUN npm run build


FROM node:22-bookworm-slim AS backend-build

WORKDIR /app/back-end
COPY back-end/package*.json ./
RUN npm install --no-audit --no-fund
COPY back-end/ ./
RUN npm run build


FROM node:22-bookworm-slim

WORKDIR /app/back-end
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=backend-build /app/back-end/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=backend-build /app/back-end/dist ./dist
COPY --from=frontend-build /app/front-end/dist /app/front-end/dist

EXPOSE 3001

CMD ["npm", "start"]