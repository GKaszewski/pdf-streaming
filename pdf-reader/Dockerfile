FROM node:20-alpine as build-stage
WORKDIR /code
COPY package.json .
RUN npm install

COPY . .

RUN npm run build
RUN echo "Build complete."

COPY /dist /usr/share/nginx/html
