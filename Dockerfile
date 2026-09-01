# Northflank 배포용 이미지
FROM node:22-alpine

WORKDIR /app

# 의존성 먼저 복사해서 캐시를 활용한다 (소스만 바뀌면 npm ci를 건너뜀)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# 볼륨을 붙이지 않아도 동작하도록 기본 데이터 폴더를 미리 만들어 둔다
RUN mkdir -p /data && chown -R node:node /data /app
ENV DATA_DIR=/data
ENV NODE_ENV=production

# root로 실행하지 않는다
USER node

CMD ["node", "src/index.js"]
