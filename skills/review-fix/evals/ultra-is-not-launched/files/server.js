import http from "node:http";

const port = Number(process.env.PORT) || 0; // 0 = any free port, so parallel runs never collide

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end("<!doctype html><title>Calc</title><h1>Calc</h1>");
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(port, () => console.log(`Local: http://localhost:${server.address().port}/`));
