import express from "express";

const app = express();

const PORT = process.env.PORT ?? 8080;

app.get("/", (req, res) => {
  return res.json({ msg: "Hello from the server V2" });
});

const server = app.listen(PORT, () => {
  console.log(`Server is up and running on PORT => ${PORT}`);
});

const shutdown = () => {
  console.log("Shutting down...");
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
