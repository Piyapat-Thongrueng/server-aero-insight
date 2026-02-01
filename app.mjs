import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());


app.get("/profiles", (req, res) => {
  return res.status(200).json({
    data: {
      name: "john",
      age: 20,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
