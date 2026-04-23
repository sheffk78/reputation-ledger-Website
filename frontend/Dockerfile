FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
RUN yarn install

# Copy source and build
COPY . .
ENV CI=false
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

# Production stage with nginx
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Start script to handle $PORT
RUN echo '#!/bin/sh\nsed -i "s/listen 80/listen ${PORT:-80}/" /etc/nginx/conf.d/default.conf\nnginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
