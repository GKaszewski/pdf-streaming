FROM node:20-alpine
WORKDIR /code
COPY package.json /code/package.json
RUN npm install

COPY . /code/frontend
RUN npm run build
RUN echo "Build complete."

COPY /code/frontend/dist /usr/share/nginx/html