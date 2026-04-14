FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_COLLAB_BASE_URL=ws://localhost:1234
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_COLLAB_BASE_URL=${VITE_COLLAB_BASE_URL}

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx","-g","daemon off;"]
