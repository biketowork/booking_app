FROM node:18-alpine

# Instalacija neophodnih alata za kompajliranje sqlite3 native modula na Alpine-u
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]