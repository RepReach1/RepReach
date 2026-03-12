import express from "express";
import searchHandler    from "./api/search.js";
import enrichHandler    from "./api/enrich.js";
import generateHandler  from "./api/generate.js";
import departmentHandler from "./api/department.js";

const app = express();
app.use(express.json());

app.post("/api/search",     searchHandler);
app.post("/api/enrich",     enrichHandler);
app.post("/api/generate",   generateHandler);
app.post("/api/department", departmentHandler);

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
