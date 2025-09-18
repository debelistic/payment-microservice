FROM node:18-alpine
WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/data /app/logs

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy source code and build
COPY . .
RUN npm run build

# Set proper permissions for data and logs directories
RUN chown -R node:node /app/data /app/logs

# Switch to non-root user for security
USER node

EXPOSE 3667
ENV NODE_ENV=production
CMD ["npm", "start"] 
