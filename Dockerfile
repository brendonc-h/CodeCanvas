# Production Dockerfile for CodeCanvas
FROM node:20-alpine

# Install dependencies for building
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the client
RUN npm run build

# Expose port
EXPOSE 8000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
