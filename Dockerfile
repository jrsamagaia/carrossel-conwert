# Start from Node.js alpine base image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Build Vite frontend and Express backend bundle
RUN npm run build

# Second stage for minimal production image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy built application and backend bundle from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment to production
ENV NODE_ENV=production

# Expose the API port
EXPOSE 3000

# Start the Node.js backend which will serve the frontend as static files
CMD ["npm", "run", "start"]
