const fs = require('fs');
const path = require('path');

const Koa = require('koa');
const Router = require('koa-router');
const cors = require('@koa/cors');
const { koaBody } = require('koa-body');

const moment = require('moment');

const app = new Koa();
const router = new Router();

async function logger(ctx, next) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;

  const formatTime = moment().format('YYYY-MM-DD HH:mm:ss');
  console.log(`[${formatTime}] Reauest ${ctx.method} ${ctx.url} - ${ms}ms - Response ${ctx.status}`);
}

app.use(logger);

app.use(cors());
app.use(koaBody());

let css = 0;
router.get('/:path*/test-css', async (ctx) => {
  try {
    ctx.type = 'text/css';

    ctx.set('Cache-Control','max-age=3600');
    ctx.set('Test-Counter', css++);

    ctx.body = `
      body {
        background-color: #000;
      }
    `;
  } catch (error) {
    ctx.status = 500;
    ctx.body = 'Internal Server Error: Unable to generate css file';
  }
})

let js = 0;
router.get('/:path*/test-js', async (ctx) => {
  try {
    ctx.type = 'application/javascript';

    ctx.set('Cache-Control','max-age=3600');
    ctx.set('Test-Counter', js++);

    ctx.body = `
      console.log('Hello World');
    `;
  } catch (error) {
    ctx.status = 500;
    ctx.body = 'Internal Server Error: Unable to generate js file';
  }
})

const commonImage = fs.readFileSync(path.join(__dirname, '../static', 'common.jpg'));

let image1 = 0;
router.get('/:path*/test-image', async (ctx) => {
  try {
    ctx.type = 'image/jpeg';
    // ctx.set('Cache-Control', 'no-cache');
    // ctx.set('Cache-Control', 'no-store');
    ctx.set('Cache-Control', 'max-age=3600');

    // const expires = new Date(Date.now() + 60000);
    // ctx.set('Expires', expires.toUTCString());

    // ctx.set('Last-Modified', 'Fri, 06 Sep 2024 07:09:21 GMT');

    // ctx.set('Cache-Control', 'private, max-age=3600');
    ctx.set('Test-Counter', image1++);

    ctx.body = commonImage;
  } catch (error) {
    ctx.status = 500;
    ctx.body = 'Internal Server Error: Unable to read image file';
  }
})

const largeImage = fs.readFileSync(path.join(__dirname, '../static', 'large.jpg'));

let image2 = 0;
router.get('/:path*/test-large-image', async (ctx) => {
  try {
    ctx.type = 'image/jpeg';

    ctx.set('Cache-Control', 'max-age=3600');
    ctx.set('Test-Counter', image2++);

    ctx.body = largeImage;
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
    // ctx.set('Cache-Control', 'no-store');
    ctx.set('Cache-Control', 'max-age=3600');

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
