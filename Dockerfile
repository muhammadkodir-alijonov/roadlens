FROM node:18-alpine

WORKDIR /app

# Barcha fayllarni oldindan ko‘chir
COPY package*.json ./

# ❗ Bcrypt ni konteyner ichida to‘g‘ri build qilish uchun
RUN npm install

# Endi qolgan fayllarni ko‘chir
COPY . .

RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "server/index.js"]
