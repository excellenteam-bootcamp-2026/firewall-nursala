import express, { Application } from 'express';

const app: Application = express();

app.use(express.json());

// Request logging middleware (required by spec: "log each HTTP request")
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// TODO: mount your firewall routes here once ready
// app.use('/api/firewall', firewallRouter);

export default app;