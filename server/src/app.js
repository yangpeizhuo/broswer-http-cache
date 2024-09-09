const fs = require('fs');
const path = require('path');

const Koa = require('koa');
const Router = require('koa-router');
const cors = require('@koa/cors');
const { koaBody } = require('koa-body');

const app = new Koa();
const router = new Router();

async function logger(ctx, next) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`Reauest ${ctx.method} ${ctx.url} - ${ms}ms - Response ${ctx.status}`);
}

app.use(logger);

app.use(cors());
app.use(koaBody());

const testImage = fs.readFileSync(path.join(__dirname, '../static', 'test.jpg'));

let i = 0;
router.get('/:path*/test-image', async (ctx) => {
  try {
    ctx.type = 'image/jpeg';
    // ctx.set('Cache-Control', 'no-cache');
    ctx.set('Cache-Control', 'private, max-age=3600');
    ctx.set('Tomtom', i++);

    // const expires = new Date(Date.now() + 60000);
    // ctx.set('Expires', expires.toUTCString());

    // ctx.set('Last-Modified', 'Fri, 06 Sep 2024 07:09:21 GMT');

    ctx.body = testImage;
  } catch (error) {
    ctx.status = 500;
    ctx.body = 'Internal Server Error: Unable to read image file';
  }
})

router.all('/:path*/test-request', async (ctx) => {
  try {
    const responseContent = {
      url: ctx.request.URL.href,
      method: ctx.request.method,
      headers: ctx.request.headers,
      body: ctx.request.body
    };

    ctx.type = 'json';
    ctx.set('Cache-Control', 'no-store');

    ctx.body = responseContent;
  } catch (error) {
    ctx.status = 500;
    ctx.body = 'Internal Server Error: Unable to parse request';
  }
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = 80;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
