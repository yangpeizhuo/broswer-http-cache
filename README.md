# 浏览器的 HTTP 缓存体系



## 前言

说起浏览器的 HTTP 缓存，总会提到强缓存、协商缓存、新鲜度、Cache-Control、Expires、If-Modified-Since、If-None-Match、Last-Modified、ETags 等词语，它们对我来说既熟悉又陌生，总是记了又忘，忘了再记。归根到底是自己没有形成一个体系化的认知。

前不久看到了一篇文章[《彻底弄懂浏览器缓存策略-基于缓存策略三要素分解法》](https://mp.weixin.qq.com/s/qOMO0LIdA47j3RjhbCWUEQ)，虽然时间久远，但是文中提出的缓存三大策略，即存储策略、过期策略、对比策略，让我有了一个系统学习缓存知识的路径，我也将基于这个思路，记录我的学习内容。

在学习缓存相关的知识前，要先明确一件事，浏览器为什么要缓存 HTTP 响应？无非是以下三件事：

- 减少网络流量，节省带宽；
- 减少回源请求次数，减轻服务器负载；
- 提高页面加载速度，优化用户体验；

## 浏览器的 HTTP 缓存体系

浏览器的 HTTP 缓存体系分为以下三个部分：

- 缓存存储策略：响应是否可以被缓存、在哪些地方被缓存、缓存多久；
- 缓存过期策略：已存在的缓存是否可用、是否过期；
- 缓存对比策略：服务端如何对比客户端缓存与源站资源；

### 缓存存储策略

如上文所说，缓存存储策略是为了解决响应是否可以被缓存的问题。这一般取决于服务端的设置，或遵循浏览器的默认行为。

缓存存储策略受响应的 `Cache-Control` 头或 `Expires` 头的控制。``Cache-Control` 的取值 `max-age`、`no-cache`、`no-store` 都是用来指明响应内容是否可以被浏览器缓存的，其中前 2 种取值都会缓存文件数据（`no-cache` 应理解为“不建议使用本地缓存”，其仍然会缓存数据到本地），`no-store` 则不会在浏览器缓存任何响应数据。



> `Cache-Control` 的取值有很多，且要区别 request Cache-Control 与 response Cache-Control。仅对于 response Cache-Control 来说，有如下几类取值：
>
>   1. 基本缓存控制指令
>   - **no-store**：绝对禁止缓存数据。
>   - **no-cache**：资源可以被缓存，但在使用之前必须重新验证其有效性。
>   - **public**：指示响应可以被任何缓存区缓存。
>   - **private**：响应只能被单个用户的浏览器缓存，不适用于共享缓存（如代理服务器）。
>
>   2. 过期控制指令
>   - **max-age=[seconds]**：指定一个时间长度，在这段时间内，缓存被认为是新鲜的。
>   - **s-maxage=[seconds]**：类似于 `max-age`，但仅适用于共享缓存。
>   - **must-revalidate**：一旦缓存过期（即超过 `max-age`），必须去服务器验证是否有更新。
>   - **proxy-revalidate**：与 `must-revalidate` 类似，但仅适用于共享缓存。
>
>   3. 其他指令
>   - **immutable**：表明响应正文不会随时间改变，直到过期。
>   - **stale-while-revalidate=[seconds]**：在后台异步检查缓存时，客户端使用过期缓存的时间。
>   - **stale-if-error=[seconds]**：如果重新验证缓存时服务器出错，客户端使用过期缓存的时间。
>
> 
>
> 由于本文主要关注浏览器的缓存机制，因此需详细了解 `no-cache`、`no-store`、`max-age` 以及 `public`、`private` 这几种取值。



#### 实际验证

我在本地搭建了一个简单的场景进行验证:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Client 2</title>
</head>
<body>
  <img src="http://localhost/test-image" width="200" height="200" alt="test-image">
  <script>
    (async function() {
      const response = await fetch('http://localhost/test-request');
      const data = await response.json();
      
      console.log(data);
    })();
  </script>
</body>
</html>

```



分别使用 `<img>` 标签和 `fetch` API 去获取远程资源。对于图片资源，我需要浏览器缓存一段时间，对于 json 数据，我需要浏览器不缓存，因此我在 Server 端对响应设置了不同的 `Cache-Control`:

```js
router.get('/:path*/test-image', async (ctx) => {
    ...
    
    ctx.type = 'image/jpeg';
    ctx.set('Cache-Control', 'max-age=3600');

    ...
})

router.all('/:path*/test-request', async (ctx) => {
    ...

    ctx.type = 'json';
    ctx.set('Cache-Control', 'no-store');

    ...
});
```



再次请求页面时，发现浏览器确实缓存了图片资源，未缓存 json 数据:

![image-20240906130445842](./README.assets/image-20240906130445842.png)



> 直接在浏览器的地址栏中输入 URL 去请求资源时，浏览器通常不会遵循常规缓存策略。因为这种请求行为往往更倾向于获取到最新的资源，避免因为使用了过时的缓存而导致问题或误解。
>
> 这与通过页面内元素（如 `<img>` 标签）或脚本（如 `fetch` API）发起的请求略有不同，后者更依赖并遵循 HTTP 缓存头的指示进行资源的缓存和重用。
>
> ![image-20240906130411373](./README.assets/image-20240906130411373.png)



这就是一个利用缓存存储策略的最小化场景，即验证以下两种情况：

**请求资源时，响应携带 Cache-Control: no-store**

- 服务器在响应中设置了 `Cache-Control: no-store` 指令时，这意味着浏览器（以及任何中间缓存，如代理服务器）被要求不存储任何关于客户端请求和服务器响应的任何部分；

**请求资源时，响应携带 Cache-Control: max-age=3600**

- 服务器在响应中设置了 `Cache-Control: max-age=3600` 指令时，这意味着浏览器（以及任何中间缓存，如代理服务器）被指示可以将该响应存储在缓存中，并且可以在接下来的 3600 秒（即 1 小时）内重用该缓存，而无需再次向服务器请求；



但是在实际情况下，场景会复杂一些，而且我们上面也提到了，缓存存储策略不仅受 `Cache-Control` 头控制，还有 `Expires` 头也需要考虑，我们接下来再多验证几种情况：

**请求资源时，服务端的响应没有携带 Cache-Control，携带了 Expires**

- 服务器在响应中仅设置了 `Expires` 头时，浏览器的行为将依赖于 `Expires` 头来决定缓存策略。`Expires` 头提供了一个具体的日期/时间，告诉浏览器该资源在这个时间点之前都被认为是新鲜的，可以从缓存中直接获取而无需向服务器再次请求；

![image-20240906145140764](./README.assets/image-20240906145140764.png)

![image-20240906145221343](./README.assets/image-20240906145221343.png)



**请求资源时，服务端的响应同时携带了 Cache-Control 和 Expires**

- 如果响应中同时存在 `Cache-Control` 和 `Expires`，浏览器会优先考虑 `Cache-Control` 的指令。例如，如果 `Cache-Control` 设置为 `max-age=3600`（资源应在 3600 秒后被视为过期），这将覆盖 `Expires` 头中的任何日期/时间设置。

![image-20240906150254461](./README.assets/image-20240906150254461.png)

![image-20240906150320989](./README.assets/image-20240906150320989.png)



**请求资源时，服务端的响应没有携带 Cache-Control 和 Expires**

- 在没有明确缓存指令的情况下，大多数现代浏览器会尝试使用启发式方法来决定资源的缓存时间。这通常基于资源的最后修改时间（如果有的话）：
  1. 如果响应头中包含 `Last-Modified` 日期，浏览器可能会使用这个日期与响应被接收的时间之间的差值的一部分（如10%）来估算一个缓存时间。这意味着如果资源经常被更新，它可能会被较短时间地缓存；如果很少更新，可能会被较长时间地缓存；
  2. 如果没有 `Last-Modified` 或其他明确的缓存信息，浏览器可能默认设置资源不被缓存。这种行为可以防止浏览器缓存可能已经变更的资源；
  3. Content-Type 可能影响缓存决策。静态资源（如图片、CSS）更可能被缓存。动态内容可能不会被缓存或只短暂缓存；

![image-20240906150817267](./README.assets/image-20240906150817267.png)

![image-20240906150830431](./README.assets/image-20240906150830431.png)

![image-20240906151221507](./README.assets/image-20240906151221507.png)

![image-20240906151244280](./README.assets/image-20240906151244280.png)

上面的几种情况中，没有包含 `Cache-Control: no-cache`、`Cache-Control: max-age=0` 的情况，因为这类情况下，需要结合缓存存储策略与缓存验证策略，我们后面再进行介绍。

除此之外，还有几种情况，我们可以验证一下



**请求资源时，服务端的响应携带了 Cache-Control: private，或  Cache-Control: public**

- 浏览器通常会缓存这个响应，因为 private 指令允许浏览器进行私有缓存；
- 由于没有明确的 max-age，浏览器会使用启发式缓存（heuristic caching）。启发式缓存：浏览器会根据其他响应头来估算一个合理的缓存时间。通常基于 Last-Modified 头（如果存在）。常见算法：如果有 Last-Modified，缓存时间可能是 (当前时间 - Last-Modified) 10%。例如，如果资源在5天前修改，可能会缓存约12小时；
- 不同浏览器可能有不同的启发式算法。一些浏览器可能默认缓存较短时间，如几小时或一天。
- 这种情况下的缓存行为不太可预测，且不同浏览器有不同表现。因此，建议总是明确指定 max-age 以控制缓存时间。如果响应中包含 Expires 头，浏览器可能会使用它来确定缓存时间。但 Cache-Control 通常优先于 Expires。
- 这种情况下，虽然缓存了响应，浏览器可能会频繁验证资源是否更新；



**请求资源时，响应携带 Cache-Control: no-cache, 或 Cache-Control: max-age=0**

- 响应头中包含 `Cache-Control: no-cache` 时，意味着浏览器可以缓存这个资源。但是使用缓存资源时，浏览器必须向服务器验证这个缓存的资源是否仍然是最新的；
- 响应头中包含 `Cache-Control: max-age=0` 时，意味着浏览器可以缓存这个资源，但是缓存的最大有效时间为 0 秒，立即过期。使用缓存资源时，浏览器必须向服务器验证这个缓存的资源是否仍然是最新的；

- 

- 