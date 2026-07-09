# Stage 1: Build the React application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy packaging manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and compile production assets
COPY . .
RUN npm run build

# Stage 2: Serve production assets using Nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose Nginx standard web port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
