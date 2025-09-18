FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
RUN mkdir -p /app/data /app/logs
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
RUN chown -R node:node /app/data /app/logs
USER node
EXPOSE 3667
ENV NODE_ENV=production
CMD ["npm", "start"] 
