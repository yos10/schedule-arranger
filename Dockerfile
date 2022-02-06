FROM --platform=linux/x86_64 node:14.15.4-slim as base
RUN apt-get update \
    && apt-get install -y --no-install-recommends locales \
    && rm -rf /var/lib/apt/lists/* \
    && locale-gen ja_JP.UTF-8 \
    && localedef -f UTF-8 -i ja_JP ja_JP
ENV LANG ja_JP.UTF-8
ENV TZ Asia/Tokyo
ENV NODE_ENV=production
WORKDIR /app
COPY package.json .
RUN yarn install --ignore-optional && yarn cache clean

FROM base as dev
ENV NODE_ENV=development
RUN yarn install --ignore-optional && yarn cache clean

FROM base as prod
COPY . .
CMD [ "node", "./bin/www" ]
