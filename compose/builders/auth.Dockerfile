FROM node:14.5.0
ENV PORT=9000
ENV NODE_ENV=production
EXPOSE $PORT
COPY --from=greenpress/monorepo /apps/auth .
CMD npm start
