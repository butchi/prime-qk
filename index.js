const Koa = require("koa")
const Router = require("koa2-router")
const fs = require("fs").promises
const app = new Koa()
const router = new Router();

app.use(router)

router.get("/", async ctx => {
    console.log(ctx.method, ctx.url)
    ctx.body = await fs.readFile("index.html", "utf8")
})

router.get("/script.js", async ctx => {
    console.log(ctx.method, ctx.url)
    ctx.body = await fs.readFile("script.js", "utf8")
})

router.get("/favicon.ico", async ctx => {
    console.log(ctx.method, ctx.url)
    ctx.body = await fs.readFile("favicon.ico", "utf8")
})

router.get("/api/exec", async ctx => {
    console.log(ctx.method, ctx.url)
})

app.listen(3000)